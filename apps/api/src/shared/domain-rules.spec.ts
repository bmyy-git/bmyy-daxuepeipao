import { TaskStatus } from '@prisma/client'
import { canSubmitTask, nextSopVersion, reviewedTaskStatus } from './domain-rules'

describe('student lifecycle rules', () => {
  it('prevents students from bypassing mentor review', () => {
    expect(canSubmitTask(TaskStatus.DOING)).toBe(true)
    expect(canSubmitTask(TaskStatus.CHANGES_REQUESTED)).toBe(true)
    expect(canSubmitTask(TaskStatus.SUBMITTED)).toBe(false)
    expect(canSubmitTask(TaskStatus.ACCEPTED)).toBe(false)
  })

  it('maps mentor decisions to task states', () => {
    expect(reviewedTaskStatus('accept')).toBe(TaskStatus.ACCEPTED)
    expect(reviewedTaskStatus('request_changes')).toBe(TaskStatus.CHANGES_REQUESTED)
  })

  it('increments major SOP versions without overwriting history', () => {
    expect(nextSopVersion()).toBe('V1.0')
    expect(nextSopVersion('V1.0')).toBe('V2.0')
    expect(nextSopVersion('V12.0')).toBe('V13.0')
  })
})
