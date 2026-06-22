import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { createHash, randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { extname, resolve } from 'path'
import type { Express } from 'express'
import { Prisma, Role } from '@prisma/client'
import { PrismaService } from '../../shared/prisma.service'
import type { AuthUser } from '../auth/auth.types'

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'])
const allowedMimes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
])

export function normalizeOriginalFileName(originalName: string) {
  const decodedName = decodePossiblyMojibakeFileName(originalName)
  const sanitized = decodedName
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim()
  return sanitized || 'document'
}

function decodePossiblyMojibakeFileName(fileName: string) {
  if (!/[ÃÂÄÅÆÇÈÉÏåäæçéèï]/.test(fileName)) return fileName
  const decoded = Buffer.from(fileName, 'latin1').toString('utf8')
  if (decoded.includes('\uFFFD')) return fileName
  return /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(decoded) ? decoded : fileName
}

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivationSession(cardId: string, idh?: string) {
    const card = await this.prisma.nfcCard.findUnique({ where: { idd: cardId } })
    if (!card || (idh && card.idh !== idh) || card.status !== 'UNBOUND') {
      throw new BadRequestException('卡片不可创建激活会话')
    }
    return this.prisma.activationSession.create({
      data: {
        cardId,
        idh: idh || card.idh,
        draft: {},
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    })
  }

  async saveDraft(sessionId: string, draft: Record<string, unknown>) {
    const session = await this.activeSession(sessionId)
    return this.prisma.activationSession.update({
      where: { id: session.id },
      data: { draft: draft as Prisma.InputJsonValue },
    })
  }

  async upload(file: Express.Multer.File, activationSessionId?: string, studentId?: string) {
    if (!file) throw new BadRequestException('请选择文件')
    const originalFileName = normalizeOriginalFileName(file.originalname)
    const max = Number(process.env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024
    if (file.size > max) throw new BadRequestException('文件超过大小限制')
    const extension = extname(originalFileName).toLowerCase()
    if (!allowedExtensions.has(extension) || !allowedMimes.has(file.mimetype)) {
      throw new BadRequestException('文件格式不支持')
    }
    if (!this.matchesMagic(file.buffer, extension)) throw new BadRequestException('文件内容与扩展名不一致')
    if (activationSessionId) await this.activeSession(activationSessionId)
    if (!activationSessionId && !studentId) throw new BadRequestException('文件缺少归属')
    const root = resolve(process.env.FILE_STORAGE_PATH || './uploads')
    await mkdir(root, { recursive: true })
    const storedFileName = `${randomUUID()}${extension}`
    const storagePath = resolve(root, storedFileName)
    if (!storagePath.startsWith(root)) throw new BadRequestException('非法文件路径')
    await writeFile(storagePath, file.buffer)
    const sha256 = createHash('sha256').update(file.buffer).digest('hex')
    return this.prisma.document.create({
      data: {
        studentId,
        activationSessionId,
        ownerType: studentId ? 'student' : 'activation_session',
        ownerId: studentId || activationSessionId!,
        originalFileName,
        storedFileName,
        mimeType: file.mimetype,
        fileSize: file.size,
        sha256,
        storagePath,
        status: 'UPLOADED',
      },
    })
  }

  async uploadForUser(file: Express.Multer.File, user: AuthUser) {
    const studentId = await this.studentIdFor(user)
    return this.upload(file, undefined, studentId)
  }

  async list(user: AuthUser) {
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      return this.prisma.document.findMany({
        select: {
          id: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          status: true,
          summary: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }
    const studentId = await this.studentIdFor(user)
    return this.prisma.document.findMany({
      where: { studentId },
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        status: true,
        summary: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async download(user: AuthUser, id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } })
    if (!document) throw new NotFoundException('文件不存在')
    const studentId = await this.studentIdFor(user)
    if (
      document.studentId !== studentId &&
      user.role !== Role.ADMIN &&
      user.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException()
    }
    return { document, data: await readFile(document.storagePath) }
  }

  private async activeSession(id: string) {
    const session = await this.prisma.activationSession.findUnique({ where: { id } })
    if (!session || session.status !== 'active' || session.expiresAt < new Date()) {
      throw new BadRequestException('激活会话已失效')
    }
    return session
  }

  private async studentIdFor(user: AuthUser) {
    if (user.studentId) return user.studentId
    if (user.mentorId) {
      const student = await this.prisma.student.findFirst({ where: { mentorId: user.mentorId } })
      if (student) return student.id
    }
    if (user.parentRelationId) {
      const relation = await this.prisma.parentRelation.findUnique({ where: { id: user.parentRelationId } })
      if (relation?.status === 'ACTIVE') return relation.studentId
    }
    const student = await this.prisma.student.findFirst()
    if (student && (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN)) return student.id
    throw new ForbiddenException()
  }

  private matchesMagic(buffer: Buffer, extension: string) {
    if (buffer.length < 4) return false
    if (extension === '.pdf') return buffer.subarray(0, 4).toString() === '%PDF'
    if (extension === '.jpg' || extension === '.jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8
    if (extension === '.png') return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    if (extension === '.doc') return buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))
    if (extension === '.docx') return buffer.subarray(0, 2).toString() === 'PK'
    return false
  }
}
