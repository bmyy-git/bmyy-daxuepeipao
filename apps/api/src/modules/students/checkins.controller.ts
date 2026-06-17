import { Body, Controller, Post } from '@nestjs/common'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { PrismaService } from '../../shared/prisma.service'

class CheckinDto {
  @IsOptional() @IsString() taskId?: string
  @IsString() @MinLength(1) content!: string
}

@Controller('checkins')
export class CheckinsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CheckinDto) {
    if (!user.studentId) throw new Error('student required')
    const checkin = await this.prisma.checkin.create({
      data: { studentId: user.studentId, taskId: body.taskId, content: body.content },
    })
    await this.prisma.student.update({
      where: { id: user.studentId },
      data: { streak: { increment: 1 } },
    })
    return checkin
  }
}
