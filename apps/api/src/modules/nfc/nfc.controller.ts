import { Controller, Get, Ip, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { Public } from '../auth/public.decorator'
import { DomainService } from '../../shared/domain.service'

@Controller('nfc')
export class NfcController {
  constructor(private readonly domain: DomainService) {}

  @Public()
  @Get('resolve')
  resolve(
    @Query('idd') idd: string,
    @Query('idh') idh: string,
    @Query('id1') id1: string,
    @Query('id2') id2: string,
    @Query('batchCode') batchCode: string,
    @Query('batch') batch: string,
    @Ip() ip: string,
    @Req() request: Request,
  ) {
    return this.domain.resolveNfc(idd || id1, idh || id2, ip, request.headers['user-agent'], batchCode || batch)
  }
}
