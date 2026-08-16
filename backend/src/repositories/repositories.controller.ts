import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException, ParseIntPipe,
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
  @IsOptional() @IsString() parentId?: string; // Sub-Repository
}

class UpdateRepoDto {
  @IsOptional() @IsObject() title?: Record<string, string>;
  @IsOptional() @IsObject() description?: Record<string, string>;
  @IsOptional() @IsEnum(['PUBLIC_DOWNLOAD', 'APPROVAL_REQUIRED']) access?: RepositoryAccess;
  @IsOptional() @IsInt() subjectId?: number | null;
  @IsOptional() @IsString() schoolLevel?: string | null;
  @IsOptional() @IsString() contentLanguage?: string;
  @IsOptional() @IsString() license?: string | null;
  @IsOptional() @IsString() materialType?: string | null;
  @IsOptional() @IsString() educationSector?: string | null;
  @IsOptional() @IsString() curriculum21?: string | null;
  @IsOptional() @IsString() learningGoals?: string | null;
  @IsOptional() @IsString() targetGroup?: string | null;
  @IsOptional() @IsString() timeRequired?: string | null;
  @IsOptional() @IsString() difficulty?: string | null;
  @IsOptional() @IsString() methodology?: string | null;
  @IsOptional() @IsString() prerequisites?: string | null;
  @IsOptional() @IsArray() tagIds?: number[];
}

class SetParentDto {
  @IsOptional() @IsString() parentId?: string | null;
}

class MemberDto {
  @IsString() userId: string;
  @IsEnum(['OWNER', 'COLLABORATOR']) role: MemberRole;
}

class CreateIssueDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() labels?: string[];
}

class CreateIssueCommentDto {
  @IsString() text: string;
}

class CreatePullRequestDto {
  @IsString() sourceRepoId: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
}

class MergePullRequestDto {
  @IsOptional() @IsString() changeNote?: string;
}

class SearchDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() subjectId?: string; // kommt als String aus Query
  @IsOptional() @IsString() schoolLevel?: string;
  @IsOptional() @IsString() contentLanguage?: string;
  @IsOptional() @IsString() license?: string;
  @IsOptional() @IsEnum(['recent', 'rating', 'popular', 'stars']) sort?: 'recent' | 'rating' | 'popular' | 'stars';
  @IsOptional() @IsString() skip?: string;
  @IsOptional() @IsString() take?: string;
  @IsOptional() @IsString() mine?: string; // "true"/"1" = nur eigene + Mitgliedschaften
}

@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(private repos: RepositoriesService) {}

  @Get()
  search(@CurrentUser() user: RequestUser, @Query() q: SearchDto) {
    // Query-Strings in Zahlen umwandeln, sofern vorhanden
    const subjectId = q.subjectId ? parseInt(q.subjectId, 10) : undefined;
    const skip = q.skip ? parseInt(q.skip, 10) : 0;
    const take = q.take ? parseInt(q.take, 10) : 24;
    // mine=true: eigene Lehrmittel + Mitgliedschaften ("Meine Lehrmittel")
    const mine = q.mine === 'true' || q.mine === '1';
    if (mine) {
      return this.repos.listMine(user.id, { skip, take });
    }
    return this.repos.search({ ...q, subjectId, skip, take });
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRepoDto) {
    return this.repos.create(user.id, dto as any);
  }

  // --- Kataloge für Metadaten-Formulare ---
  @Get('meta/subjects')
  listSubjects() {
    return this.repos.listSubjects();
  }

  @Get('meta/tags')
  listTags() {
    return this.repos.listTags();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.repos.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateRepoDto) {
    return this.repos.update(id, user.id, dto as any);
  }

  // --- Hierarchie (Master/Sub) ---
  @Get(':id/children')
  listChildren(@Param('id') id: string) {
    return this.repos.listChildren(id);
  }

  @Patch(':id/parent')
  setParent(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SetParentDto,
  ) {
    return this.repos.setParent(id, user.id, dto.parentId ?? null);
  }

  // --- Sterne ---
  @Get(':id/star')
  getStar(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.repos.hasStarred(id, user.id);
  }

  @Post(':id/star')
  toggleStar(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.repos.toggleStar(id, user.id);
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

  // --- Issues ---
  @Get(':id/issues')
  listIssues(@Param('id') id: string, @Query('status') status?: 'OPEN' | 'CLOSED') {
    return this.repos.listIssues(id, status);
  }

  @Post(':id/issues')
  createIssue(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: CreateIssueDto) {
    return this.repos.createIssue(id, user.id, dto);
  }

  @Get(':id/issues/:number')
  getIssue(@Param('id') id: string, @Param('number', ParseIntPipe) number: number) {
    return this.repos.getIssue(id, number);
  }

  @Patch(':id/issues/:number/close')
  closeIssue(@Param('id') id: string, @Param('number', ParseIntPipe) number: number, @CurrentUser() user: RequestUser) {
    return this.repos.closeIssue(id, number, user.id, true);
  }

  @Patch(':id/issues/:number/reopen')
  reopenIssue(@Param('id') id: string, @Param('number', ParseIntPipe) number: number, @CurrentUser() user: RequestUser) {
    return this.repos.closeIssue(id, number, user.id, false);
  }

  @Post(':id/issues/:number/comments')
  addIssueComment(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateIssueCommentDto,
  ) {
    return this.repos.addIssueComment(id, number, user.id, dto.text);
  }

  // --- Pull Requests ---
  @Get(':id/pull-requests')
  listPullRequests(@Param('id') id: string, @Query('status') status?: 'OPEN' | 'MERGED' | 'CLOSED') {
    return this.repos.listPullRequests(id, status);
  }

  @Post(':id/pull-requests')
  createPullRequest(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: CreatePullRequestDto) {
    return this.repos.createPullRequest(id, user.id, dto);
  }

  @Post(':id/pull-requests/:number/merge')
  mergePullRequest(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: MergePullRequestDto,
  ) {
    return this.repos.mergePullRequest(id, number, user.id, dto?.changeNote);
  }

  @Post(':id/pull-requests/:number/close')
  closePullRequest(
    @Param('id') id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.repos.closePullRequest(id, number, user.id);
  }

  @Get(':id/can-download')
  async canDownload(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return { canDownload: await this.repos.canDownload(id, user.id) };
  }
}