import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma.service'
import { Public } from '../auth/public.decorator'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() }
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      })
    }
  }
}
