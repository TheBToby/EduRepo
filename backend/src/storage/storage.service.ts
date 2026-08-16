import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'stream';

/**
 * Storage-Service für verschlüsselte Lehrmittel-Dateien (S3/MinIO).
 * Verschlüsselung at-rest via SSE-S3 (NFA-SEC-001). In Produktion zwingend
 * SSE aktivieren; MinIO unterstützt SSE-S3 ab entsprechender Konfiguration.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    // MinIO/S3 Endpoint zerlegen: Host und Port (ohne Protokoll) separieren,
    // da der minio-Client endPoint ohne Port erwartet.
    const rawEndpoint = process.env.S3_ENDPOINT || 'http://minio:9000';
    const useSSL = rawEndpoint.startsWith('https://');
    const cleaned = rawEndpoint.replace(/^https?:\/\//, '');
    const [host, portStr] = cleaned.split(':');
    const port = parseInt(portStr || '9000', 10);
    this.client = new Minio.Client({
      endPoint: host,
      port,
      useSSL,
      accessKey: process.env.S3_ACCESS_KEY_ID || 'edurepo-minio',
      secretKey: process.env.S3_SECRET_ACCESS_KEY || 'edurepo-minio-secret',
      region: process.env.S3_REGION || 'us-east-1',
    });
    this.bucket = process.env.S3_BUCKET || 'edurepo-files';
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket, process.env.S3_REGION || 'us-east-1');
      this.logger.log(`Bucket erstellt: ${this.bucket}`);
    }
  }

  /** Upload eines Streams. SSE nur aktivieren, wenn der Storage es unterstuetzt
   *  (altes MinIO ohne KMS lehnt SSE-Header ab) und S3_USE_SSL/S3_SSE gesetzt ist. */
  async putObject(
    objectKey: string,
    stream: Readable | Buffer,
    size: number,
    mimeType: string,
  ): Promise<void> {
    const sseEnabled = process.env.S3_SSE === 'true';
    const metadata: Record<string, string> = { 'Content-Type': mimeType };
    if (sseEnabled) {
      // Markierung, dass Inhalt verschlüsselt abgelegt wird (SSE-S3).
      metadata['X-Amz-Server-Side-Encryption'] = 'AES256';
    }
    await this.client.putObject(this.bucket, objectKey, stream, size, metadata);
  }

  async getObject(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.bucket, objectKey);
  }

  /** Objekt als Buffer einlesen (z. B. fuer Avatare). */
  async getObjectBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
    }
    return Buffer.concat(chunks);
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }

  /** Presigned URL für zeitlich begrenzten Download (z. B. 15 Min). */
  async presignedGetUrl(objectKey: string, expirySeconds = 900): Promise<string> {
    const url = await this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
    // Fuer den Browser-Zugriff die oeffentliche Endpoint-URL verwenden
    // (interner Docker-Hostname ist vom Browser aus nicht erreichbar).
    const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT;
    if (publicEndpoint) {
      return url.replace(/^https?:\/\/[^/]+/, publicEndpoint.replace(/\/$/, ''));
    }
    return url;
  }
}
