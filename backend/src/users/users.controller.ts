import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { AccountStatus, UserRole } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsInt, Min, IsArray } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsEnum(['DE', 'FR', 'IT', 'EN']) uiLanguage?: 'DE' | 'FR' | 'IT' | 'EN';
  @IsOptional() @IsEnum(['LIGHT', 'DARK', 'SYSTEM']) themePreference?: 'LIGHT' | 'DARK' | 'SYSTEM';
  @IsOptional() @IsArray() schoolLevels?: any[];
  @IsOptional() @IsArray() subjects?: string[];
  @IsOptional() @IsEnum(['GENERAL', 'VOCATIONAL']) educationSector?: 'GENERAL' | 'VOCATIONAL';
}

class StatusDto {
  @IsEnum(['ACTIVE', 'LOCKED', 'DEACTIVATED']) status: 'ACTIVE' | 'LOCKED' | 'DEACTIVATED';
  @IsOptional() @IsString() reason?: string;
}

class RoleDto {
  @IsEnum(['USER', 'MODERATOR', 'ADMIN']) role: 'USER' | 'MODERATOR' | 'ADMIN';
}

class QuotaDto {
  @IsInt() @Min(0) quotaBytes: number;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get('me/storage')
  myStorage(@CurrentUser() user: RequestUser) {
    return this.users.getStorageUsage(user.id);
  }

  // --- Admin/Moderator: Nutzer-Verwaltung ---
  @Get()
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  listAll() {
    return this.users.listAll();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  listPending() {
    return this.users.listPending();
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.users.approveRegistration(id, user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  reject(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body('reason') reason?: string) {
    return this.users.rejectRegistration(id, user.id, reason);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  setStatus(
    @Param('id') id: string,
    @Body() dto: StatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.users.setStatus(id, dto.status as AccountStatus, user.id, dto.reason);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  setRole(
    @Param('id') id: string,
    @Body() dto: RoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.users.setRole(id, dto.role as UserRole, user.id);
  }

  @Patch(':id/quota')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  setQuota(
    @Param('id') id: string,
    @Body() dto: QuotaDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.users.setStorageQuota(id, BigInt(dto.quotaBytes), user.id);
  }
}