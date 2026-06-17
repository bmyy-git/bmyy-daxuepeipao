import { Body, Controller, Param, Post } from '@nestjs/common'
import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

class SubmitTaskDto {
  @IsString() @MinLength(2) content!: string
  @IsOptional() @IsArray() links?: string[]
  @IsOptional() @IsArray() fileNames?: string[]
  @IsInt() @Min(1) @Max(5) selfRating!: number
  @IsOptional() @IsString() blockers?: string
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly domain: DomainService) {}

  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.domain.startTask(user, id)
  }

  @Post(':id/submissions')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: SubmitTaskDto) {
    return this.domain.submitTask(user, id, body)
  }
}
