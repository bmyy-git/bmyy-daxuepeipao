import { BadRequestException } from '@nestjs/common'
import { FilesService, normalizeOriginalFileName } from './files.service'

describe('file name normalization', () => {
  it('decodes UTF-8 file names that multer exposed as latin1 mojibake', () => {
    const mojibake = Buffer.from('会议记录 2026.doc', 'utf8').toString('latin1')

    expect(normalizeOriginalFileName(mojibake)).toBe('会议记录 2026.doc')
  })

  it('keeps normal non-ASCII latin file names intact', () => {
    expect(normalizeOriginalFileName('résumé 2026.doc')).toBe('résumé 2026.doc')
  })
})

describe('activation session security', () => {
  it('rejects a missing or mismatched card secret', async () => {
    const prisma = {
      nfcCard: { findUnique: jest.fn().mockResolvedValue({ idd: 'CARD-1', idh: 'SECRET', status: 'UNBOUND' }) },
      activationSession: { create: jest.fn() },
    }
    const service = new FilesService(prisma as never)

    await expect(service.createActivationSession('CARD-1', '')).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createActivationSession('CARD-1', 'WRONG')).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.activationSession.create).not.toHaveBeenCalled()
  })

  it('binds the session to the normalized card id and secret', async () => {
    const prisma = {
      nfcCard: { findUnique: jest.fn().mockResolvedValue({ idd: 'CARD-1', idh: 'SECRET', status: 'UNBOUND' }) },
      activationSession: { create: jest.fn().mockResolvedValue({ id: 'session-1' }) },
    }
    const service = new FilesService(prisma as never)

    await service.createActivationSession(' CARD-1 ', ' SECRET ')

    expect(prisma.activationSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cardId: 'CARD-1', idh: 'SECRET' }),
      select: { id: true, expiresAt: true },
    }))
  })
})
