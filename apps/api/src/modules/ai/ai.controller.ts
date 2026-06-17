import { Body, Controller, Post } from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

class ChatDto {
  @IsString() @MinLength(1) question!: string
}

@Controller('ai')
export class AiController {
  constructor(private readonly domain: DomainService) {}

  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() body: ChatDto) {
    return this.domain.askAi(user, body.question)
  }
}
