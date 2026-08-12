import {
  Injectable, ForbiddenException, BadRequestException, NotFoundException, PayloadTooLargeException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { Readable } from 'stream';

// Erlaubte MIME-Types (FA-FILE-001/002)
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.document', // pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.oasis.opendocument.text', // odt
  'text/markdown', 'text/plain', 'text/html',
  'image/png', 'image/jpeg', 'image/svg+xml', 'image/gif',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav',
  'video/mp4', 'video/webm',
]);

@Injectable()
export class FilesService {
  private readonly maxSize = parseInt(process.env.MAX_FILE_SIZE_BYTES || '104857600', 10); // 100 MB

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private repos: RepositoriesService,
  ) {}

  async upload(
    repoId: string,
    versionId: string,
    userId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    // Validierung (FA-FILE-001/002/007)
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Dateityp nicht erlaubt: ${file.mimetype}`);
    }
    if (file.size > this.maxSize) {
      throw new PayloadTooLargeException(`Datei überschreitet das Limit von ${this.maxSize} Bytes.`);
    }

    // Berechtigung: Eigentümer/Member des Repos
    const canManage = await this.canManage(repoId, userId);
    if (!canManage) throw new ForbiddenException('Keine Berechtigung zum Hochladen.');

    // Quota prüfen (FA-FILE-007)
    await this.assertQuota(userId, file.size);

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `${repoId}/${versionId}/${crypto.randomUUID()}-${file.originalname}`;

    // Verschüsselt ablegen (NFA-SEC-001 via SSE im Storage-Service)
    await this.storage.putObject(storageKey, file.buffer, file.size, file.mimetype);

    return this.prisma.fileAsset.create({
      data: {
        versionId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageKey,
        sha256,
      },
    });
  }

  async download(repoId: string, fileId: string, userId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: { version: true },
    });
    if (!file || file.version.repositoryId !== repoId) {
      throw new NotFoundException('Datei nicht gefunden.');
    }
    // Zugriff gemäss Freigabemodell (FA-FILE-005)
    const allowed = await this.repos.canDownload(repoId, userId);
    if (!allowed) throw new ForbiddenException('Keine Berechtigung zum Herunterladen.');

    // Presigned URL (15 Min gültig) – Direktlink zum verschlüsselten Objekt
    const url = await this.storage.presignedGetUrl(file.storageKey);
    return { url, originalName: file.originalName, mimeType: file.mimeType };
  }

  async remove(repoId: string, fileId: string, userId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: { version: { include: { repository: true } } },
    });
    if (!file) throw new NotFoundException('Datei nicht gefunden.');
    const canManage = await this.canManage(repoId, userId);
    if (!canManage) throw new ForbiddenException('Keine Berechtigung zum Löschen.');

    await this.storage.deleteObject(file.storageKey);
    await this.prisma.fileAsset.delete({ where: { id: fileId } });
    return { ok: true };
  }

  // --- Helfer ---
  private async canManage(repoId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.repositoryMember.findUnique({
      where: { repositoryId_userId: { repositoryId: repoId, userId } },
    });
    return !!member;
  }

  private async assertQuota(userId: string, addBytes: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const used = await this.prisma.fileAsset.aggregate({
      _sum: { sizeBytes: true },
      where: { version: { repository: { ownerId: userId } } },
    });
    const usedBytes = Number(used._sum.sizeBytes || BigInt(0));
    if (usedBytes + addBytes > Number(user.storageQuotaBytes)) {
      throw new PayloadTooLargeException('Speicherkontingent überschritten.');
    }
  }
}