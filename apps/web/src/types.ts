export type StudentStage =
  | 'activating'
  | 'pending_match'
  | 'mentor_matched'
  | 'sop_reviewing'
  | 'active'
  | 'paused'
  | 'graduated'

export type TaskStatus =
  | 'todo'
  | 'doing'
  | 'submitted'
  | 'changes_requested'
  | 'accepted'
  | 'overdue'
  | 'cancelled'

export type Role = 'student' | 'mentor' | 'parent' | 'admin'
export type CardStatus = 'active' | 'lost' | 'replaced' | 'revoked'

export interface Student {
  id: string
  name: string
  phone: string
  email: string
  school: string
  college: string
  major: string
  grade: string
  goals: string[]
  customGoal: string
  stage: StudentStage
  mentorId: string | null
  sopVersion: string
  serviceMode: 'bet' | 'annual' | null
  streak: number
  parentConsent: boolean
  parentScope: string[]
}

export interface Mentor {
  id: string
  name: string
  title: string
  avatar: string
  tags: string[]
  expertise: string[]
  email: string
  wechat: string
  meeting: string
  rating: number
  serviceCount: number
}

export interface TaskSubmission {
  id: string
  version: number
  content: string
  links: string[]
  fileNames: string[]
  selfRating: number
  blockers: string
  status: 'submitted' | 'changes_requested' | 'accepted'
  submittedAt: string
  reviewComment?: string
  reviewedAt?: string
}

export interface Task {
  id: string
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  deadline: string
  criteria: string[]
  semester: string
  status: TaskStatus
  submissions: TaskSubmission[]
  mentorNote: string
}

export interface SopPhase {
  id: string
  semester: string
  theme: string
  description: string
  progress: number
  status: 'done' | 'current' | 'future'
}

export interface PeriodReview {
  id: string
  period: string
  type: 'weekly' | 'monthly' | 'semester'
  wins: string
  unfinished: string
  blocker: string
  mood: number
  support: string
  nextGoal: string
  status: 'draft' | 'submitted' | 'mentor_feedback' | 'closed'
  mentorFeedback?: string
  createdAt: string
}

export interface GoalRevision {
  id: string
  oldGoals: string[]
  newGoals: string[]
  reason: string
  analysis: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface GrowthEvent {
  id: string
  type: 'task' | 'sop' | 'honor' | 'review' | 'goal' | 'bonus'
  title: string
  description: string
  date: string
}

export interface Message {
  id: string
  from: 'mentor' | 'parent' | 'system'
  title: string
  content: string
  date: string
  read: boolean
}

export interface Card {
  idd: string
  idh: string
  type: 'student_primary' | 'student_secondary' | 'parent_family'
  label: string
  status: CardStatus
  primary: boolean
}

export interface AppState {
  currentRole: Role
  student: Student
  mentor: Mentor
  tasks: Task[]
  sop: SopPhase[]
  reviews: PeriodReview[]
  goalRevisions: GoalRevision[]
  growth: GrowthEvent[]
  messages: Message[]
  cards: Card[]
  honors: { id: string; title: string; description: string; earned: boolean }[]
  bonus: { total: number; pending: number; settled: number }
  aiHistory: { id: string; question: string; answer: string; sources: string[] }[]
}
