import {
  BonusStatus,
  CardStatus,
  CardType,
  PrismaClient,
  Role,
  SopStatus,
  StudentStage,
  SubmissionStatus,
  TaskStatus,
} from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await hash('demo123456', 10)

  await prisma.auditLog.deleteMany()
  await prisma.aiLog.deleteMany()
  await prisma.document.deleteMany()
  await prisma.privacyConsent.deleteMany()
  await prisma.activationSession.deleteMany()
  await prisma.parentRelation.deleteMany()
  await prisma.bonusLedger.deleteMany()
  await prisma.honorRecord.deleteMany()
  await prisma.message.deleteMany()
  await prisma.growthEvent.deleteMany()
  await prisma.goalRevision.deleteMany()
  await prisma.periodReview.deleteMany()
  await prisma.checkin.deleteMany()
  await prisma.taskReview.deleteMany()
  await prisma.taskSubmission.deleteMany()
  await prisma.task.deleteMany()
  await prisma.sop.deleteMany()
  await prisma.nfcAccessLog.deleteMany()
  await prisma.cardBinding.deleteMany()
  await prisma.nfcCard.deleteMany()
  await prisma.student.deleteMany()
  await prisma.mentor.deleteMany()
  await prisma.user.deleteMany()

  const [adminUser, mentorUser, studentUser, parentUser] = await Promise.all([
    prisma.user.create({
      data: { id: 'user_admin', role: Role.ADMIN, email: 'admin@yayasmart.com', passwordHash },
    }),
    prisma.user.create({
      data: { id: 'user_mentor', role: Role.MENTOR, email: 'mentor@yayasmart.com', passwordHash },
    }),
    prisma.user.create({
      data: {
        id: 'user_student',
        role: Role.STUDENT,
        email: 'student@example.com',
        phone: '13800000000',
        passwordHash,
      },
    }),
    prisma.user.create({
      data: { id: 'user_parent', role: Role.PARENT, email: 'parent@example.com', passwordHash },
    }),
  ])

  const mentor = await prisma.mentor.create({
    data: {
      id: 'mentor_001',
      userId: mentorUser.id,
      name: '李明博士',
      title: '学业规划导师',
      avatar: '/img/yayasmart-logo-2A-900-900.png',
      tags: ['清北博士', '金牌教练', '科研规划'],
      expertise: ['保研', '竞赛', '科研启蒙'],
      email: 'mentor@yayasmart.com',
      wechat: 'YayaMentor01',
      meeting: '826-315-902',
      rating: 99,
      serviceCount: 326,
    },
  })

  const student = await prisma.student.create({
    data: {
      id: 'stu_001',
      userId: studentUser.id,
      name: '张同学',
      phone: '13800000000',
      email: 'student@example.com',
      school: '浙江大学',
      college: '计算机科学与技术学院',
      major: '计算机科学与技术',
      grade: '大一',
      goals: ['保研/推免', '竞赛成长'],
      customGoal: '',
      stage: StudentStage.ACTIVE,
      serviceMode: 'bet',
      streak: 18,
      parentConsent: true,
      parentScope: ['progress', 'honors', 'mentor_summary'],
      mentorId: mentor.id,
    },
  })

  await prisma.parentRelation.create({
    data: {
      id: 'parent_relation_001',
      parentUserId: parentUser.id,
      studentId: student.id,
      relationship: 'mother',
      consentScope: ['progress', 'honors', 'mentor_summary'],
      status: 'ACTIVE',
      verifiedAt: new Date(),
    },
  })

  const cards = await Promise.all([
    prisma.nfcCard.create({
      data: { idd: '04A1B2C3D4', idh: '00A1-0001', type: CardType.STUDENT_PRIMARY, label: '学生主卡', status: CardStatus.ACTIVE },
    }),
    prisma.nfcCard.create({
      data: { idd: '04A1B2C3E5', idh: '00A1-0002', type: CardType.STUDENT_SECONDARY, label: '钥匙扣副卡', status: CardStatus.ACTIVE },
    }),
    prisma.nfcCard.create({
      data: { idd: '04A1B2C3F6', idh: '00A1-0003', type: CardType.PARENT_FAMILY, label: '父母亲情卡', status: CardStatus.ACTIVE },
    }),
    prisma.nfcCard.create({
      data: { idd: '04NEWCARD01', idh: '00A1-0099', type: CardType.STUDENT_PRIMARY, label: '新生演示卡', status: CardStatus.UNBOUND },
    }),
  ])

  await prisma.cardBinding.createMany({
    data: [
      { cardId: cards[0].idd, studentId: student.id, subjectType: 'student', subjectId: student.id, cardType: cards[0].type, isPrimary: true },
      { cardId: cards[1].idd, studentId: student.id, subjectType: 'student', subjectId: student.id, cardType: cards[1].type, isPrimary: false },
      { cardId: cards[2].idd, studentId: student.id, subjectType: 'parent', subjectId: parentUser.id, cardType: cards[2].type, isPrimary: false },
    ],
  })

  const timeline = [
    { id: 's1', semester: '大一上', theme: '基础夯实', description: '稳定 GPA、通过四级、建立学习方法', progress: 68, status: 'current' },
    { id: 's2', semester: '大一下', theme: '能力拓展', description: '六级、算法基础、首次竞赛', progress: 20, status: 'future' },
    { id: 's3', semester: '大二', theme: '专业深入', description: '科研启蒙、核心竞赛、专业排名', progress: 0, status: 'future' },
    { id: 's4', semester: '大三', theme: '保研冲刺', description: '夏令营、科研成果、院校定位', progress: 0, status: 'future' },
    { id: 's5', semester: '大四', theme: '成果落地', description: '录取衔接、毕业设计、经验沉淀', progress: 0, status: 'future' },
  ]
  const sop = await prisma.sop.create({
    data: {
      id: 'sop_001',
      studentId: student.id,
      version: 'V1.0',
      status: SopStatus.CONFIRMED,
      summary: '四年学业陪跑路线图',
      content: { timeline, redLines: ['核心课程不得挂科', '保持无违纪记录'] },
      createdBy: 'mentor',
      confirmedBy: mentor.id,
      confirmedAt: new Date('2026-06-02T08:00:00+08:00'),
    },
  })

  const taskData = [
    {
      id: 'task_001',
      title: '完成数据结构第三章学习与作业',
      description: '完成教材第三章学习，整理核心概念，并提交作业与错题复盘。',
      category: '学业', priority: 'high', deadline: '2026-06-17', status: TaskStatus.DOING,
      criteria: ['提交完整作业', '整理至少 3 道错题', '写出本章知识总结'],
      mentorNote: '不要只追求完成，重点说明错误原因。',
    },
    {
      id: 'task_002',
      title: '报名校级程序设计竞赛',
      description: '完成报名并参加至少一次赛前训练。',
      category: '竞赛', priority: 'high', deadline: '2026-06-19', status: TaskStatus.CHANGES_REQUESTED,
      criteria: ['报名截图', '训练记录或代码仓库链接'],
      mentorNote: '第一次参赛以熟悉流程为主。',
    },
    {
      id: 'task_003',
      title: '完成英语四级词汇周计划',
      description: '本周完成 350 个核心词汇复习与两次自测。',
      category: '英语', priority: 'medium', deadline: '2026-06-21', status: TaskStatus.SUBMITTED,
      criteria: ['词汇打卡记录', '两次自测成绩均达到 80%'],
      mentorNote: '保持节奏，重视复习。',
    },
    {
      id: 'task_004',
      title: '了解学院推免规则',
      description: '阅读学院推免细则，整理 GPA、英语、竞赛与科研要求。',
      category: '规划', priority: 'medium', deadline: '2026-06-12', status: TaskStatus.ACCEPTED,
      criteria: ['形成一页规则摘要', '列出三个待确认问题'],
      mentorNote: '政策每年可能变化，以学院正式通知为准。',
    },
  ]

  for (const item of taskData) {
    await prisma.task.create({
      data: {
        ...item,
        deadline: new Date(`${item.deadline}T12:00:00+08:00`),
        studentId: student.id,
        sopId: sop.id,
        semester: '大一上',
      },
    })
  }

  const sub2 = await prisma.taskSubmission.create({
    data: {
      id: 'sub_001', taskId: 'task_002', studentId: student.id, version: 1,
      content: '已经完成报名。', evidenceLinks: [], fileNames: ['报名截图.png'],
      selfRating: 3, blockers: '', status: SubmissionStatus.CHANGES_REQUESTED,
      submittedAt: new Date('2026-06-14T10:00:00+08:00'),
    },
  })
  await prisma.taskReview.create({
    data: {
      submissionId: sub2.id, reviewerId: mentorUser.id, decision: 'request_changes',
      comment: '报名已确认，请补充一次训练记录或代码仓库链接。',
      requirements: ['训练记录或代码仓库链接'],
      reviewedAt: new Date('2026-06-14T18:00:00+08:00'),
    },
  })
  await prisma.taskSubmission.create({
    data: {
      id: 'sub_002', taskId: 'task_003', studentId: student.id, version: 1,
      content: '本周完成 360 个词汇，两次自测分别为 84% 和 88%。',
      evidenceLinks: [], fileNames: ['词汇打卡.pdf'], selfRating: 4,
      blockers: '长难词记忆仍不稳定', status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date('2026-06-15T09:30:00+08:00'),
    },
  })
  const sub4 = await prisma.taskSubmission.create({
    data: {
      id: 'sub_003', taskId: 'task_004', studentId: student.id, version: 1,
      content: '已整理推免规则和待确认事项。', evidenceLinks: [],
      fileNames: ['推免规则摘要.pdf'], selfRating: 5, blockers: '',
      status: SubmissionStatus.ACCEPTED,
      submittedAt: new Date('2026-06-11T16:00:00+08:00'),
    },
  })
  await prisma.taskReview.create({
    data: {
      submissionId: sub4.id, reviewerId: mentorUser.id, decision: 'accept',
      comment: '总结清晰，三个问题会在下次沟通中确认。', requirements: [],
      reviewedAt: new Date('2026-06-12T10:00:00+08:00'),
    },
  })

  await prisma.growthEvent.createMany({
    data: [
      { studentId: student.id, type: 'sop', title: 'SOP V1.0 正式生效', description: '导师确认四年路线图，进入日常陪跑阶段。', eventDate: new Date('2026-06-02') },
      { studentId: student.id, type: 'task', title: '完成推免规则调研', description: '形成学院推免规则摘要并通过导师验收。', eventDate: new Date('2026-06-12') },
      { studentId: student.id, type: 'honor', title: '解锁“规划先行”徽章', description: '完成首个规划类任务。', eventDate: new Date('2026-06-12') },
    ],
  })
  await prisma.message.createMany({
    data: [
      { studentId: student.id, fromRole: 'mentor', title: '任务补充要求', content: '程序设计竞赛报名任务请补充训练记录.', createdAt: new Date('2026-06-14T18:00:00+08:00') },
      { studentId: student.id, fromRole: 'system', title: '周复盘提醒', content: '本周复盘将在周日截止，请留出 10 分钟完成。', createdAt: new Date('2026-06-15T09:00:00+08:00') },
      { studentId: student.id, fromRole: 'parent', title: '来自家人的鼓励', content: '按自己的节奏来，我们一直支持你。', read: true, createdAt: new Date('2026-06-13T20:10:00+08:00') },
    ],
  })
  await prisma.honorRecord.createMany({
    data: [
      { id: 'h1', studentId: student.id, title: '规划先行', description: '完成首个规划类任务', status: 'earned', earnedAt: new Date('2026-06-12') },
      { id: 'h2', studentId: student.id, title: '连续行动 30 天', description: '连续完成每日行动 30 天', status: 'locked' },
      { id: 'h3', studentId: student.id, title: '竞赛初体验', description: '首次竞赛任务通过验收', status: 'locked' },
      { id: 'h4', studentId: student.id, title: '复盘达人', description: '完成 4 次周复盘', status: 'locked' },
    ],
  })
  await prisma.bonusLedger.createMany({
    data: [
      { studentId: student.id, amount: 2000, direction: 'income', status: BonusStatus.SETTLED, description: '已结算奖励' },
      { studentId: student.id, amount: 800, direction: 'income', status: BonusStatus.PENDING_REVIEW, description: '待审核奖励' },
    ],
  })

  console.log('Seed completed')
  console.log('Demo password: demo123456')
  console.log(`Admin user: ${adminUser.email}`)
}

main()
  .finally(async () => prisma.$disconnect())
