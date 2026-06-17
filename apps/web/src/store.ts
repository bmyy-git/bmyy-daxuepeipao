import { computed, reactive } from 'vue'
import { apiRequest, demoLogin, setToken } from './api'
import type {
  AppState,
  GoalRevision,
  PeriodReview,
  Role,
  Student,
  TaskSubmission,
} from './types'

const emptyState = (): AppState => ({
  currentRole: 'student',
  student: {
    id: '',
    name: '同学',
    phone: '',
    email: '',
    school: '',
    college: '',
    major: '',
    grade: '大一',
    goals: [],
    customGoal: '',
    stage: 'activating',
    mentorId: null,
    sopVersion: 'V0.1',
    serviceMode: null,
    streak: 0,
    parentConsent: false,
    parentScope: [],
  },
  mentor: {
    id: '',
    name: '导师匹配中',
    title: '学业规划导师',
    avatar: '/img/yayasmart-logo-2A-900-900.png',
    tags: [],
    expertise: [],
    email: '',
    wechat: '',
    meeting: '',
    rating: 0,
    serviceCount: 0,
  },
  tasks: [],
  sop: [],
  reviews: [],
  goalRevisions: [],
  growth: [],
  messages: [],
  cards: [],
  honors: [],
  bonus: { total: 0, pending: 0, settled: 0 },
  aiHistory: [],
})

const state = reactive<AppState>(emptyState())
const loading = reactive({ active: false, error: '' })
const ROLE_KEY = 'benmaoyaya_current_role'

const acceptedTasks = computed(() => state.tasks.filter((task) => task.status === 'accepted'))
const pendingSubmissions = computed(() =>
  state.tasks.flatMap((task) =>
    task.submissions
      .filter((submission) => submission.status === 'submitted')
      .map((submission) => ({ task, submission })),
  ),
)
const completionRate = computed(() =>
  state.tasks.length ? Math.round((acceptedTasks.value.length / state.tasks.length) * 100) : 0,
)
const urgentTasks = computed(() =>
  state.tasks.filter((task) => ['changes_requested', 'overdue'].includes(task.status)),
)

async function loadState(role = state.currentRole) {
  loading.active = true
  loading.error = ''
  try {
    const path =
      role === 'mentor' ? '/mentor/workspace'
        : role === 'parent' ? '/parent/observation'
          : role === 'admin' ? '/admin/state'
            : '/students/me/state'
    const snapshot = await apiRequest<AppState>(path)
    Object.assign(state, snapshot, { currentRole: role })
  } catch (error) {
    loading.error = error instanceof Error ? error.message : '加载失败'
    throw error
  } finally {
    loading.active = false
  }
}

async function authenticateRole(role: Role) {
  const result = await demoLogin(role)
  setToken(result.accessToken)
  sessionStorage.setItem(ROLE_KEY, role)
  state.currentRole = role
  await loadState(role)
}

async function init() {
  const rememberedRole = sessionStorage.getItem(ROLE_KEY) as Role | null
  if (rememberedRole) state.currentRole = rememberedRole
  try {
    await loadState(state.currentRole)
  } catch {
    await authenticateRole('student')
  }
}

async function setRole(role: Role) {
  await authenticateRole(role)
}

async function activateStudent(
  payload: Partial<Student> & {
    idd: string
    idh: string
    activationSessionId?: string
    privacyAgreed?: boolean
    consentVersion?: string
  },
) {
  const result = await apiRequest<{ accessToken: string }>('/students/activate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, '')
  setToken(result.accessToken)
  sessionStorage.setItem(ROLE_KEY, 'student')
  state.currentRole = 'student'
  await loadState('student')
}

async function createActivationSession(idd: string, idh: string) {
  return apiRequest<{ id: string }>('/activation-sessions', {
    method: 'POST',
    body: JSON.stringify({ cardId: idd, idh }),
  }, '')
}

async function uploadActivationFile(file: File, activationSessionId: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('activationSessionId', activationSessionId)
  return apiRequest('/files/upload', { method: 'POST', body: form }, '')
}

async function assignMentor() {
  const studentToken = sessionStorage.getItem('benmaoyaya_access_token') || ''
  const admin = await demoLogin('admin')
  await apiRequest(`/admin/students/${state.student.id}/assign-mentor`, {
    method: 'POST',
    body: JSON.stringify({ mentorId: 'mentor_001' }),
  }, admin.accessToken)
  setToken(studentToken)
  await loadState('student')
}

async function confirmMentorReady(mode: 'bet' | 'annual') {
  const studentToken = sessionStorage.getItem('benmaoyaya_access_token') || ''
  const mentor = await demoLogin('mentor')
  await apiRequest(`/mentor/students/${state.student.id}/sop/confirm`, {
    method: 'POST',
    body: JSON.stringify({ serviceMode: mode }),
  }, mentor.accessToken)
  setToken(studentToken)
  await loadState('student')
}

async function startTask(taskId: string) {
  await apiRequest(`/tasks/${taskId}/start`, { method: 'POST' })
  await loadState()
}

async function submitTask(
  taskId: string,
  payload: Pick<TaskSubmission, 'content' | 'links' | 'fileNames' | 'selfRating' | 'blockers'>,
) {
  await apiRequest(`/tasks/${taskId}/submissions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  await loadState()
}

async function reviewSubmission(
  _taskId: string,
  submissionId: string,
  decision: 'accept' | 'request_changes',
  comment: string,
) {
  await apiRequest(`/mentor/task-submissions/${submissionId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, comment }),
  })
  await loadState('mentor')
}

async function submitReview(payload: Omit<PeriodReview, 'id' | 'status' | 'createdAt'>) {
  await apiRequest('/reviews', { method: 'POST', body: JSON.stringify(payload) })
  await loadState()
}

async function feedbackReview(reviewId: string, feedback: string) {
  await apiRequest(`/mentor/reviews/${reviewId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
  await loadState('mentor')
}

async function submitGoalRevision(newGoals: string[], reason: string) {
  await apiRequest('/students/me/goals/revision', {
    method: 'POST',
    body: JSON.stringify({ newGoals, reason }),
  })
  await loadState()
}

async function reviewGoalRevision(id: string, approved: boolean) {
  await apiRequest(`/mentor/goal-revisions/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ approved }),
  })
  await loadState('mentor')
}

async function sendEncouragement(content: string) {
  await apiRequest('/parent/encouragements', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  await loadState('parent')
}

async function setParentConsent(enabled: boolean) {
  await apiRequest('/students/me/parent-consent', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
  await loadState('student')
}

async function updateCardStatus(idd: string, status: 'active' | 'lost') {
  const path =
    state.currentRole === 'admin'
      ? `/admin/nfc-cards/${idd}/status`
      : `/students/me/cards/${idd}/status`
  await apiRequest(path, { method: 'PATCH', body: JSON.stringify({ status }) })
  await loadState()
}

async function askAi(question: string) {
  const result = await apiRequest<{ answer: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
  await loadState()
  return result.answer
}

async function markMessageRead(id: string) {
  await apiRequest(`/students/me/messages/${id}/read`, { method: 'PATCH' })
  await loadState()
}

async function resetDemo() {
  await authenticateRole(state.currentRole)
}

function startNewJourney() {
  // The NFC resolver owns the real routing decision.
}

export const store = {
  state,
  loading,
  acceptedTasks,
  pendingSubmissions,
  completionRate,
  urgentTasks,
  init,
  loadState,
  setRole,
  activateStudent,
  createActivationSession,
  uploadActivationFile,
  assignMentor,
  confirmMentorReady,
  startTask,
  submitTask,
  reviewSubmission,
  submitReview,
  feedbackReview,
  submitGoalRevision,
  reviewGoalRevision,
  sendEncouragement,
  setParentConsent,
  updateCardStatus,
  askAi,
  markMessageRead,
  resetDemo,
  startNewJourney,
}
