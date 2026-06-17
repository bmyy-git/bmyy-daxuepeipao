import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AdminModule } from './modules/admin/admin.module'
import { AiModule } from './modules/ai/ai.module'
import { AuthModule } from './modules/auth/auth.module'
import { FilesModule } from './modules/files/files.module'
import { MentorModule } from './modules/mentor/mentor.module'
import { NfcModule } from './modules/nfc/nfc.module'
import { ParentModule } from './modules/parent/parent.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { SopsModule } from './modules/sops/sops.module'
import { StudentsModule } from './modules/students/students.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { DomainModule } from './shared/domain.module'
import { HealthModule } from './modules/health/health.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DomainModule,
    AuthModule,
    NfcModule,
    StudentsModule,
    TasksModule,
    SopsModule,
    ReviewsModule,
    MentorModule,
    ParentModule,
    AdminModule,
    FilesModule,
    AiModule,
    HealthModule,
  ],
})
export class AppModule {}
