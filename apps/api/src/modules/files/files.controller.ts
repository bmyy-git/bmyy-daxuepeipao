import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Role } from '@prisma/client'
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator'
import type { Response, Express } from 'express'
import { memoryStorage } from 'multer'
import { CurrentUser } from '../auth/current-user.decorator'
import { Public } from '../auth/public.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { FilesService } from './files.service'

class ActivationSessionDto {
  @IsString() cardId!: string
  @IsString() @MinLength(1) idh!: string
}

class DraftDto {
  @IsObject() draft!: Record<string, unknown>
}

class UploadMetaDto {
  @IsOptional() @IsString() activationSessionId?: string
}

@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Public()
  @Post('activation-sessions')
  createSession(@Body() body: ActivationSessionDto) {
    return this.files.createActivationSession(body.cardId, body.idh)
  }

  @Public()
  @Patch('activation-sessions/:id/draft')
  saveDraft(@Param('id') id: string, @Body() body: DraftDto) {
    return this.files.saveDraft(id, body.draft)
  }

  @Public()
  @Post('files/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      files: 1,
      fields: 2,
      parts: 3,
      fieldNameSize: 100,
      fieldSize: 256,
      fileSize: maxUploadBytes(),
    },
  }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadMetaDto,
  ) {
    return this.files.upload(file, body.activationSessionId)
  }

  @Post('files/upload-auth')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      files: 1,
      fields: 1,
      parts: 2,
      fieldNameSize: 100,
      fieldSize: 256,
      fileSize: maxUploadBytes(),
    },
  }))
  uploadForCurrentStudent(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.uploadForUser(file, user)
  }

  @Get('files')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN, Role.SUPER_ADMIN)
  list(
    @CurrentUser() user: AuthUser,
    @Query('school') school?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.files.list(user, { school, cursor, take: take ? Number(take) : undefined })
  }

  @Get('files/:id/download')
  @Roles(Role.STUDENT, Role.MENTOR, Role.ADMIN, Role.SUPER_ADMIN)
  async download(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const result = await this.files.download(user, id)
    response.setHeader('Content-Type', result.document.mimeType)
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.document.originalFileName)}`,
    )
    response.send(result.data)
  }

  @Delete('files/:id')
  @Roles(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN)
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.delete(user, id)
  }
}

function maxUploadBytes() {
  const configured = Number(process.env.MAX_FILE_SIZE_MB || 20)
  const megabytes = Number.isFinite(configured) && configured > 0 ? Math.min(configured, 100) : 20
  return megabytes * 1024 * 1024
}
