import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RatingsService {
  constructor(
    private prisma: PrismaService,
    private repos: RepositoriesService,
  ) {}

  // Nur bewerten, wer heruntergeladen hat (FA-RATE-005)
  async createOrUpdate(repoId: string, userId: string, data: {
    overall: number; didactics?: number; methodology?: number; correctness?: number;
    usability?: number; clarity?: number; prepTime?: number; engagement?: number;
    comment?: string;
  }) {
    await this.assertCanRate(repoId, userId);
    return this.prisma.rating.upsert({
      where: { repositoryId_userId: { repositoryId: repoId, userId } },
      create: { repositoryId: repoId, userId, ...data, edited: false },
      update: { ...data, edited: true },
    });
  }

  async list(repoId: string) {
    return this.prisma.rating.findMany({
      where: { repositoryId: repoId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async average(repoId: string) {
    const rows = await this.prisma.rating.aggregate({
      where: { repositoryId: repoId },
      _avg: {
        overall: true, didactics: true, methodology: true, correctness: true,
        usability: true, clarity: true, prepTime: true, engagement: true,
      },
      _count: { _all: true },
    });
    return rows;
  }

  // Kommentare (FA-RATE-001/002)
  async addComment(repoId: string, userId: string, text: string, parentId?: string) {
    return this.prisma.comment.create({
      data: { repositoryId: repoId, userId, text, parentId },
    });
  }

  async listComments(repoId: string) {
    return this.prisma.comment.findMany({
      where: { repositoryId: repoId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Kommentar entfernen (Eigentümer oder Mod/Admin – FA-RATE-004)
  async removeComment(commentId: string, userId: string, isStaff: boolean) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId }, include: { repository: true },
    });
    if (!comment) throw new NotFoundException('Kommentar nicht gefunden.');
    const isOwner = comment.repository.ownerId === userId;
    const isAuthor = comment.userId === userId;
    if (!isOwner && !isStaff && !isAuthor) {
      throw new ForbiddenException('Keine Berechtigung, diesen Kommentar zu löschen.');
    }
    await this.prisma.comment.update({ where: { id: commentId }, data: { removed: true } });
    return { ok: true };
  }

  private async assertCanRate(repoId: string, userId: string) {
    const allowed = await this.repos.canDownload(repoId, userId);
    if (!allowed) {
      throw new ForbiddenException('Du kannst nur Lehrmittel bewerten, die du heruntergeladen hast.');
    }
  }
}