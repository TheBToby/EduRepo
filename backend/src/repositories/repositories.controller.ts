import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { MemberRole, RepositoryAccess } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsInt, IsObject, IsArray, Min } from 'class-validator';

class CreateRepoDto {
  @IsObject() title: Record<string, string>;
  @IsObject() description: Record<string, string>;
  @IsOptional() @IsEnum(['PUBLIC_DOWNLOAD', 'APPROVAL_REQUIRED']) access?: RepositoryAccess;
  @IsOptional() @IsInt() subjectId?: number;
  @IsOptional() @IsString() schoolLevel?: string;
  @IsOptional() @IsString() contentLanguage?: string;
  @IsOptional() @IsString() license?: string;
  @IsOptional() @IsString() materialType?: string;
  @IsOptional() @IsString() educationSector?: string;
  @IsOptional() @IsString() curriculum21?: string;
  @IsOptional() @IsString() learningGoals?: string;
  @IsOptional() @IsString() targetGroup?: string;
  @IsOptional() @IsString() timeRequired?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() methodology?: string;
  @IsOptional() @IsString() prerequisites?: string;
  @IsOptional() @IsArray() tagIds?: number[];
}

class MemberDto {
  @IsString() userId: string;
  @IsEnum(['OWNER', 'COLLABORATOR']) role: MemberRole;
}

class SearchDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() subjectId?: string; // kommt als String aus Query
  @IsOptional() @IsString() schoolLevel?: string;
  @IsOptional() @IsString() contentLanguage?: string;
  @IsOptional() @IsString() license?: string;
  @IsOptional() @IsEnum(['recent', 'rating', 'popular']) sort?: 'recent' | 'rating' | 'popular';
  @IsOptional() @IsString() skip?: string;
  @IsOptional() @IsString() take?: string;
}

@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(private repos: RepositoriesService) {}

  @Get()
  search(@Query() q: SearchDto) {
    // Query-Strings in Zahlen umwandeln, sofern vorhanden
    const subjectId = q.subjectId ? parseInt(q.subjectId, 10) : undefined;
    const skip = q.skip ? parseInt(q.skip, 10) : 0;
    const take = q.take ? parseInt(q.take, 10) : 24;
    return this.repos.search({ ...q, subjectId, skip, take });
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRepoDto) {
    return this.repos.create(user.id, dto as any);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.repos.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.repos.update(id, user.id, dto);
  }

  // --- Sharing (FA-REPO-007) ---
  @Post(':id/members')
  addMember(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: MemberDto) {
    return this.repos.addMember(id, user.id, dto.userId, dto.role);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.repos.removeMember(id, user.id, userId);
  }

  @Post(':id/grant-access')
  grantAccess(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body('userId') targetUserId: string) {
    return this.repos.grantAccess(id, user.id, targetUserId);
  }

  // --- Fork (FA-REPO-008) ---
  @Post(':id/fork')
  fork(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.repos.fork(id, user.id);
  }

  // --- Versionierung (FA-REPO-003/004) ---
  @Post(':id/versions')
  createVersion(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body('changeNote') changeNote?: string) {
    return this.repos.createVersion(id, user.id, changeNote);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.repos.listVersions(id);
  }

  @Get(':id/can-download')
  async canDownload(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return { canDownload: await this.repos.canDownload(id, user.id) };
  }
}
