import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus, ReportTargetType } from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  // Meldung erstellen (FA-RATE-003)
  async create(reporterId: string, targetType: ReportTargetType, targetId: string, reason: string) {
    return this.prisma.report.create({
      data: { reporterId, targetType, targetId, reason, status: ReportStatus.OPEN },
    });
  }

  // Queue für Mods/Admins (FA-MOD-001)
  async list(status?: ReportStatus) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: { reporter: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Meldung bearbeiten (FA-MOD-002/003)
  async resolve(reportId: string, handlerId: string, status: typeof ReportStatus.RESOLVED_REMOVED | typeof ReportStatus.RESOLVED_DISMISSED) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Meldung nicht gefunden.');

    if (status === ReportStatus.RESOLVED_REMOVED) {
      // Zielinhalt entfernen
      if (report.targetType === ReportTargetType.RATING) {
        await this.prisma.rating.delete({ where: { id: report.targetId } });
      } else if (report.targetType === ReportTargetType.COMMENT) {
        await this.prisma.comment.update({ where: { id: report.targetId }, data: { removed: true } });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: handlerId,
        action: `moderation.resolve:${status}`,
        targetType: report.targetType,
        targetId: report.targetId,
        details: { reportId, reason: report.reason },
      },
    });

    return this.prisma.report.update({
      where: { id: reportId },
      data: { status, handledById: handlerId, handledAt: new Date() },
    });
  }
}