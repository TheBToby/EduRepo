import {
  Controller, Post, Get, Delete, Param, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';

@Controller('repositories/:repoId/versions/:versionId/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('repoId') repoId: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: any,
  ) {
    return this.files.upload(repoId, versionId, user.id, file);
  }

  @Get(':fileId/download')
  async download(
    @Param('repoId') repoId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.files.download(repoId, fileId, user.id);
  }

  @Delete(':fileId')
  remove(
    @Param('repoId') repoId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.files.remove(repoId, fileId, user.id);
  }
}