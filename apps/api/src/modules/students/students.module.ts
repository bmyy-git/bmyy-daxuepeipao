import { Module } from '@nestjs/common'
import { StudentsController } from './students.controller'
import { CheckinsController } from './checkins.controller'
import { AuthModule } from '../auth/auth.module'

@Module({ imports: [AuthModule], controllers: [StudentsController, CheckinsController] })
export class StudentsModule {}
