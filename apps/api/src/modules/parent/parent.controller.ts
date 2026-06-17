import { Body, Controller, Get, Post } from '@nestjs/common'
import { Role } from '@prisma/client'
import { IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

class EncourageDto {
  @IsString() @MinLength(1) content!: string
}

@Roles(Role.PARENT)
@Controller('parent')
export class ParentController {
  constructor(private readonly domain: DomainService) {}

  @Get('observation')
  observation(@CurrentUser() user: AuthUser) {
    return this.domain.snapshot(user)
  }

  @Post('encouragements')
  encourage(@CurrentUser() user: AuthUser, @Body() body: EncourageDto) {
    return this.domain.sendEncouragement(user, body.content)
  }
}
