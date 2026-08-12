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
    const endpoint = (process.env.S3_ENDPOINT || 'http://minio:9000')
      .replace(/^https?:\/\//, '');
    this.client = new Minio.Client({
      endPoint: endpoint,
      port: parseInt(endpoint.match(/:(\d+)/)?.[1] || '9000', 10),
      useSSL: (process.env.S3_ENDPOINT || '').startsWith('https'),
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

  /** Upload eines Streams mit SSE-Metadaten. */
  async putObject(
    objectKey: string,
    stream: Readable | Buffer,
    size: number,
    mimeType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, stream, size, {
      'Content-Type': mimeType,
      // Markierung, dass Inhalt verschlüsselt abgelegt wird (SSE-S3).
      'X-Amz-Server-Side-Encryption': 'AES256',
    });
  }

  async getObject(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.bucket, objectKey);
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }

  /** Presigned URL für zeitlich begrenzten Download (z. B. 15 Min). */
  async presignedGetUrl(objectKey: string, expirySeconds = 900): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }
}