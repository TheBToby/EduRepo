import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Prisma BigInt-Felder (z. B. sizeBytes, storageQuotaBytes) als String serialisieren,
// da JSON.stringify mit BigInt standardmäßig fehlschlägt.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  // Vertrauenswürdige Proxies (hinter Reverse-Proxy/Docker)
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  // Sicherheits-Header (NFA-SEC-002/004)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Frontend regelt CSP selbst
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Cookies für Session/Refresh (FA-AUTH-011)
  app.use(cookieParser());

  // Globale Validierung (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger / API-Doku
  const config = new DocumentBuilder()
    .setTitle('EduRepo API')
    .setDescription('Education Repository – REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`EduRepo API listening on http://0.0.0.0:${port}`);
  logger.log(`API-Docs:        http://0.0.0.0:${port}/api/docs`);
}
bootstrap();