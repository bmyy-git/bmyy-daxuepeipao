import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Role } from '@prisma/client'
import { compare } from 'bcryptjs'
import { PrismaService } from '../../shared/prisma.service'
import type { AuthUser } from './auth.types'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { student: true, mentor: true, parentRelations: { where: { status: 'ACTIVE' }, take: 1 } },
    })
    if (!user || !user.active || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误')
    }
    return this.issue(user)
  }

  async demoLogin(role: 'student' | 'mentor' | 'parent' | 'admin') {
    const roleMap: Record<typeof role, Role> = {
      student: Role.STUDENT,
      mentor: Role.MENTOR,
      parent: Role.PARENT,
      admin: Role.ADMIN,
    }
    const user = await this.prisma.user.findFirst({
      where: { role: roleMap[role], active: true },
      include: { student: true, mentor: true, parentRelations: { where: { status: 'ACTIVE' }, take: 1 } },
    })
    if (!user) throw new UnauthorizedException(`未找到 ${role} 演示账号`)
    return this.issue(user)
  }

  async loginByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true, mentor: true, parentRelations: { where: { status: 'ACTIVE' }, take: 1 } },
    })
    if (!user) throw new UnauthorizedException('用户不存在')
    return this.issue(user)
  }

  private issue(user: {
    id: string
    role: Role
    student: { id: string } | null
    mentor: { id: string } | null
    parentRelations: { id: string }[]
  }) {
    const payload: AuthUser = {
      userId: user.id,
      role: user.role,
      studentId: user.student?.id,
      mentorId: user.mentor?.id,
      parentRelationId: user.parentRelations[0]?.id,
    }
    return {
      accessToken: this.jwt.sign(payload),
      user: payload,
    }
  }
}
