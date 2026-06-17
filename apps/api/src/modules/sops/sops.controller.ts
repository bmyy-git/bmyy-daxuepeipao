import { Controller, Get } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { DomainService } from '../../shared/domain.service'

@Controller('sops')
export class SopsController {
  constructor(private readonly domain: DomainService) {}

  @Get('current')
  async current(@CurrentUser() user: AuthUser) {
    const state = await this.domain.snapshot(user)
    return { version: state.student.sopVersion, timeline: state.sop }
  }

  @Get('history')
  async history(@CurrentUser() user: AuthUser) {
    const state = await this.domain.snapshot(user)
    return [{ version: state.student.sopVersion, status: 'confirmed' }, { version: 'V0.1', status: 'archived' }]
  }
}
