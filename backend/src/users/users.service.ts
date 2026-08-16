import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { AccountStatus, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private storage: StorageService,
  ) {}

  // --- Profil (FA-PROF) ---
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Nutzer nicht gefunden.');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    uiLanguage?: 'DE' | 'FR' | 'IT' | 'EN';
    themePreference?: 'LIGHT' | 'DARK' | 'SYSTEM';
    schoolLevels?: any[];
    subjects?: string[];
    educationSector?: 'GENERAL' | 'VOCATIONAL';
  }) {
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return this.sanitize(user);
  }

  // --- Admin: Nutzer direkt anlegen (aktiv, ohne Registrierungsanfrage) ---
  async createByAdmin(actorId: string, data: {
    email: string;
    password?: string;
    displayName: string;
    role?: UserRole;
    uiLanguage?: 'DE' | 'FR' | 'IT' | 'EN';
  }) {
    const email = data.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Diese E-Mail-Adresse ist bereits registriert.');
    if (data.password !== undefined && data.password.length < 8) {
      throw new BadRequestException('Das Passwort muss mindestens 8 Zeichen lang sein.');
    }
    const passwordHash = data.password ? await argon2.hash(data.password) : null;
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: data.displayName,
        passwordHash,
        role: data.role ?? UserRole.USER,
        status: AccountStatus.ACTIVE, // Admin-Anlage = sofort aktiv
        emailVerified: true,
        uiLanguage: data.uiLanguage ?? 'DE',
      },
    });
    await this.audit(actorId, 'user.create', user.id, { role: user.role });
    return this.sanitize(user);
  }

  // --- Passwort ändern (angemeldeter Nutzer) ---
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Nutzer nicht gefunden.');
    if (newPassword.length < 8) {
      throw new BadRequestException('Das Passwort muss mindestens 8 Zeichen lang sein.');
    }
    if (user.passwordHash) {
      const valid = await argon2.verify(user.passwordHash, currentPassword);
      if (!valid) throw new BadRequestException('Aktuelles Passwort ist falsch.');
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.audit(userId, 'user.change_password', userId);
    return { ok: true };
  }

  // --- Profilbild (Avatar) hochladen/löschen ---
  // Wir speichern den Storage-Key im Format "avatar:<key>" in avatarUrl.
  // Die Auslieferung erfolgt ueber GET /users/me/avatar (siehe Controller),
  // damit keine ablaufenden presigned-URLs in der DB landen.
  async uploadAvatar(userId: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException(`Bildtyp nicht erlaubt: ${file.mimetype}`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Das Profilbild darf maximal 5 MB gross sein.');
    }
    // Alten Avatar entfernen
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.avatarUrl?.includes('/avatars/')) {
      const oldKey = user.avatarUrl.split('/avatars/')[1]?.split('?')[0];
      if (oldKey) await this.storage.deleteObject(`avatars/${oldKey}`).catch(() => undefined);
    }
    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `avatars/${userId}-${crypto.randomUUID()}.${ext || 'png'}`;
    await this.storage.putObject(key, file.buffer, file.size, file.mimetype);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: `avatar:${key}` },
    });
    return this.sanitize(updated);
  }

  /** Avatar-Bild als Buffer liefern (fuer GET /users/me/avatar). */
  async getAvatar(userId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.avatarUrl || !user.avatarUrl.startsWith('avatar:')) return null;
    const key = user.avatarUrl.slice('avatar:'.length);
    const buffer = await this.storage.getObjectBuffer(key);
    const ext = key.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      webp: 'image/webp', gif: 'image/gif',
    };
    return { buffer, mimeType: mimeMap[ext] || 'application/octet-stream' };
  }

  // --- Freigabeprozess (FA-AUTH-006, FA-ROLE-006) ---
  async listPending() {
    const users = await this.prisma.user.findMany({ where: { status: AccountStatus.PENDING } });
    return users.map((u) => this.sanitize(u));
  }

  async approveRegistration(userId: string, approverId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== AccountStatus.PENDING) {
      throw new BadRequestException('Nutzer ist nicht im Status PENDING.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: AccountStatus.ACTIVE, emailVerified: true },
    });
    await this.audit(approverId, 'user.approve', userId);
    await this.mail.sendRegistrationDecision(user.email, user.displayName, true, undefined, user.uiLanguage.toLowerCase());
    return this.sanitize(updated);
  }

  async rejectRegistration(userId: string, approverId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== AccountStatus.PENDING) {
      throw new BadRequestException('Nutzer ist nicht im Status PENDING.');
    }
    await this.mail.sendRegistrationDecision(user.email, user.displayName, false, reason, user.uiLanguage.toLowerCase());
    await this.prisma.user.delete({ where: { id: userId } });
    await this.audit(approverId, 'user.reject', userId, { reason });
    return { ok: true };
  }

  // --- Sperren / Deaktivieren (FA-ROLE-002/003/004) ---
  async setStatus(userId: string, status: AccountStatus, actorId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Nutzer nicht gefunden.');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Administratoren können nicht geändert werden.');
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.audit(actorId, `user.set_status:${status}`, userId, { reason });
    return this.sanitize(updated);
  }

  // --- Rolle ändern (nur Admin – FA-ROLE-005) ---
  async setRole(userId: string, role: UserRole, actorId: string) {
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit(actorId, 'user.set_role', userId, { role });
    return this.sanitize(updated);
  }

  // --- Quota (FA-FILE-007) ---
  async setStorageQuota(userId: string, quotaBytes: bigint, actorId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { storageQuotaBytes: quotaBytes },
    });
    await this.audit(actorId, 'user.set_quota', userId, { quotaBytes: quotaBytes.toString() });
    return this.sanitize(updated);
  }

  async getStorageUsage(userId: string) {
    const result = await this.prisma.fileAsset.aggregate({
      _sum: { sizeBytes: true },
      where: { version: { repository: { ownerId: userId } } },
    });
    const quota = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { storageQuotaBytes: true } });
    return {
      usedBytes: result._sum.sizeBytes || BigInt(0),
      quotaBytes: quota.storageQuotaBytes,
    };
  }

  // --- Liste alle Nutzer (Admin/Moderator) ---
  async listAll() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((u) => this.sanitize(u));
  }

  // --- Helfer ---
  private sanitize(u: any) {
    const { passwordHash, tokens, ...rest } = u;
    return rest;
  }

  private async audit(actorId: string, action: string, targetId: string, details?: any) {
    await this.prisma.auditLog.create({
      data: { actorId, action, targetType: 'User', targetId, details: details ?? undefined },
    });
  }
}