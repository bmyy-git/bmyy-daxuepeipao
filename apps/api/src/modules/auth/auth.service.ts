import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { CardStatus, CardType, Role, StudentStage } from '@prisma/client'
import { compare, hash } from 'bcryptjs'
import { PrismaService } from '../../shared/prisma.service'
import type { AuthUser } from './auth.types'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(identifier: string, password: string) {
    const normalized = identifier.trim()
    const user = await this.prisma.user.findFirst({
      where: {
        active: true,
        role: { in: [Role.MENTOR, Role.ADMIN, Role.SUPER_ADMIN] },
        OR: [{ email: normalized }, { phone: normalized }],
      },
      include: { student: true, mentor: true, parentRelations: { where: { status: 'ACTIVE' }, take: 1 } },
    })
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误')
    }
    return this.issue(user)
  }

  async cardLogin(cardId: string, password: string, idh?: string) {
    const card = await this.prisma.nfcCard.findUnique({
      where: { idd: cardId.trim() },
      include: {
        bindings: {
          where: { status: 'active' },
          include: { student: { include: { user: true } } },
          take: 1,
        },
      },
    })
    if (!card || (idh && card.idh !== idh.trim())) {
      throw new UnauthorizedException('卡号或密码错误')
    }
    if (card.status !== CardStatus.ACTIVE) {
      throw new ForbiddenException('该卡片当前不可用')
    }
    const binding = card.bindings[0]
    if (!binding) throw new UnauthorizedException('卡片尚未绑定')

    if (binding.cardType === CardType.PARENT_FAMILY) {
      const relation = await this.prisma.parentRelation.findFirst({
        where: {
          studentId: binding.studentId,
          status: 'ACTIVE',
          ...(binding.subjectType === 'parent' ? { parentUserId: binding.subjectId } : {}),
        },
        include: { parentUser: true, student: true },
      })
      if (!relation || !relation.student.parentConsent) throw new ForbiddenException('家长授权已失效')
      if (!relation.parentUser.active || !(await compare(password, relation.parentUser.passwordHash))) {
        throw new UnauthorizedException('卡号或密码错误')
      }
      return {
        ...this.issue({
          ...relation.parentUser,
          student: null,
          mentor: null,
          parentRelations: [{ id: relation.id }],
        }),
        redirectTo: 'parent',
      }
    }

    const user = binding.student.user
    if (!user.active || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('卡号或密码错误')
    }
    return {
      ...this.issue({
        ...user,
        student: { id: binding.student.id },
        mentor: null,
        parentRelations: [],
      }),
      redirectTo: this.studentRedirect(binding.student.stage),
    }
  }

  async demoLogin(role: 'student' | 'mentor' | 'parent' | 'admin') {
    if (process.env.ENABLE_DEMO_LOGIN !== 'true') {
      throw new ForbiddenException('演示登录未启用')
    }
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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.active || !(await compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('当前密码错误')
    }
    if (currentPassword === newPassword) throw new ForbiddenException('新密码不能与当前密码相同')
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(newPassword, 10) },
    })
    return { success: true }
  }

  async loginByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true, mentor: true, parentRelations: { where: { status: 'ACTIVE' }, take: 1 } },
    })
    if (!user) throw new UnauthorizedException('用户不存在')
    return this.issue(user)
  }

  private studentRedirect(stage: StudentStage) {
    const routeByStage: Record<StudentStage, string> = {
      ACTIVATING: 'activate',
      PENDING_MATCH: 'waiting',
      MENTOR_MATCHED: 'mentor-ready',
      SOP_REVIEWING: 'mentor-ready',
      ACTIVE: 'dashboard',
      PAUSED: 'error',
      GRADUATED: 'growth',
    }
    return routeByStage[stage]
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
