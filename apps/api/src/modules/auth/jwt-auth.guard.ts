import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { PrismaService } from '../../shared/prisma.service'
import { IS_PUBLIC_KEY } from './public.decorator'
import type { AuthUser } from './auth.types'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true
    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>()
    const header = request.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    if (!token) throw new UnauthorizedException('请先登录')
    try {
      const payload = this.jwt.verify<AuthUser>(token)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          active: true,
          role: true,
          student: { select: { id: true } },
          mentor: { select: { id: true } },
          parentRelations: {
            where: { status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
        },
      })
      if (!user?.active || user.role !== payload.role) throw new Error('inactive or changed user')
      request.user = {
        userId: payload.userId,
        role: user.role,
        studentId: user.role === Role.STUDENT ? user.student?.id : undefined,
        mentorId: user.role === Role.MENTOR ? user.mentor?.id : undefined,
        parentRelationId: user.role === Role.PARENT ? user.parentRelations[0]?.id : undefined,
      }
      return true
    } catch {
      throw new UnauthorizedException('登录状态已失效')
    }
  }
}
