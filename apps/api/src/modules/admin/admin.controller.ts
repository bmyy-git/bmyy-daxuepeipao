import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { Role } from '@prisma/client'
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

class AssignMentorDto {
  @IsString() mentorId!: string
}

class CardStatusDto {
  @IsIn(['active', 'lost'])
  status!: 'active' | 'lost'
}

class GenerateCardsDto {
  @IsInt() @Min(1) @Max(500) count!: number
  @IsIn(['student_primary', 'student_secondary', 'parent_family', 'staff'])
  cardType!: 'student_primary' | 'student_secondary' | 'parent_family' | 'staff'
}

class ImportCardItemDto {
  @IsString() idd!: string
  @IsString() idh!: string
  @IsIn(['student_primary', 'student_secondary', 'parent_family', 'staff'])
  type!: 'student_primary' | 'student_secondary' | 'parent_family' | 'staff'
  @IsString() label!: string
}

class ImportCardsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportCardItemDto)
  cards!: ImportCardItemDto[]
}

class BindCardDto {
  @IsString() studentId!: string
  @IsIn(['student_primary', 'student_secondary', 'parent_family'])
  cardType!: 'student_primary' | 'student_secondary' | 'parent_family'
  @IsOptional() @IsString() subjectType?: string
  @IsOptional() @IsString() subjectId?: string
  @IsOptional() @IsBoolean() isPrimary?: boolean
}

class ReplaceCardDto {
  @IsString() newIdd!: string
  @IsString() newIdh!: string
  @IsOptional() @IsString() label?: string
}

@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly domain: DomainService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.domain.adminOverview(user)
  }

  @Get('state')
  state(@CurrentUser() user: AuthUser) {
    return this.domain.snapshot(user)
  }

  @Post('students/:id/assign-mentor')
  assignMentor(
    @CurrentUser() user: AuthUser,
    @Param('id') studentId: string,
    @Body() body: AssignMentorDto,
  ) {
    return this.domain.assignMentor(studentId, body.mentorId, user)
  }

  @Patch('nfc-cards/:idd/status')
  cardStatus(
    @CurrentUser() user: AuthUser,
    @Param('idd') idd: string,
    @Body() body: CardStatusDto,
  ) {
    return this.domain.updateCardStatus(user, idd, body.status)
  }

  @Post('nfc-cards/generate')
  generate(@CurrentUser() user: AuthUser, @Body() body: GenerateCardsDto) {
    return this.domain.generateCards(user, body.count, body.cardType)
  }

  @Post('nfc-cards/import-idd')
  importCards(@CurrentUser() user: AuthUser, @Body() body: ImportCardsDto) {
    return this.domain.importCards(user, body.cards)
  }

  @Post('nfc-cards/:idd/bind')
  bind(@CurrentUser() user: AuthUser, @Param('idd') idd: string, @Body() body: BindCardDto) {
    return this.domain.bindCard(user, idd, body)
  }

  @Post('nfc-cards/:idd/replace')
  replace(@CurrentUser() user: AuthUser, @Param('idd') idd: string, @Body() body: ReplaceCardDto) {
    return this.domain.replaceCard(user, idd, body)
  }

  @Post('nfc-cards/:idd/set-primary')
  setPrimary(@CurrentUser() user: AuthUser, @Param('idd') idd: string) {
    return this.domain.setPrimaryCard(user, idd)
  }

  @Delete('nfc-cards/:idd/binding')
  unbind(@CurrentUser() user: AuthUser, @Param('idd') idd: string) {
    return this.domain.unbindCard(user, idd)
  }
}
