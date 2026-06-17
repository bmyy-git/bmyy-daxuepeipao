import { Body, Controller, Post } from '@nestjs/common'
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

class SubmitReviewDto {
  @IsString() period!: string
  @IsString() type!: string
  @IsString() @MinLength(2) wins!: string
  @IsOptional() @IsString() unfinished?: string
  @IsOptional() @IsString() blocker?: string
  @IsInt() @Min(1) @Max(5) mood!: number
  @IsOptional() @IsString() support?: string
  @IsOptional() @IsString() nextGoal?: string
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly domain: DomainService) {}

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() body: SubmitReviewDto) {
    return this.domain.submitPeriodReview(user, body)
  }
}
