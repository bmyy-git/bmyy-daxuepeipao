import { TaskStatus } from '@prisma/client'

export function canSubmitTask(status: TaskStatus) {
  return (
    status === TaskStatus.TODO ||
    status === TaskStatus.DOING ||
    status === TaskStatus.CHANGES_REQUESTED ||
    status === TaskStatus.OVERDUE
  )
}

export function reviewedTaskStatus(decision: 'accept' | 'request_changes') {
  return decision === 'accept' ? TaskStatus.ACCEPTED : TaskStatus.CHANGES_REQUESTED
}

export function nextSopVersion(currentVersion?: string) {
  if (!currentVersion) return 'V1.0'
  const current = Number(currentVersion.match(/\d+/)?.[0] || 0)
  return `V${current + 1}.0`
}
