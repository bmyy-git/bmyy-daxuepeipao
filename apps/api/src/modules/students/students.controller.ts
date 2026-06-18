import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import { Public } from '../auth/public.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'
import { AuthService } from '../auth/auth.service'

class ActivateStudentDto {
  @IsString() idd!: string
  @IsString() idh!: string
  @IsString() @MinLength(2) name!: string
  @IsString() phone!: string
  @IsOptional() @IsEmail() email?: string
  @IsString() school!: string
  @IsString() college!: string
  @IsString() major!: string
  @IsString() @MinLength(8) password!: string
  @IsArray() goals!: string[]
  @IsOptional() @IsString() customGoal?: string
  @IsOptional() @IsString() activationSessionId?: string
  @IsBoolean() privacyAgreed!: boolean
  @IsOptional() @IsString() consentVersion?: string
}

class GoalRevisionDto {
  @IsArray() newGoals!: string[]
  @IsString() @MinLength(2) reason!: string
}

class ParentConsentDto {
  @IsBoolean() enabled!: boolean
}

class CardStatusDto {
  @IsString() status!: 'active' | 'lost'
}

@Controller('students')
export class StudentsController {
  constructor(private readonly domain: DomainService, private readonly auth: AuthService) {}

  @Public()
  @Post('activate')
  async activate(@Body() body: ActivateStudentDto) {
    const result = await this.domain.activateStudent(body)
    return { ...result, ...(await this.auth.loginByUserId(result.userId)) }
  }

  @Get('me/state')
  state(@CurrentUser() user: AuthUser) {
    return this.domain.snapshot(user)
  }

  @Post('me/goals/revision')
  reviseGoal(@CurrentUser() user: AuthUser, @Body() body: GoalRevisionDto) {
    return this.domain.submitGoalRevision(user, body.newGoals, body.reason)
  }

  @Patch('me/parent-consent')
  parentConsent(@CurrentUser() user: AuthUser, @Body() body: ParentConsentDto) {
    return this.domain.setParentConsent(user, body.enabled)
  }

  @Patch('me/messages/:id/read')
  markMessageRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.domain.markMessageRead(user, id)
  }

  @Patch('me/cards/:idd/status')
  cardStatus(
    @CurrentUser() user: AuthUser,
    @Param('idd') idd: string,
    @Body() body: CardStatusDto,
  ) {
    return this.domain.updateCardStatus(user, idd, body.status)
  }
}
