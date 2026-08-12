import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private readonly from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'EduRepo <noreply@edurepo.local>';
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    } else {
      this.logger.warn('Kein SMTP_HOST konfiguriert – E-Mails werden nur geloggt (Dev-Modus).');
    }
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[DEV-MAIL] To: ${to} | Subject: ${subject}\n${text || html}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ''),
    });
  }

  /** Mehrsprachige Reset-Mail – Vereinfachte Variante; Frontend liefert Deep-Links. */
  async sendPasswordReset(to: string, displayName: string, resetUrl: string, lang = 'de') {
    const subjects: Record<string, string> = {
      de: 'Passwort zurücksetzen – EduRepo',
      fr: 'Réinitialisation du mot de passe – EduRepo',
      it: 'Reimpostazione della password – EduRepo',
      en: 'Password reset – EduRepo',
    };
    const bodies: Record<string, string> = {
      de: `<p>Hallo ${displayName},</p><p>du kannst dein Passwort über den folgenden Link zurücksetzen:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Der Link ist 1 Stunde gültig. Falls du dies nicht angefordert hast, ignoriere diese E-Mail.</p>`,
      fr: `<p>Bonjour ${displayName},</p><p>vous pouvez réinitialiser votre mot de passe via le lien suivant :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      it: `<p>Ciao ${displayName},</p><p>puoi reimpostare la password tramite il seguente link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      en: `<p>Hi ${displayName},</p><p>you can reset your password using the following link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    };
    await this.send(to, subjects[lang] || subjects.de, bodies[lang] || bodies.de);
  }

  async sendRegistrationDecision(
    to: string,
    displayName: string,
    approved: boolean,
    reason: string | undefined,
    lang = 'de',
  ) {
    const subjects = {
      de: approved ? 'Dein EduRepo-Konto wurde freigegeben' : 'Dein EduRepo-Konto wurde abgelehnt',
      en: approved ? 'Your EduRepo account has been approved' : 'Your EduRepo account was rejected',
    };
    const bodies = {
      de: approved
        ? `<p>Hallo ${displayName},</p><p>dein Konto wurde freigegeben. Du kannst dich nun anmelden.</p>`
        : `<p>Hallo ${displayName},</p><p>deine Registrierung wurde leider abgelehnt.${reason ? ` Begründung: ${reason}` : ''}</p>`,
      en: approved
        ? `<p>Hi ${displayName},</p><p>your account has been approved. You can now log in.</p>`
        : `<p>Hi ${displayName},</p><p>your registration was rejected.${reason ? ` Reason: ${reason}` : ''}</p>`,
    };
    await this.send(to, (subjects as any)[lang] || subjects.de, (bodies as any)[lang] || bodies.de);
  }
}