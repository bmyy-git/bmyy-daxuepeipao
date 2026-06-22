import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { IsObject, IsOptional, IsString } from 'class-validator'
import type { Response, Express } from 'express'
import { memoryStorage } from 'multer'
import { CurrentUser } from '../auth/current-user.decorator'
import { Public } from '../auth/public.decorator'
import type { AuthUser } from '../auth/auth.types'
import { FilesService } from './files.service'

class ActivationSessionDto {
  @IsString() cardId!: string
  @IsOptional() @IsString() idh?: string
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
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadMetaDto,
  ) {
    return this.files.upload(file, body.activationSessionId)
  }

  @Post('files/upload-auth')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadForCurrentStudent(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.uploadForUser(file, user)
  }

  @Get('files')
  list(@CurrentUser() user: AuthUser) {
    return this.files.list(user)
  }

  @Get('files/:id/download')
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
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.delete(user, id)
  }
}
