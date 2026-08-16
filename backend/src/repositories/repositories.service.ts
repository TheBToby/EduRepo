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
    parentId?: string; // Sub-Repository unter einem Master-Repository
  }) {
    // Eltern validieren (Hierarchie): muss existieren, kein Zyklus (Tiefe 1 Level)
    if (data.parentId) {
      const parent = await this.prisma.repository.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundException('Übergeordnetes Lehrmittel nicht gefunden.');
      if (parent.parentId) {
        throw new BadRequestException('Hierarchie ist auf eine Ebene begrenzt (Master → Sub).');
      }
    }
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
        parentId: data.parentId ?? undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
        members: { create: { userId: ownerId, role: MemberRole.OWNER } },
        versions: { create: { version: 1, createdBy: ownerId, changeNote: 'Initial version' } },
      },
      include: this.defaultInclude(),
    });
  }

  // --- Suche (FA-SEARCH) ---
  async search(params: {
    q?: string;
    subjectId?: number;
    schoolLevel?: string;
    contentLanguage?: string;
    license?: string;
    sort?: 'recent' | 'rating' | 'popular' | 'stars';
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
          : sort === 'stars'
            ? { stars: { _count: 'desc' } }
            : { updatedAt: 'desc' };
    const [items, total] = await Promise.all([
      this.prisma.repository.findMany({ where, orderBy, skip, take, include: this.defaultInclude() }),
      this.prisma.repository.count({ where }),
    ]);
    return { items, total };
  }

  /** "Meine Lehrmittel": eigene + Mitgliedschaften des Nutzers. */
  async listMine(userId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 50 } = params;
    const where: Prisma.RepositoryWhereInput = {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    };
    const [items, total] = await Promise.all([
      this.prisma.repository.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take, include: this.defaultInclude() }),
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

  // --- Bearbeiten (Metadaten aktualisieren) ---
  async update(id: string, userId: string, data: any) {
    await this.assertCanManage(id, userId);
    // parentId nicht per update ändern (Hierarchie bleibt stabil)
    delete data.parentId;
    delete data.id;
    delete data.ownerId;
    return this.prisma.repository.update({ where: { id }, data, include: this.defaultInclude() });
  }

  // --- Sub-Repositories (Hierarchie) ---
  async listChildren(id: string) {
    return this.prisma.repository.findMany({
      where: { parentId: id },
      orderBy: { updatedAt: 'desc' },
      include: { owner: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async setParent(id: string, userId: string, parentId: string | null) {
    const repo = await this.getById(id);
    await this.assertOwner(id, userId);
    if (parentId) {
      if (parentId === id) throw new BadRequestException('Ein Lehrmittel kann nicht sich selbst untergeordnet werden.');
      const parent = await this.prisma.repository.findUnique({ where: { id: parentId } });
      if (!parent) throw new NotFoundException('Übergeordnetes Lehrmittel nicht gefunden.');
      if (parent.parentId) throw new BadRequestException('Hierarchie ist auf eine Ebene begrenzt (Master → Sub).');
      if (repo.parentId && repo.children.length > 0) {
        throw new BadRequestException('Dieses Lehrmittel ist selbst ein Master (hat Sub-Repositories).');
      }
    }
    return this.prisma.repository.update({
      where: { id },
      data: { parentId },
      include: this.defaultInclude(),
    });
  }

  // --- Sterne (GitHub-Star-ähnlich) ---
  async toggleStar(repoId: string, userId: string) {
    await this.getById(repoId);
    const existing = await this.prisma.repoStar.findUnique({
      where: { userId_repositoryId: { userId, repositoryId: repoId } },
    });
    if (existing) {
      await this.prisma.repoStar.delete({
        where: { userId_repositoryId: { userId, repositoryId: repoId } },
      });
    } else {
      await this.prisma.repoStar.create({ data: { userId, repositoryId: repoId } });
    }
    const count = await this.prisma.repoStar.count({ where: { repositoryId: repoId } });
    return { starred: !existing, stars: count };
  }

  async hasStarred(repoId: string, userId: string) {
    const star = await this.prisma.repoStar.findUnique({
      where: { userId_repositoryId: { userId, repositoryId: repoId } },
    });
    const count = await this.prisma.repoStar.count({ where: { repositoryId: repoId } });
    return { starred: !!star, stars: count };
  }

  // --- Kataloge (Fächer/Tags für Metadaten-Formulare) ---
  async listSubjects() {
    return this.prisma.subject.findMany({ orderBy: { id: 'asc' } });
  }

  async listTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
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
        parentId: source.parentId, // Fork bleibt in derselben Hierarchie-Ebene
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
      include: { files: true },
    });
  }

  async listVersions(repoId: string) {
    return this.prisma.repositoryVersion.findMany({
      where: { repositoryId: repoId },
      orderBy: { version: 'desc' },
      include: { files: true },
    });
  }

  // --- Issues (GitHub-ähnlich) ---
  async createIssue(repoId: string, authorId: string, data: { title: string; description?: string; labels?: string[] }) {
    const repo = await this.getById(repoId);
    // Issues dürfen alle Mitglieder + Eigentümer anlegen
    const isMember = repo.members.some((m) => m.userId === authorId);
    if (!isMember) throw new ForbiddenException('Nur Mitglieder können Issues anlegen.');
    const last = await this.prisma.repoIssue.findFirst({
      where: { repositoryId: repoId },
      orderBy: { number: 'desc' },
    });
    const number = (last?.number ?? 0) + 1;
    return this.prisma.repoIssue.create({
      data: {
        repositoryId: repoId,
        authorId,
        number,
        title: data.title,
        description: data.description,
        labels: data.labels ?? [],
      },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async listIssues(repoId: string, status?: 'OPEN' | 'CLOSED') {
    return this.prisma.repoIssue.findMany({
      where: { repositoryId: repoId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getIssue(repoId: string, number: number) {
    const issue = await this.prisma.repoIssue.findFirst({
      where: { repositoryId: repoId, number },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
      },
    });
    if (!issue) throw new NotFoundException('Issue nicht gefunden.');
    return issue;
  }

  async closeIssue(repoId: string, number: number, userId: string, close: boolean) {
    const issue = await this.getIssue(repoId, number);
    // Autor oder Owner darf schliessen/öffnen
    const repo = await this.getById(repoId);
    const isOwner = repo.ownerId === userId;
    if (issue.authorId !== userId && !isOwner) {
      throw new ForbiddenException('Nur Autor oder Eigentümer dürfen den Status ändern.');
    }
    return this.prisma.repoIssue.update({
      where: { id: issue.id },
      data: { status: close ? 'CLOSED' : 'OPEN' },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async addIssueComment(repoId: string, number: number, authorId: string, text: string) {
    const issue = await this.getIssue(repoId, number);
    const repo = await this.getById(repoId);
    const isMember = repo.ownerId === authorId || repo.members.some((m) => m.userId === authorId);
    if (!isMember) throw new ForbiddenException('Nur Mitglieder können kommentieren.');
    const comment = await this.prisma.repoIssueComment.create({
      data: { issueId: issue.id, authorId, text },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    // updatedAt der Issue anfassen (sortiert dann oben)
    await this.prisma.repoIssue.update({ where: { id: issue.id }, data: { updatedAt: new Date() } });
    return comment;
  }

  // --- Pull Requests (GitHub-ähnlich; Quelle = Sub-Repo/Fork, Ziel = Master) ---
  async createPullRequest(targetRepoId: string, authorId: string, data: {
    sourceRepoId: string;
    title: string;
    description?: string;
  }) {
    const target = await this.getById(targetRepoId);
    const source = await this.getById(data.sourceRepoId);
    if (target.id === source.id) throw new BadRequestException('Quelle und Ziel dürfen nicht identisch sein.');
    // Autor muss Quelle besitzen/mitwirken
    const canAuthor = source.ownerId === authorId || source.members.some((m) => m.userId === authorId);
    if (!canAuthor) throw new ForbiddenException('Du musst Mitwirkender der Quelle sein.');
    const last = await this.prisma.repoPullRequest.findFirst({
      where: { targetRepoId },
      orderBy: { number: 'desc' },
    });
    const number = (last?.number ?? 0) + 1;
    return this.prisma.repoPullRequest.create({
      data: {
        targetRepoId,
        sourceRepoId: source.id,
        authorId,
        number,
        title: data.title,
        description: data.description,
      },
      include: this.prInclude(),
    });
  }

  async listPullRequests(targetRepoId: string, status?: 'OPEN' | 'MERGED' | 'CLOSED') {
    return this.prisma.repoPullRequest.findMany({
      where: { targetRepoId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: this.prInclude(),
    });
  }

  /**
   * Merge: übernimmt die neueste Version (inkl. Dateien) der Quelle als neue
   * Version ins Ziel. Vereinfachtes Modell: "Squash-Merge" der aktuellen Dateien.
   */
  async mergePullRequest(targetRepoId: string, number: number, userId: string, changeNote?: string) {
    const pr = await this.prisma.repoPullRequest.findFirst({
      where: { targetRepoId, number },
    });
    if (!pr) throw new NotFoundException('Pull Request nicht gefunden.');
    if (pr.status !== 'OPEN') throw new BadRequestException('Nur offene Pull Requests können gemergt werden.');
    // Nur Eigentümer/Ziel-Member mit Manage-Recht dürfen mergen
    await this.assertCanManage(targetRepoId, userId);

    const latestSourceVersion = await this.prisma.repositoryVersion.findFirst({
      where: { repositoryId: pr.sourceRepoId },
      orderBy: { version: 'desc' },
      include: { files: true },
    });
    const latestTargetVersion = await this.prisma.repositoryVersion.findFirst({
      where: { repositoryId: targetRepoId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestTargetVersion?.version ?? 0) + 1;

    // Neue Version im Ziel + Datei-Einträge klonen (Storage-Keys bleiben identisch,
    // physische Objekte werden geteilt – Löschung im Original belässt Kopien funktionsfähig
    // nur solange der Storage-Key existiert; für die Vereinfachung akzeptabel.)
    const merged = await this.prisma.$transaction(async (tx) => {
      const version = await tx.repositoryVersion.create({
        data: {
          repositoryId: targetRepoId,
          version: nextVersion,
          createdBy: userId,
          changeNote: changeNote ?? `Merge PR #${pr.number}: ${pr.title}`,
        },
      });
      if (latestSourceVersion) {
        for (const f of latestSourceVersion.files) {
          await tx.fileAsset.create({
            data: {
              versionId: version.id,
              originalName: f.originalName,
              mimeType: f.mimeType,
              sizeBytes: f.sizeBytes,
              storageKey: f.storageKey,
              sha256: f.sha256,
            },
          });
        }
      }
      const updated = await tx.repoPullRequest.update({
        where: { id: pr.id },
        data: { status: 'MERGED', mergedById: userId, mergedAt: new Date() },
      });
      return updated;
    });
    return this.prisma.repoPullRequest.findUnique({ where: { id: merged.id }, include: this.prInclude() });
  }

  async closePullRequest(targetRepoId: string, number: number, userId: string) {
    const pr = await this.prisma.repoPullRequest.findFirst({ where: { targetRepoId, number } });
    if (!pr) throw new NotFoundException('Pull Request nicht gefunden.');
    if (pr.status !== 'OPEN') throw new BadRequestException('Nur offene Pull Requests können geschlossen werden.');
    if (pr.authorId !== userId) await this.assertCanManage(targetRepoId, userId);
    const updated = await this.prisma.repoPullRequest.update({
      where: { id: pr.id },
      data: { status: 'CLOSED' },
    });
    return this.prisma.repoPullRequest.findUnique({ where: { id: updated.id }, include: this.prInclude() });
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
      parent: { select: { id: true, title: true, parentId: true } },
      children: {
        select: {
          id: true, title: true, parentId: true, updatedAt: true,
          owner: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { issues: { where: { status: 'OPEN' as const } }, stars: true } },
        },
      },
      members: { include: { user: { select: { id: true, displayName: true } } } },
      versions: { orderBy: { version: 'desc' as const }, take: 5, include: { files: true } },
      tags: { include: { tag: true } },
      subject: true,
      stars: { select: { userId: true } },
      _count: {
        select: {
          issues: { where: { status: 'OPEN' as const } },
          pullRequestsTo: { where: { status: 'OPEN' as const } },
        },
      },
    };
  }

  private prInclude() {
    return {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      mergedBy: { select: { id: true, displayName: true } },
      targetRepo: { select: { id: true, title: true } },
      sourceRepo: { select: { id: true, title: true } },
    };
  }
}