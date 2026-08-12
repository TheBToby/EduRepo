import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AccountStatus, AuthProvider, UiLanguage, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  // --- Registrierung (FA-AUTH-006): Status PENDING, manuelle Freigabe ---
  async register(email: string, password: string, displayName: string, uiLanguage: UiLanguage = UiLanguage.DE) {
    const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new BadRequestException('Diese E-Mail-Adresse ist bereits registriert.');
    }
    if (password.length < 8) {
      throw new BadRequestException('Das Passwort muss mindestens 8 Zeichen lang sein.');
    }
    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        displayName,
        passwordHash,
        role: UserRole.USER,
        status: AccountStatus.PENDING, // Freigabeprozess (D-7)
        uiLanguage,
        provider: AuthProvider.EMAIL,
      },
    });
    // Hinweis: Keine automatische E-Mail an den Nutzer vor der Freigabe (DSG-konform).
    return { id: user.id, status: user.status };
  }

  // --- Login (FA-AUTH-002) ---
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Ungültige Anmeldedaten.');
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(
        user.status === AccountStatus.PENDING
          ? 'Dein Konto wartet noch auf Freigabe.'
          : 'Dein Konto ist nicht aktiv.',
      );
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Ungültige Anmeldedaten.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueToken(user.id, user.email, user.role);
  }

  // --- OAuth-Login (FA-AUTH-003/004) ---
  async oauthLogin(provider: AuthProvider, providerId: string, email: string, displayName: string) {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { AND: [{ provider }, { providerId }] }] },
    });

    if (!user) {
      // OAuth-Registrierung => ebenfalls PENDING (Lehrpersonen-Check D-7)
      user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          displayName,
          provider,
          providerId,
          role: UserRole.USER,
          status: AccountStatus.PENDING,
          uiLanguage: UiLanguage.DE,
        },
      });
      return { status: 'pending', userId: user.id };
    }

    // Ggf. Provider verknüpfen (FA-AUTH-012)
    if (!user.providerId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { provider, providerId },
      });
    }

    if (user.status !== AccountStatus.ACTIVE) {
      return { status: user.status.toLowerCase(), userId: user.id };
    }
    const token = this.issueToken(user.id, user.email, user.role);
    return { status: 'active', ...token };
  }

  private issueToken(userId: string, email: string, role: UserRole) {
    const token = this.jwt.sign({ sub: userId, email, role });
    return { accessToken: token };
  }

  // --- Passwort vergessen (FA-AUTH-005) ---
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Aus Sicherheitsgründen immer 200 zurückgeben (keine User-Enumeration)
    if (!user) return;
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
    await this.prisma.token.create({
      data: { userId: user.id, tokenHash, type: 'password_reset', expiresAt },
    });
    const publicBase = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${publicBase}/${user.uiLanguage.toLowerCase()}/reset-password?token=${raw}`;
    await this.mail.sendPasswordReset(user.email, user.displayName, resetUrl, user.uiLanguage.toLowerCase());
  }

  async resetPassword(token: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException('Das Passwort muss mindestens 8 Zeichen lang sein.');
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.token.findUnique({ where: { tokenHash } });
    if (!record || record.type !== 'password_reset' || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Der Link ist ungültig oder abgelaufen.');
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.token.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
  }

  // --- Soft-Delete / Reaktivierung / Eigentumsübertragung (FA-AUTH-007/008) ---
  async softDelete(userId: string, transferToUserId?: string) {
    const permanentDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Tage
    await this.prisma.$transaction(async (tx) => {
      if (transferToUserId) {
        const target = await tx.user.findUnique({ where: { id: transferToUserId } });
        if (!target) throw new NotFoundException('Ziel-Nutzer für Eigentumsübertragung nicht gefunden.');
        await tx.repository.updateMany({ where: { ownerId: userId }, data: { ownerId: transferToUserId } });
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.SOFT_DELETED,
          deletedAt: new Date(),
          permanentDeleteAt,
          passwordHash: null,
        },
      });
    });
    return { permanentDeleteAt };
  }

  async reactivate(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.status !== AccountStatus.SOFT_DELETED) {
      throw new BadRequestException('Konto nicht reaktivierbar.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: AccountStatus.ACTIVE, deletedAt: null, permanentDeleteAt: null },
    });
    return { reactivated: true };
  }

  // Hintergrund-Job-Hook: endgültige Löschung nach 30 Tagen
  async purgeExpiredUsers() {
    const users = await this.prisma.user.findMany({
      where: { permanentDeleteAt: { lte: new Date() } },
    });
    for (const u of users) {
      await this.prisma.user.delete({ where: { id: u.id } });
      this.logger.log(`Nutzer endgültig gelöscht: ${u.email}`);
    }
    return { purged: users.length };
  }
}