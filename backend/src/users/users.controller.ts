import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { AccountStatus, UserRole } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsArray, IsEmail, MinLength } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsEnum(['DE', 'FR', 'IT', 'EN']) uiLanguage?: 'DE' | 'FR' | 'IT' | 'EN';
  @IsOptional() @IsEnum(['LIGHT', 'DARK', 'SYSTEM']) themePreference?: 'LIGHT' | 'DARK' | 'SYSTEM';
  @IsOptional() @IsArray() schoolLevels?: any[];
  @IsOptional() @IsArray() subjects?: string[];
  @IsOptional() @IsEnum(['GENERAL', 'VOCATIONAL']) educationSector?: 'GENERAL' | 'VOCATIONAL';
  // Lehrpersonen-Profil (FA-PROF)
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() furtherEducation?: string;
  @IsOptional() @IsArray() schools?: string[];
  @IsOptional() @IsString() curriculumVitae?: string;
  @IsOptional() @IsInt() @Min(0) @Max(80) yearsOfExperience?: number;
  @IsOptional() @IsString() websiteUrl?: string;
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

class DeleteUserDto {
  @IsOptional() @IsInt() @Min(1) @Max(365) retentionDays?: number;
  @IsOptional() @IsString() transferToUserId?: string;
}

class CreateByAdminDto {
  @IsEmail() email: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsString() @MinLength(2) displayName: string;
  @IsOptional() @IsEnum(['USER', 'MODERATOR', 'ADMIN']) role?: 'USER' | 'MODERATOR' | 'ADMIN';
  @IsOptional() @IsEnum(['DE', 'FR', 'IT', 'EN']) uiLanguage?: 'DE' | 'FR' | 'IT' | 'EN';
}

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
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

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Keine Datei erhalten.');
    return this.users.uploadAvatar(user.id, file);
  }

  // Avatar-Bild ausliefern (stabile URL, keine ablaufenden presigned-Links)
  @Get('me/avatar')
  async getAvatar(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: any) {
    const avatar = await this.users.getAvatar(user.id);
    if (!avatar) throw new NotFoundException('Kein Profilbild vorhanden.');
    res.set({ 'Content-Type': avatar.mimeType, 'Cache-Control': 'private, max-age=60' });
    return new StreamableFile(avatar.buffer);
  }

  @Post('me/change-password')
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  // --- Admin: Nutzer direkt anlegen (ohne Registrierungsanfrage) ---
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createByAdmin(@CurrentUser() user: RequestUser, @Body() dto: CreateByAdminDto) {
    return this.users.createByAdmin(user.id, dto as any);
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

  // Profil eines Nutzers einsehen (Admin/Moderator – Klick auf den Nutzernamen)
  @Get(':id/profile')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  getProfile(@Param('id') id: string) {
    return this.users.getProfileById(id);
  }

  // Avatar eines Nutzers ausliefern (Admin/Moderator-Ansicht)
  @Get(':id/avatar')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  async getUserAvatar(@Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const avatar = await this.users.getAvatarById(id);
    if (!avatar) throw new NotFoundException('Kein Profilbild vorhanden.');
    res.set({ 'Content-Type': avatar.mimeType, 'Cache-Control': 'private, max-age=60' });
    return new StreamableFile(avatar.buffer);
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

  // Löschen mit Kulanzfrist: Nutzer wird deaktiviert und nach Ablauf der
  // Frist endgültig gelöscht (FA-AUTH-007). Optional Eigentum übertragen.
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DeleteUserDto,
  ) {
    return this.users.deleteWithRetention(id, user.id, dto?.retentionDays ?? 30, dto?.transferToUserId);
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