import { normalizeOriginalFileName } from './files.service'

describe('file name normalization', () => {
  it('decodes UTF-8 file names that multer exposed as latin1 mojibake', () => {
    const mojibake = Buffer.from('会议记录 2026.doc', 'utf8').toString('latin1')

    expect(normalizeOriginalFileName(mojibake)).toBe('会议记录 2026.doc')
  })

  it('keeps normal non-ASCII latin file names intact', () => {
    expect(normalizeOriginalFileName('résumé 2026.doc')).toBe('résumé 2026.doc')
  })
})
