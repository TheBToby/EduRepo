import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { ReportTargetType, ReportStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

class CreateReportDto {
  @IsEnum(['RATING', 'COMMENT', 'REPOSITORY']) targetType: ReportTargetType;
  @IsString() targetId: string;
  @IsString() reason: string;
}

class ResolveDto {
  @IsEnum(['RESOLVED_REMOVED', 'RESOLVED_DISMISSED']) status: 'RESOLVED_REMOVED' | 'RESOLVED_DISMISSED';
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private moderation: ModerationService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReportDto) {
    return this.moderation.create(user.id, dto.targetType, dto.targetId, dto.reason);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  list(@Query('status') status?: ReportStatus) {
    return this.moderation.list(status as ReportStatus | undefined);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  resolve(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: ResolveDto) {
    return this.moderation.resolve(id, user.id, dto.status as any);
  }
}