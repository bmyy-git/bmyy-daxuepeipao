import { Role } from '@prisma/client'

export interface AuthUser {
  userId: string
  role: Role
  studentId?: string
  mentorId?: string
  parentRelationId?: string
}
