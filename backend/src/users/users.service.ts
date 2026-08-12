import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AccountStatus, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
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