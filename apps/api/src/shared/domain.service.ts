import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  BonusStatus,
  CardStatus,
  Prisma,
  ReviewStatus,
  RevisionStatus,
  Role,
  SopStatus,
  StudentStage,
  SubmissionStatus,
  TaskStatus,
} from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { AuthUser } from '../modules/auth/auth.types'
import { PrismaService } from './prisma.service'
import { canSubmitTask, nextSopVersion, reviewedTaskStatus } from './domain-rules'

const lower = (value: string) => value.toLowerCase()
const jsonArray = (value: Prisma.JsonValue | null | undefined): string[] =>
  Array.isArray(value) ? value.map(String) : []

@Injectable()
export class DomainService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveNfc(rawIdd?: string, idh?: string, ip?: string, userAgent?: string) {
    const idd = (rawIdd || '').trim()
    idh = (idh || '').trim()
    if (!idd || !idh) {
      return { status: 'invalid_params', redirectTo: 'error', message: '卡片参数不完整' }
    }
    if (idd && !idh) {
      const card = await this.prisma.nfcCard.findUnique({
        where: { idd },
        include: {
          bindings: {
            where: { status: 'active' },
            include: { student: true },
            take: 1,
          },
        },
      })
      if (!card) {
        await this.logNfc(idd, '', 'card_not_found', ip, userAgent)
        return { status: 'card_not_found', redirectTo: 'error', message: '这张卡片还没有准备好' }
      }
      if (card.status !== CardStatus.ACTIVE && card.status !== CardStatus.UNBOUND) {
        await this.logNfc(idd, card.idh, lower(card.status), ip, userAgent)
        return { status: lower(card.status), redirectTo: 'error', message: '该卡片当前不可用' }
      }
      const binding = card.bindings[0]
      if (!binding) {
        await this.logNfc(idd, card.idh, 'unbound', ip, userAgent)
        return { status: 'unbound', redirectTo: 'activate', cardType: lower(card.type) }
      }
      if (binding.cardType === 'PARENT_FAMILY') {
        const relation = await this.prisma.parentRelation.findFirst({
          where: { studentId: binding.studentId, status: 'ACTIVE' },
        })
        const allowed = Boolean(relation && binding.student.parentConsent)
        await this.logNfc(idd, card.idh, allowed ? 'parent' : 'parent_revoked', ip, userAgent)
        return {
          status: allowed ? 'active' : 'revoked',
          redirectTo: allowed ? 'parent' : 'error',
          cardType: 'parent_family',
        }
      }
      const routeByStage: Record<StudentStage, string> = {
        ACTIVATING: 'activate',
        PENDING_MATCH: 'waiting',
        MENTOR_MATCHED: 'mentor-ready',
        SOP_REVIEWING: 'mentor-ready',
        ACTIVE: 'dashboard',
        PAUSED: 'error',
        GRADUATED: 'growth',
      }
      await this.logNfc(idd, card.idh, lower(binding.student.stage), ip, userAgent)
      return {
        status: lower(binding.student.stage),
        redirectTo: routeByStage[binding.student.stage],
        cardType: lower(binding.cardType),
      }
    }
    if (!idd || !idh) return { status: 'invalid_params', redirectTo: 'error', message: '卡片参数不完整' }
    const card = await this.prisma.nfcCard.findUnique({
      where: { idd },
      include: {
        bindings: {
          where: { status: 'active' },
          include: { student: true },
          take: 1,
        },
      },
    })
    if (!card || card.idh !== idh) {
      await this.logNfc(idd, idh, 'card_not_found', ip, userAgent)
      return { status: 'card_not_found', redirectTo: 'error', message: '这张卡片还没有准备好' }
    }
    if (card.status !== CardStatus.ACTIVE && card.status !== CardStatus.UNBOUND) {
      await this.logNfc(idd, idh, lower(card.status), ip, userAgent)
      return { status: lower(card.status), redirectTo: 'error', message: '该卡片当前不可用' }
    }
    const binding = card.bindings[0]
    if (!binding) {
      await this.logNfc(idd, idh, 'unbound', ip, userAgent)
      return { status: 'unbound', redirectTo: 'activate', cardType: lower(card.type) }
    }
    if (binding.cardType === 'PARENT_FAMILY') {
      const relation = await this.prisma.parentRelation.findFirst({
        where: { studentId: binding.studentId, status: 'ACTIVE' },
      })
      const allowed = Boolean(relation && binding.student.parentConsent)
      await this.logNfc(idd, idh, allowed ? 'parent' : 'parent_revoked', ip, userAgent)
      return {
        status: allowed ? 'active' : 'revoked',
        redirectTo: allowed ? 'parent' : 'error',
        cardType: 'parent_family',
      }
    }
    const routeByStage: Record<StudentStage, string> = {
      ACTIVATING: 'activate',
      PENDING_MATCH: 'waiting',
      MENTOR_MATCHED: 'mentor-ready',
      SOP_REVIEWING: 'mentor-ready',
      ACTIVE: 'dashboard',
      PAUSED: 'error',
      GRADUATED: 'growth',
    }
    await this.logNfc(idd, idh, lower(binding.student.stage), ip, userAgent)
    return {
      status: lower(binding.student.stage),
      redirectTo: routeByStage[binding.student.stage],
      cardType: lower(binding.cardType),
    }
  }

  private async logNfc(idd: string, idh: string, status: string, ip?: string, userAgent?: string) {
    await this.prisma.nfcAccessLog.create({
      data: {
        cardId: await this.prisma.nfcCard.findUnique({ where: { idd } }).then((card) => card?.idd),
        idh,
        resolvedStatus: status,
        ip,
        userAgent,
      },
    })
  }

  async snapshot(user: AuthUser) {
    const studentId = await this.resolveStudentId(user)
    return this.studentSnapshot(studentId, user.role)
  }

  async studentSnapshot(studentId: string, role: Role) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        mentor: true,
        tasks: {
          include: {
            submissions: {
              include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
              orderBy: { version: 'asc' },
            },
          },
          orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
        },
        sops: { orderBy: { createdAt: 'desc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
        goalRevisions: { orderBy: { createdAt: 'desc' } },
        growthEvents: { orderBy: { eventDate: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' } },
        cards: { where: { status: 'active' }, include: { card: true } },
        honors: { orderBy: { createdAt: 'asc' } },
        bonusLedger: true,
        aiLogs: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!student) throw new NotFoundException('学生不存在')
    const currentSop = student.sops.find((sop) => sop.status === SopStatus.CONFIRMED) || student.sops[0]
    const content = (currentSop?.content || {}) as Record<string, unknown>
    const timeline = Array.isArray(content.timeline) ? content.timeline : []
    const total = student.bonusLedger.reduce((sum, item) => sum + Number(item.amount), 0)
    const pending = student.bonusLedger
      .filter((item) => item.status !== BonusStatus.SETTLED && item.status !== BonusStatus.REJECTED)
      .reduce((sum, item) => sum + Number(item.amount), 0)
    const settled = student.bonusLedger
      .filter((item) => item.status === BonusStatus.SETTLED)
      .reduce((sum, item) => sum + Number(item.amount), 0)
    const snapshot = {
      currentRole: this.frontendRole(role),
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        email: student.email || '',
        school: student.school,
        college: student.college,
        major: student.major,
        grade: student.grade,
        goals: jsonArray(student.goals),
        customGoal: student.customGoal || '',
        stage: lower(student.stage),
        mentorId: student.mentorId,
        sopVersion: currentSop?.version || 'V0.1',
        serviceMode: student.serviceMode,
        streak: student.streak,
        parentConsent: student.parentConsent,
        parentScope: jsonArray(student.parentScope),
      },
      mentor: student.mentor
        ? {
            id: student.mentor.id,
            name: student.mentor.name,
            title: student.mentor.title,
            avatar: student.mentor.avatar,
            tags: jsonArray(student.mentor.tags),
            expertise: jsonArray(student.mentor.expertise),
            email: student.mentor.email,
            wechat: student.mentor.wechat,
            meeting: student.mentor.meeting,
            rating: student.mentor.rating,
            serviceCount: student.mentor.serviceCount,
          }
        : null,
      tasks: student.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        deadline: task.deadline.toISOString().slice(0, 10),
        criteria: jsonArray(task.criteria),
        semester: task.semester,
        status: lower(task.status),
        mentorNote: task.mentorNote,
        submissions: task.submissions.map((submission) => {
          const review = submission.reviews[0]
          return {
            id: submission.id,
            version: submission.version,
            content: submission.content,
            links: jsonArray(submission.evidenceLinks),
            fileNames: jsonArray(submission.fileNames),
            selfRating: submission.selfRating,
            blockers: submission.blockers,
            status: lower(submission.status),
            submittedAt: submission.submittedAt.toISOString(),
            reviewComment: review?.comment,
            reviewedAt: review?.reviewedAt.toISOString(),
          }
        }),
      })),
      sop: timeline,
      reviews: student.reviews.map((review) => ({
        id: review.id,
        period: review.period,
        type: review.type,
        wins: review.wins,
        unfinished: review.unfinished,
        blocker: review.blocker,
        mood: review.mood,
        support: review.support,
        nextGoal: review.nextGoal,
        status: lower(review.status),
        mentorFeedback: review.mentorFeedback,
        createdAt: review.createdAt.toISOString(),
      })),
      goalRevisions: student.goalRevisions.map((revision) => ({
        id: revision.id,
        oldGoals: jsonArray(revision.oldGoals),
        newGoals: jsonArray(revision.newGoals),
        reason: revision.reason,
        analysis: String((revision.aiAnalysis as Record<string, unknown>).summary || ''),
        status: lower(revision.status),
        createdAt: revision.createdAt.toISOString(),
      })),
      growth: student.growthEvents.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        date: event.eventDate.toISOString().slice(0, 10),
      })),
      messages: student.messages.map((message) => ({
        id: message.id,
        from: message.fromRole,
        title: message.title,
        content: message.content,
        date: message.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        read: message.read,
      })),
      cards: student.cards.map((binding) => ({
        idd: binding.card.idd,
        idh: binding.card.idh,
        type: lower(binding.cardType),
        label: binding.card.label,
        status: lower(binding.card.status),
        primary: binding.isPrimary,
      })),
      honors: student.honors.map((honor) => ({
        id: honor.id,
        title: honor.title,
        description: honor.description,
        earned: honor.status === 'earned',
      })),
      bonus: { total, pending, settled },
      aiHistory: student.aiLogs.map((log) => ({
        id: log.id,
        question: log.question,
        answer: log.answer,
        sources: jsonArray(log.sources),
      })),
    }
    if (role === Role.PARENT) {
      snapshot.student.phone = ''
      snapshot.student.email = ''
      snapshot.student.customGoal = ''
      snapshot.tasks = snapshot.tasks.filter((task) => task.status === 'accepted').map((task) => ({
        ...task,
        criteria: [],
        mentorNote: '',
        submissions: task.submissions.filter((submission) => submission.status === 'accepted').map((submission) => ({
          ...submission,
          links: [],
          fileNames: [],
          blockers: '',
        })),
      }))
      snapshot.reviews = []
      snapshot.goalRevisions = []
      snapshot.messages = []
      snapshot.cards = []
      snapshot.bonus = { total: 0, pending: 0, settled: 0 }
      snapshot.aiHistory = []
      if (snapshot.mentor) {
        snapshot.mentor.email = ''
        snapshot.mentor.wechat = ''
        snapshot.mentor.meeting = ''
      }
    }
    return snapshot
  }

  async activateStudent(body: {
    idd: string
    idh: string
    name: string
    phone: string
    email?: string
    school: string
    college: string
    major: string
    password: string
    goals: string[]
    customGoal?: string
    activationSessionId?: string
    privacyAgreed: boolean
    consentVersion?: string
  }) {
    const normalizedIdd = body.idd.trim()
    const normalizedIdh = body.idh.trim()
    const card = await this.prisma.nfcCard.findUnique({ where: { idd: normalizedIdd }, include: { bindings: true } })
    if (!card || !normalizedIdh || card.idh !== normalizedIdh) {
      throw new BadRequestException('卡片不存在或编号不匹配')
    }
    if (!body.privacyAgreed) throw new BadRequestException('必须同意隐私授权后才能激活')
    if (card.status !== CardStatus.UNBOUND || card.bindings.some((item) => item.status === 'active')) {
      throw new BadRequestException('卡片已经激活')
    }
    if (body.activationSessionId) {
      const session = await this.prisma.activationSession.findFirst({
        where: {
          id: body.activationSessionId,
          cardId: normalizedIdd,
          idh: normalizedIdh,
          status: 'active',
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      })
      if (!session) throw new BadRequestException('激活会话无效或不属于当前卡片')
    }
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.nfcCard.updateMany({
        where: { idd: normalizedIdd, status: CardStatus.UNBOUND },
        data: { status: CardStatus.ACTIVE },
      })
      if (!claimed.count) throw new BadRequestException('卡片已经激活')
      const user = await tx.user.create({
        data: {
          role: Role.STUDENT,
          phone: body.phone,
          email: body.email || undefined,
          passwordHash: await hash(body.password, 10),
        },
      })
      const student = await tx.student.create({
        data: {
          userId: user.id,
          name: body.name,
          phone: body.phone,
          email: body.email,
          school: body.school,
          college: body.college,
          major: body.major,
          grade: '大一',
          goals: body.goals,
          customGoal: body.customGoal,
          stage: StudentStage.PENDING_MATCH,
          parentScope: ['progress', 'honors', 'mentor_summary'],
        },
      })
      await tx.cardBinding.create({
        data: {
          cardId: card.idd,
          studentId: student.id,
          subjectType: 'student',
          subjectId: student.id,
          cardType: card.type,
          isPrimary: true,
        },
      })
      await tx.sop.create({
        data: {
          studentId: student.id,
          version: 'V0.1',
          status: SopStatus.DRAFT,
          summary: 'AI 初版规划草案正在生成',
          content: { timeline: [] },
          createdBy: 'ai',
        },
      })
      await tx.message.create({
        data: {
          studentId: student.id,
          fromRole: 'system',
          title: '激活成功',
          content: '资料已收到，正在生成初版规划并匹配导师。',
        },
      })
      await tx.privacyConsent.create({
        data: {
          studentId: student.id,
          consentVersion: body.consentVersion || 'V2.4',
          agreed: true,
        },
      })
      if (body.activationSessionId) {
        await tx.document.updateMany({
          where: { activationSessionId: body.activationSessionId },
          data: {
            studentId: student.id,
            ownerType: 'student',
            ownerId: student.id,
            activationSessionId: null,
          },
        })
        await tx.activationSession.update({
          where: { id: body.activationSessionId },
          data: { status: 'completed' },
        })
      }
      return { studentId: student.id, userId: user.id, stage: 'pending_match', redirectTo: 'waiting' }
    })
  }

  async assignMentor(studentId: string, mentorId: string, actor: AuthUser) {
    this.requireAdmin(actor)
    await this.prisma.$transaction([
      this.prisma.student.update({
        where: { id: studentId },
        data: { mentorId, stage: StudentStage.MENTOR_MATCHED },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: actor.userId,
          actorRole: actor.role,
          action: 'mentor.assign',
          resourceType: 'student',
          resourceId: studentId,
          detail: { mentorId },
        },
      }),
      this.prisma.message.create({
        data: {
          studentId,
          fromRole: 'system',
          title: '专属导师已就位',
          content: '请再次触碰 NFC 卡片查看导师信息。',
        },
      }),
    ])
    return { success: true }
  }

  async confirmSop(studentId: string, mentorId: string, serviceMode: 'bet' | 'annual') {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } })
    if (!student || student.mentorId !== mentorId) throw new ForbiddenException('该学生未分配给当前导师')
    const draft = await this.prisma.sop.findFirst({
      where: { studentId, status: { in: [SopStatus.DRAFT, SopStatus.REVIEWING] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!draft) throw new BadRequestException('没有可确认的 SOP 草案')
    const timeline = this.defaultTimeline()
    await this.prisma.$transaction(async (tx) => {
      await tx.sop.updateMany({
        where: { studentId, status: SopStatus.CONFIRMED },
        data: { status: SopStatus.ARCHIVED },
      })
      const sop = await tx.sop.update({
        where: { id: draft.id },
        data: {
          version: 'V1.0',
          status: SopStatus.CONFIRMED,
          summary: '四年学业陪跑路线图',
          content: { timeline, redLines: ['核心课程不得挂科', '保持无违纪记录'] },
          confirmedBy: mentorId,
          confirmedAt: new Date(),
        },
      })
      await tx.student.update({
        where: { id: studentId },
        data: { stage: StudentStage.ACTIVE, serviceMode },
      })
      if (!(await tx.task.count({ where: { studentId } }))) {
        await tx.task.createMany({ data: this.defaultTasks(studentId, sop.id) })
      }
      await tx.growthEvent.create({
        data: {
          studentId,
          type: 'sop',
          title: 'SOP V1.0 正式生效',
          description: '导师确认四年路线图，第一周行动任务已发布。',
        },
      })
    })
    return { success: true }
  }

  async startTask(user: AuthUser, taskId: string) {
    const studentId = await this.resolveStudentId(user)
    const task = await this.ownedTask(taskId, studentId)
    if (task.status !== TaskStatus.TODO) return { success: true }
    await this.prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.DOING } })
    return { success: true }
  }

  async submitTask(
    user: AuthUser,
    taskId: string,
    body: { content: string; links?: string[]; fileNames?: string[]; selfRating: number; blockers?: string },
  ) {
    const studentId = await this.resolveStudentId(user)
    const task = await this.ownedTask(taskId, studentId)
    if (!canSubmitTask(task.status)) {
      throw new BadRequestException('当前任务状态不可提交')
    }
    const version = (await this.prisma.taskSubmission.count({ where: { taskId } })) + 1
    await this.prisma.$transaction([
      this.prisma.taskSubmission.create({
        data: {
          taskId,
          studentId,
          version,
          content: body.content,
          evidenceLinks: body.links || [],
          fileNames: body.fileNames || [],
          selfRating: body.selfRating,
          blockers: body.blockers || '',
        },
      }),
      this.prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.SUBMITTED } }),
      this.prisma.message.create({
        data: {
          studentId,
          fromRole: 'system',
          title: '成果已提交',
          content: `“${task.title}”已提交导师验收。`,
        },
      }),
    ])
    return { success: true, version }
  }

  async reviewSubmission(
    user: AuthUser,
    submissionId: string,
    decision: 'accept' | 'request_changes',
    comment: string,
  ) {
    if (user.role !== Role.MENTOR && !this.isAdmin(user)) throw new ForbiddenException('仅导师可验收成果')
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: { include: { student: true } } },
    })
    if (!submission) throw new NotFoundException('成果提交不存在')
    if (user.role === Role.MENTOR && submission.task.student.mentorId !== user.mentorId) {
      throw new ForbiddenException('该学生未分配给当前导师')
    }
    const accepted = decision === 'accept'
    const nextStatus = reviewedTaskStatus(decision)
    await this.prisma.$transaction(async (tx) => {
      await tx.taskReview.create({
        data: {
          submissionId,
          reviewerId: user.userId,
          decision,
          comment,
          requirements: accepted ? [] : [comment],
        },
      })
      await tx.taskSubmission.update({
        where: { id: submissionId },
        data: { status: accepted ? SubmissionStatus.ACCEPTED : SubmissionStatus.CHANGES_REQUESTED },
      })
      await tx.task.update({
        where: { id: submission.taskId },
        data: { status: nextStatus },
      })
      await tx.message.create({
        data: {
          studentId: submission.studentId,
          fromRole: 'mentor',
          title: accepted ? '成果验收通过' : '成果需要补充',
          content: `${submission.task.title}：${comment}`,
        },
      })
      if (accepted) {
        await tx.growthEvent.create({
          data: {
            studentId: submission.studentId,
            type: 'task',
            title: `完成：${submission.task.title}`,
            description: comment,
          },
        })
        if (submission.task.category === '竞赛') {
          await tx.honorRecord.upsert({
            where: { id: `honor_competition_${submission.studentId}` },
            create: {
              id: `honor_competition_${submission.studentId}`,
              studentId: submission.studentId,
              title: '竞赛初体验',
              description: '首次竞赛任务通过验收',
              status: 'earned',
              earnedAt: new Date(),
            },
            update: { status: 'earned', earnedAt: new Date() },
          })
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          actorRole: user.role,
          action: accepted ? 'task.accept' : 'task.request_changes',
          resourceType: 'task_submission',
          resourceId: submissionId,
          detail: { comment },
        },
      })
    })
    return { success: true }
  }

  async submitPeriodReview(
    user: AuthUser,
    body: {
      period: string
      type: string
      wins: string
      unfinished?: string
      blocker?: string
      mood: number
      support?: string
      nextGoal?: string
    },
  ) {
    const studentId = await this.resolveStudentId(user)
    return this.prisma.periodReview.create({
      data: {
        studentId,
        period: body.period,
        type: body.type,
        wins: body.wins,
        unfinished: body.unfinished || '',
        blocker: body.blocker || '',
        mood: body.mood,
        support: body.support || '',
        nextGoal: body.nextGoal || '',
      },
    })
  }

  async feedbackPeriodReview(user: AuthUser, reviewId: string, feedback: string) {
    if (user.role !== Role.MENTOR && !this.isAdmin(user)) throw new ForbiddenException()
    const review = await this.prisma.periodReview.findUnique({
      where: { id: reviewId },
      include: { student: true },
    })
    if (!review) throw new NotFoundException('复盘不存在')
    if (user.role === Role.MENTOR && review.student.mentorId !== user.mentorId) throw new ForbiddenException()
    await this.prisma.$transaction([
      this.prisma.periodReview.update({
        where: { id: reviewId },
        data: { mentorFeedback: feedback, status: ReviewStatus.CLOSED },
      }),
      this.prisma.growthEvent.create({
        data: {
          studentId: review.studentId,
          type: 'review',
          title: `${review.period}复盘完成`,
          description: feedback,
        },
      }),
    ])
    return { success: true }
  }

  async submitGoalRevision(user: AuthUser, newGoals: string[], reason: string) {
    const studentId = await this.resolveStudentId(user)
    const student = await this.prisma.student.findUniqueOrThrow({ where: { id: studentId } })
    return this.prisma.goalRevision.create({
      data: {
        studentId,
        oldGoals: jsonArray(student.goals),
        newGoals,
        reason,
        aiAnalysis: {
          summary: `从“${jsonArray(student.goals).join('、')}”调整为“${newGoals.join('、')}”后，需要重新评估任务优先级。`,
        },
      },
    })
  }

  async reviewGoalRevision(user: AuthUser, revisionId: string, approved: boolean) {
    if (user.role !== Role.MENTOR && !this.isAdmin(user)) throw new ForbiddenException()
    const revision = await this.prisma.goalRevision.findUnique({
      where: { id: revisionId },
      include: { student: true },
    })
    if (!revision) throw new NotFoundException('目标修订不存在')
    if (user.role === Role.MENTOR && revision.student.mentorId !== user.mentorId) throw new ForbiddenException()
    await this.prisma.$transaction(async (tx) => {
      await tx.goalRevision.update({
        where: { id: revisionId },
        data: {
          status: approved ? RevisionStatus.APPROVED : RevisionStatus.REJECTED,
          reviewedBy: user.userId,
          reviewedAt: new Date(),
        },
      })
      if (!approved) return
      const current = await tx.sop.findFirst({
        where: { studentId: revision.studentId, status: SopStatus.CONFIRMED },
        orderBy: { createdAt: 'desc' },
      })
      if (current) await tx.sop.update({ where: { id: current.id }, data: { status: SopStatus.ARCHIVED } })
      const version = nextSopVersion(current?.version)
      await tx.sop.create({
        data: {
          studentId: revision.studentId,
          version,
          status: SopStatus.CONFIRMED,
          summary: '目标修订后的四年路线图',
          content: current?.content || { timeline: this.defaultTimeline() },
          createdBy: 'mentor',
          confirmedBy: user.mentorId || user.userId,
          confirmedAt: new Date(),
        },
      })
      await tx.student.update({
        where: { id: revision.studentId },
        data: { goals: jsonArray(revision.newGoals) },
      })
      await tx.growthEvent.create({
        data: {
          studentId: revision.studentId,
          type: 'goal',
          title: `目标修订已确认，${version} 生效`,
          description: revision.reason,
        },
      })
    })
    return { success: true }
  }

  async sendEncouragement(user: AuthUser, content: string) {
    if (user.role !== Role.PARENT) throw new ForbiddenException()
    const relation = await this.prisma.parentRelation.findUnique({ where: { id: user.parentRelationId } })
    if (!relation || relation.status !== 'ACTIVE') throw new ForbiddenException('亲情关系已失效')
    await this.prisma.message.create({
      data: { studentId: relation.studentId, fromRole: 'parent', title: '来自家人的鼓励', content },
    })
    return { success: true }
  }

  async setParentConsent(user: AuthUser, enabled: boolean) {
    const studentId = await this.resolveStudentId(user)
    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: studentId }, data: { parentConsent: enabled } })
      await tx.parentRelation.updateMany({
        where: { studentId },
        data: {
          status: enabled ? 'ACTIVE' : 'REVOKED',
          revokedAt: enabled ? null : new Date(),
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          actorRole: user.role,
          action: enabled ? 'parent_consent.enable' : 'parent_consent.revoke',
          resourceType: 'student',
          resourceId: studentId,
          detail: {},
        },
      })
    })
    return { success: true }
  }

  async updateCardStatus(user: AuthUser, idd: string, status: 'active' | 'lost') {
    if (!this.isAdmin(user) && user.role !== Role.STUDENT) throw new ForbiddenException()
    if (user.role === Role.STUDENT) {
      const binding = await this.prisma.cardBinding.findFirst({
        where: { cardId: idd, studentId: user.studentId, status: 'active' },
      })
      if (!binding) throw new ForbiddenException()
    }
    await this.prisma.$transaction([
      this.prisma.nfcCard.update({
        where: { idd },
        data: { status: status === 'active' ? CardStatus.ACTIVE : CardStatus.LOST },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: user.userId,
          actorRole: user.role,
          action: status === 'active' ? 'card.restore' : 'card.report_lost',
          resourceType: 'nfc_card',
          resourceId: idd,
          detail: {},
        },
      }),
    ])
    return { success: true }
  }

  async markMessageRead(user: AuthUser, messageId: string) {
    const studentId = await this.resolveStudentId(user)
    const result = await this.prisma.message.updateMany({
      where: { id: messageId, studentId },
      data: { read: true },
    })
    if (!result.count) throw new NotFoundException('消息不存在')
    return { success: true }
  }

  async askAi(user: AuthUser, question: string) {
    const studentId = await this.resolveStudentId(user)
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { sops: { where: { status: SopStatus.CONFIRMED }, take: 1 } },
    })
    const configured = process.env.DIFY_API_BASE_URL && process.env.DIFY_API_KEY
    let answer: string
    let sources: string[]
    if (configured) {
      const response = await fetch(`${process.env.DIFY_API_BASE_URL}/chat-messages`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            student_id: student.id,
            school: student.school,
            major: student.major,
            goals: jsonArray(student.goals).join('、'),
          },
          query: question,
          response_mode: 'blocking',
          user: student.id,
        }),
      })
      if (!response.ok) throw new BadRequestException('AI 服务暂时不可用')
      const data = (await response.json()) as { answer?: string }
      answer = data.answer || '暂时没有找到可靠答案，建议转导师确认。'
      sources = ['Dify 知识库']
    } else {
      answer = question.includes('保研')
        ? '当前应优先稳定 GPA，并核对学院推免细则中的排名、英语和科研要求。本周建议先完成推免规则摘要，再与导师确认疑点。'
        : '建议先处理被退回和临近截止的任务，再安排新的学习目标。'
      sources = ['演示知识库', student.sops[0]?.version || '当前 SOP']
    }
    const log = await this.prisma.aiLog.create({
      data: {
        studentId,
        userId: user.userId,
        scenario: 'chat',
        question,
        answer,
        sources,
      },
    })
    return { id: log.id, answer, sources }
  }

  async adminOverview(user: AuthUser) {
    this.requireAdmin(user)
    const [students, mentors, cards, auditLogs] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.mentor.count(),
      this.prisma.nfcCard.count(),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ])
    return { students, mentors, cards, auditLogs }
  }

  async generateCards(
    user: AuthUser,
    count: number,
    cardType: 'student_primary' | 'student_secondary' | 'parent_family' | 'staff',
  ) {
    this.requireAdmin(user)
    if (count < 1 || count > 500) throw new BadRequestException('单次制卡数量应为 1-500')
    const typeMap = {
      student_primary: 'STUDENT_PRIMARY',
      student_secondary: 'STUDENT_SECONDARY',
      parent_family: 'PARENT_FAMILY',
      staff: 'STAFF',
    } as const
    const cards = Array.from({ length: count }, (_, index) => {
      const suffix = randomBytes(8).toString('hex').toUpperCase()
      const secret = randomBytes(8).toString('hex').toUpperCase()
      return {
        idd: `AUTO${suffix}`,
        idh: `${secret.slice(0, 8)}-${secret.slice(8)}`,
        type: typeMap[cardType],
        label: `${cardType}-${index + 1}`,
        status: CardStatus.UNBOUND,
      }
    })
    await this.prisma.nfcCard.createMany({ data: cards })
    return cards
  }

  async importCards(
    user: AuthUser,
    cards: { idd: string; idh: string; type: 'student_primary' | 'student_secondary' | 'parent_family' | 'staff'; label: string }[],
  ) {
    this.requireAdmin(user)
    const typeMap = {
      student_primary: 'STUDENT_PRIMARY',
      student_secondary: 'STUDENT_SECONDARY',
      parent_family: 'PARENT_FAMILY',
      staff: 'STAFF',
    } as const
    await this.prisma.nfcCard.createMany({
      data: cards.map((card) => ({ ...card, type: typeMap[card.type], status: CardStatus.UNBOUND })),
      skipDuplicates: true,
    })
    return { success: true }
  }

  async bindCard(
    user: AuthUser,
    idd: string,
    body: {
      studentId: string
      cardType: 'student_primary' | 'student_secondary' | 'parent_family'
      subjectType?: string
      subjectId?: string
      isPrimary?: boolean
    },
  ) {
    this.requireAdmin(user)
    const card = await this.prisma.nfcCard.findUnique({ where: { idd } })
    if (!card || card.status !== CardStatus.UNBOUND) throw new BadRequestException('卡片不可绑定')
    if (body.isPrimary) {
      await this.prisma.cardBinding.updateMany({
        where: { studentId: body.studentId, isPrimary: true, status: 'active' },
        data: { isPrimary: false },
      })
    }
    await this.prisma.$transaction([
      this.prisma.cardBinding.create({
        data: {
          cardId: idd,
          studentId: body.studentId,
          subjectType: body.subjectType || 'student',
          subjectId: body.subjectId || body.studentId,
          cardType: card.type,
          isPrimary: Boolean(body.isPrimary),
        },
      }),
      this.prisma.nfcCard.update({ where: { idd }, data: { status: CardStatus.ACTIVE } }),
      this.prisma.auditLog.create({
        data: {
          actorId: user.userId,
          actorRole: user.role,
          action: 'card.bind',
          resourceType: 'nfc_card',
          resourceId: idd,
          detail: body,
        },
      }),
    ])
    return { success: true }
  }

  async replaceCard(
    user: AuthUser,
    oldIdd: string,
    body: { newIdd: string; newIdh: string; label?: string },
  ) {
    this.requireAdmin(user)
    const oldBinding = await this.prisma.cardBinding.findFirst({
      where: { cardId: oldIdd, status: 'active' },
      include: { card: true },
    })
    if (!oldBinding) throw new NotFoundException('原卡没有有效绑定')
    await this.prisma.$transaction(async (tx) => {
      await tx.nfcCard.update({ where: { idd: oldIdd }, data: { status: CardStatus.REPLACED } })
      await tx.cardBinding.update({
        where: { id: oldBinding.id },
        data: { status: 'ended', endedAt: new Date(), isPrimary: false },
      })
      const newCard = await tx.nfcCard.create({
        data: {
          idd: body.newIdd,
          idh: body.newIdh,
          type: oldBinding.cardType,
          label: body.label || oldBinding.card.label,
          status: CardStatus.ACTIVE,
        },
      })
      await tx.cardBinding.create({
        data: {
          cardId: newCard.idd,
          studentId: oldBinding.studentId,
          subjectType: oldBinding.subjectType,
          subjectId: oldBinding.subjectId,
          cardType: oldBinding.cardType,
          isPrimary: oldBinding.isPrimary || oldBinding.cardType === 'STUDENT_PRIMARY',
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          actorRole: user.role,
          action: 'card.replace',
          resourceType: 'nfc_card',
          resourceId: oldIdd,
          detail: { newIdd: body.newIdd },
        },
      })
    })
    return { success: true }
  }

  async setPrimaryCard(user: AuthUser, idd: string) {
    this.requireAdmin(user)
    const binding = await this.prisma.cardBinding.findFirst({ where: { cardId: idd, status: 'active' } })
    if (!binding) throw new NotFoundException('卡片绑定不存在')
    await this.prisma.$transaction([
      this.prisma.cardBinding.updateMany({
        where: { studentId: binding.studentId, status: 'active', isPrimary: true },
        data: { isPrimary: false },
      }),
      this.prisma.cardBinding.update({ where: { id: binding.id }, data: { isPrimary: true } }),
    ])
    return { success: true }
  }

  async unbindCard(user: AuthUser, idd: string) {
    this.requireAdmin(user)
    const binding = await this.prisma.cardBinding.findFirst({ where: { cardId: idd, status: 'active' } })
    if (!binding) throw new NotFoundException('卡片绑定不存在')
    await this.prisma.$transaction([
      this.prisma.cardBinding.update({
        where: { id: binding.id },
        data: { status: 'ended', endedAt: new Date(), isPrimary: false },
      }),
      this.prisma.nfcCard.update({ where: { idd }, data: { status: CardStatus.UNBOUND } }),
    ])
    return { success: true }
  }

  async createTask(
    user: AuthUser,
    studentId: string,
    body: {
      title: string
      description: string
      category: string
      priority: string
      deadline: string
      criteria: string[]
      semester: string
      mentorNote?: string
    },
  ) {
    if (user.role !== Role.MENTOR && !this.isAdmin(user)) throw new ForbiddenException()
    const student = await this.prisma.student.findUnique({ where: { id: studentId } })
    if (!student || (user.role === Role.MENTOR && student.mentorId !== user.mentorId)) throw new ForbiddenException()
    const sop = await this.prisma.sop.findFirst({
      where: { studentId, status: SopStatus.CONFIRMED },
      orderBy: { createdAt: 'desc' },
    })
    if (!sop) throw new BadRequestException('学生尚无生效 SOP')
    return this.prisma.task.create({
      data: {
        studentId,
        sopId: sop.id,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority,
        deadline: new Date(body.deadline),
        criteria: body.criteria,
        semester: body.semester,
        mentorNote: body.mentorNote || '',
      },
    })
  }

  async updateTask(
    user: AuthUser,
    taskId: string,
    body: Partial<{
      title: string
      description: string
      priority: string
      deadline: string
      criteria: string[]
      mentorNote: string
      status: TaskStatus
    }>,
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { student: true } })
    if (!task || (user.role === Role.MENTOR && task.student.mentorId !== user.mentorId)) throw new ForbiddenException()
    if (user.role !== Role.MENTOR && !this.isAdmin(user)) throw new ForbiddenException()
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
        criteria: body.criteria,
        mentorNote: body.mentorNote,
        status: body.status,
      },
    })
  }

  private async resolveStudentId(user: AuthUser): Promise<string> {
    if (user.role === Role.STUDENT && user.studentId) return user.studentId
    if (user.role === Role.PARENT && user.parentRelationId) {
      const relation = await this.prisma.parentRelation.findUnique({ where: { id: user.parentRelationId } })
      if (!relation || relation.status !== 'ACTIVE') throw new ForbiddenException('亲情关系已失效')
      const student = await this.prisma.student.findUniqueOrThrow({ where: { id: relation.studentId } })
      if (!student.parentConsent) throw new ForbiddenException('学生已撤回授权')
      return relation.studentId
    }
    if (user.role === Role.MENTOR && user.mentorId) {
      const student = await this.prisma.student.findFirst({ where: { mentorId: user.mentorId } })
      if (!student) throw new NotFoundException('暂无负责学生')
      return student.id
    }
    if (this.isAdmin(user)) {
      const student = await this.prisma.student.findFirst()
      if (!student) throw new NotFoundException('暂无学生')
      return student.id
    }
    throw new ForbiddenException()
  }

  private async ownedTask(taskId: string, studentId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, studentId } })
    if (!task) throw new NotFoundException('任务不存在')
    return task
  }

  private frontendRole(role: Role) {
    if (role === Role.STUDENT) return 'student'
    if (role === Role.MENTOR) return 'mentor'
    if (role === Role.PARENT) return 'parent'
    return 'admin'
  }

  private isAdmin(user: AuthUser) {
    return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
  }

  private requireAdmin(user: AuthUser) {
    if (!this.isAdmin(user)) throw new ForbiddenException('需要管理员权限')
  }

  private defaultTimeline() {
    return [
      { id: 's1', semester: '大一上', theme: '基础夯实', description: '稳定 GPA、通过四级、建立学习方法', progress: 20, status: 'current' },
      { id: 's2', semester: '大一下', theme: '能力拓展', description: '六级、算法基础、首次竞赛', progress: 0, status: 'future' },
      { id: 's3', semester: '大二', theme: '专业深入', description: '科研启蒙、核心竞赛、专业排名', progress: 0, status: 'future' },
      { id: 's4', semester: '大三', theme: '保研冲刺', description: '夏令营、科研成果、院校定位', progress: 0, status: 'future' },
      { id: 's5', semester: '大四', theme: '成果落地', description: '录取衔接、毕业设计、经验沉淀', progress: 0, status: 'future' },
    ]
  }

  private defaultTasks(studentId: string, sopId: string): Prisma.TaskCreateManyInput[] {
    const tasks = [
      ['完成数据结构第三章学习与作业', '完成教材第三章学习，整理核心概念，并提交作业与错题复盘。', '学业', 'high', ['提交完整作业', '整理至少 3 道错题', '写出本章知识总结'], '不要只追求完成，重点说明错误原因。'],
      ['报名校级程序设计竞赛', '完成报名并参加至少一次赛前训练。', '竞赛', 'high', ['报名截图', '训练记录或代码仓库链接'], '第一次参赛以熟悉流程为主。'],
      ['完成英语四级词汇周计划', '本周完成 350 个核心词汇复习与两次自测。', '英语', 'medium', ['词汇打卡记录', '两次自测成绩均达到 80%'], '保持节奏，重视复习。'],
      ['了解学院推免规则', '阅读学院推免细则，整理 GPA、英语、竞赛与科研要求。', '规划', 'medium', ['形成一页规则摘要', '列出三个待确认问题'], '政策每年可能变化，以学院正式通知为准。'],
    ] as const
    return tasks.map((task, index) => ({
      studentId,
      sopId,
      title: task[0],
      description: task[1],
      category: task[2],
      priority: task[3],
      deadline: new Date(Date.now() + (index + 2) * 86400000),
      criteria: [...task[4]],
      semester: '大一上',
      status: index === 0 ? TaskStatus.DOING : TaskStatus.TODO,
      mentorNote: task[5],
    }))
  }
}
