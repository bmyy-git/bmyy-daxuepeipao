import { Global, Module } from '@nestjs/common'
import { DomainService } from './domain.service'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService, DomainService],
  exports: [PrismaService, DomainService],
})
export class DomainModule {}
