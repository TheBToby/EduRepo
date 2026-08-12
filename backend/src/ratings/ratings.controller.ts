import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { IsInt, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';

class RatingDto {
  @IsInt() @Min(1) @Max(5) overall: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) didactics?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) methodology?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) correctness?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) usability?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) clarity?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) prepTime?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) engagement?: number;
  @IsOptional() @IsString() comment?: string;
}

class CommentDto {
  @IsString() text: string;
  @IsOptional() @IsString() parentId?: string;
}

@Controller('repositories/:repoId')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private ratings: RatingsService) {}

  // --- Bewertungen ---
  @Post('ratings')
  rate(@Param('repoId') repoId: string, @CurrentUser() user: RequestUser, @Body() dto: RatingDto) {
    return this.ratings.createOrUpdate(repoId, user.id, dto);
  }

  @Get('ratings')
  listRatings(@Param('repoId') repoId: string) {
    return this.ratings.list(repoId);
  }

  @Get('ratings/average')
  average(@Param('repoId') repoId: string) {
    return this.ratings.average(repoId);
  }

  // --- Kommentare ---
  @Post('comments')
  comment(@Param('repoId') repoId: string, @CurrentUser() user: RequestUser, @Body() dto: CommentDto) {
    return this.ratings.addComment(repoId, user.id, dto.text, dto.parentId);
  }

  @Get('comments')
  listComments(@Param('repoId') repoId: string) {
    return this.ratings.listComments(repoId);
  }

  @Delete('comments/:commentId')
  @UseGuards(RolesGuard)
  @Roles('USER', 'MODERATOR', 'ADMIN') // USER für Autor/Eigentümer; Mod/Admin staff
  removeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const isStaff = user.role === 'MODERATOR' || user.role === 'ADMIN';
    return this.ratings.removeComment(commentId, user.id, isStaff);
  }
}