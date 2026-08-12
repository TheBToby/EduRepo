import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { FilesModule } from './files/files.module';
import { RatingsModule } from './ratings/ratings.module';
import { ModerationModule } from './moderation/moderation.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    RepositoriesModule,
    FilesModule,
    RatingsModule,
    ModerationModule,
  ],
})
export class AppModule {}