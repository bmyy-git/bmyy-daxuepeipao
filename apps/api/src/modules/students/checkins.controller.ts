import { Body, Controller, ForbiddenException, Post } from '@nestjs/common'
import { Role } from '@prisma/client'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { Roles } from '../auth/roles.decorator'
import { PrismaService } from '../../shared/prisma.service'

class CheckinDto {
  @IsOptional() @IsString() taskId?: string
  @IsString() @MinLength(1) content!: string
}

@Controller('checkins')
@Roles(Role.STUDENT)
export class CheckinsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CheckinDto) {
    if (!user.studentId) throw new ForbiddenException()
    if (body.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: body.taskId, studentId: user.studentId },
        select: { id: true },
      })
      if (!task) throw new ForbiddenException('不能关联其他学生的任务')
    }
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
