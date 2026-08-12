import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole, Prisma, RepositoryAccess } from '@prisma/client';

@Injectable()
export class RepositoriesService {
  constructor(private prisma: PrismaService) {}

  // --- Erstellen (FA-REPO-001/002) ---
  async create(ownerId: string, data: {
    title: Record<string, string>;
    description: Record<string, string>;
    access?: RepositoryAccess;
    subjectId?: number;
    schoolLevel?: string;
    contentLanguage?: string;
    license?: string;
    materialType?: string;
    educationSector?: string;
    curriculum21?: string;
    learningGoals?: string;
    targetGroup?: string;
    timeRequired?: string;
    difficulty?: string;
    methodology?: string;
    prerequisites?: string;
    tagIds?: number[];
  }) {
    return this.prisma.repository.create({
      data: {
        ownerId,
        title: data.title as any,
        description: data.description as any,
        access: data.access ?? RepositoryAccess.APPROVAL_REQUIRED,
        subjectId: data.subjectId,
        schoolLevel: data.schoolLevel as any,
        contentLanguage: (data.contentLanguage as any) ?? 'DE',
        license: data.license,
        materialType: data.materialType,
        educationSector: data.educationSector as any,
        curriculum21: data.curriculum21,
        learningGoals: data.learningGoals,
        targetGroup: data.targetGroup,
        timeRequired: data.timeRequired,
        difficulty: data.difficulty,
        methodology: data.methodology,
        prerequisites: data.prerequisites,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
        members: { create: { userId: ownerId, role: MemberRole.OWNER } },
        versions: { create: { version: 1, createdBy: ownerId, changeNote: 'Initial version' } },
      },
      include: { members: true, versions: true, tags: { include: { tag: true } } },
    });
  }

  // --- Suche (FA-SEARCH) ---
  async search(params: {
    q?: string;
    subjectId?: number;
    schoolLevel?: string;
    contentLanguage?: string;
    license?: string;
    sort?: 'recent' | 'rating' | 'popular';
    skip?: number;
    take?: number;
  }) {
    const { q, subjectId, schoolLevel, contentLanguage, license, sort = 'recent', skip = 0, take = 24 } = params;
    const where: Prisma.RepositoryWhereInput = {};
    if (subjectId) where.subjectId = subjectId;
    if (schoolLevel) where.schoolLevel = schoolLevel as any;
    if (contentLanguage) where.contentLanguage = contentLanguage as any;
    if (license) where.license = license;
    // Einfache Volltextsuche über JSON-Titel (DE primär) – wird später durch
    // Meilisearch/Typesense ersetzt (NFA-PERF).
    if (q) {
      where.OR = [
        { title: { path: ['de'], string_contains: q } },
        { description: { path: ['de'], string_contains: q } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }
    const orderBy: Prisma.RepositoryOrderByWithRelationInput =
      sort === 'rating'
        ? { ratings: { _count: 'desc' } }
        : sort === 'popular'
          ? { versions: { _count: 'desc' } }
          : { updatedAt: 'desc' };
    const [items, total] = await Promise.all([
      this.prisma.repository.findMany({ where, orderBy, skip, take, include: this.defaultInclude() }),
      this.prisma.repository.count({ where }),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!repo) throw new NotFoundException('Lehrmittel nicht gefunden.');
    return repo;
  }

  async update(id: string, userId: string, data: any) {
    await this.assertCanManage(id, userId);
    return this.prisma.repository.update({ where: { id }, data, include: this.defaultInclude() });
  }

  // --- Sharing (FA-REPO-007) ---
  async addMember(repoId: string, ownerId: string, targetUserId: string, role: MemberRole) {
    await this.assertOwner(repoId, ownerId);
    return this.prisma.repositoryMember.create({
      data: { repositoryId: repoId, userId: targetUserId, role },
    });
  }

  async removeMember(repoId: string, ownerId: string, targetUserId: string) {
    await this.assertOwner(repoId, ownerId);
    return this.prisma.repositoryMember.delete({
      where: { repositoryId_userId: { repositoryId: repoId, userId: targetUserId } },
    });
  }

  // --- Freigabe für Download bei APPROVAL_REQUIRED (FA-REPO-006) ---
  async grantAccess(repoId: string, ownerId: string, targetUserId: string) {
    await this.assertOwner(repoId, ownerId);
    return this.prisma.repositoryMember.upsert({
      where: { repositoryId_userId: { repositoryId: repoId, userId: targetUserId } },
      create: { repositoryId: repoId, userId: targetUserId, role: MemberRole.COLLABORATOR, approved: true },
      update: { approved: true },
    });
  }

  // --- Fork (FA-REPO-008) ---
  async fork(sourceId: string, newOwnerId: string) {
    const source = await this.getById(sourceId);
    return this.prisma.repository.create({
      data: {
        ownerId: newOwnerId,
        title: source.title,
        description: source.description,
        access: RepositoryAccess.APPROVAL_REQUIRED,
        subjectId: source.subjectId,
        schoolLevel: source.schoolLevel,
        contentLanguage: source.contentLanguage,
        license: source.license,
        materialType: source.materialType,
        educationSector: source.educationSector,
        curriculum21: source.curriculum21,
        isFork: true,
        forkedFromId: sourceId,
        members: { create: { userId: newOwnerId, role: MemberRole.OWNER } },
        versions: { create: { version: 1, createdBy: newOwnerId, changeNote: `Forked from ${sourceId}` } },
      },
    });
  }

  // --- Versionierung (FA-REPO-003/004) ---
  async createVersion(repoId: string, userId: string, changeNote?: string) {
    await this.assertCanManage(repoId, userId);
    const latest = await this.prisma.repositoryVersion.findFirst({
      where: { repositoryId: repoId },
      orderBy: { version: 'desc' },
    });
    const next = (latest?.version ?? 0) + 1;
    return this.prisma.repositoryVersion.create({
      data: { repositoryId: repoId, version: next, createdBy: userId, changeNote },
    });
  }

  async listVersions(repoId: string) {
    return this.prisma.repositoryVersion.findMany({
      where: { repositoryId: repoId },
      orderBy: { version: 'desc' },
      include: { files: true },
    });
  }

  // --- Zugriff prüfen für Download (FA-FILE-005) ---
  async canDownload(repoId: string, userId: string): Promise<boolean> {
    const repo = await this.getById(repoId);
    if (repo.access === RepositoryAccess.PUBLIC_DOWNLOAD) return true;
    const member = await this.prisma.repositoryMember.findUnique({
      where: { repositoryId_userId: { repositoryId: repoId, userId } },
    });
    return !!member && (member.role === MemberRole.OWNER || member.approved);
  }

  // --- Helfer: Berechtigungen ---
  private async assertOwner(repoId: string, userId: string) {
    const member = await this.prisma.repositoryMember.findUnique({
      where: { repositoryId_userId: { repositoryId: repoId, userId } },
    });
    if (!member || member.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Nur Eigentümer dürfen diese Aktion ausführen.');
    }
  }

  private async assertCanManage(repoId: string, userId: string) {
    const member = await this.prisma.repositoryMember.findUnique({
      where: { repositoryId_userId: { repositoryId: repoId, userId } },
    });
    if (!member) throw new ForbiddenException('Keine Berechtigung für dieses Lehrmittel.');
  }

  private defaultInclude() {
    return {
      owner: { select: { id: true, displayName: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, displayName: true } } } },
      versions: { orderBy: { version: 'desc' as const }, take: 5, include: { files: true } },
      tags: { include: { tag: true } },
      subject: true,
    };
  }
}