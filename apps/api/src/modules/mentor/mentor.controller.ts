import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { Role } from '@prisma/client'
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

class ReviewSubmissionDto {
  @IsIn(['accept', 'request_changes'])
  decision!: 'accept' | 'request_changes'
  @IsString() @MinLength(2) comment!: string
}

class ReviewFeedbackDto {
  @IsString() @MinLength(2) feedback!: string
}

class ReviewGoalDto {
  @IsBoolean() approved!: boolean
}

class ConfirmSopDto {
  @IsIn(['bet', 'annual'])
  serviceMode!: 'bet' | 'annual'
}

class CreateTaskDto {
  @IsString() title!: string
  @IsString() description!: string
  @IsString() category!: string
  @IsString() priority!: string
  @IsString() deadline!: string
  @IsArray() criteria!: string[]
  @IsString() semester!: string
  @IsOptional() @IsString() mentorNote?: string
}

class UpdateTaskDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() priority?: string
  @IsOptional() @IsString() deadline?: string
  @IsOptional() @IsArray() criteria?: string[]
  @IsOptional() @IsString() mentorNote?: string
}

@Roles(Role.MENTOR, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('mentor')
export class MentorController {
  constructor(private readonly domain: DomainService) {}

  @Get('workspace')
  workspace(@CurrentUser() user: AuthUser) {
    return this.domain.snapshot(user)
  }

  @Post('task-submissions/:id/review')
  reviewSubmission(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ReviewSubmissionDto,
  ) {
    return this.domain.reviewSubmission(user, id, body.decision, body.comment)
  }

  @Post('reviews/:id/feedback')
  feedback(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: ReviewFeedbackDto) {
    return this.domain.feedbackPeriodReview(user, id, body.feedback)
  }

  @Post('goal-revisions/:id/review')
  reviewGoal(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: ReviewGoalDto) {
    return this.domain.reviewGoalRevision(user, id, body.approved)
  }

  @Post('students/:studentId/sop/confirm')
  confirmSop(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
    @Body() body: ConfirmSopDto,
  ) {
    return this.domain.confirmSop(studentId, user.mentorId || user.userId, body.serviceMode)
  }

  @Post('students/:studentId/tasks')
  createTask(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
    @Body() body: CreateTaskDto,
  ) {
    return this.domain.createTask(user, studentId, body)
  }

  @Patch('tasks/:id')
  updateTask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.domain.updateTask(user, id, body)
  }
}
