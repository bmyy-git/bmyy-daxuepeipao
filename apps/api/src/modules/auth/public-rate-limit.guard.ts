import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { Request } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const buckets = new Map<string, Bucket>()

@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const limit = this.limitFor(request.method, request.path)
    if (!limit) return true

    const now = Date.now()
    const bucketPath = request.path.includes('/activation-sessions/')
      ? '/activation-sessions/:id'
      : request.path
    const key = `${request.ip || request.socket.remoteAddress || 'unknown'}:${request.method}:${bucketPath}`
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
      this.prune(now)
      return true
    }
    bucket.count += 1
    if (bucket.count > limit) {
      throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS)
    }
    return true
  }

  private limitFor(method: string, path: string) {
    if (method === 'POST' && ['/auth/login', '/auth/card-login', '/auth/demo-login'].some((item) => path.endsWith(item))) {
      return 10
    }
    if (method === 'GET' && path.endsWith('/nfc/resolve')) return 60
    if (method === 'POST' && ['/activation-sessions', '/students/activate', '/files/upload'].some((item) => path.endsWith(item))) {
      return 20
    }
    if (method === 'PATCH' && path.includes('/activation-sessions/')) return 30
    return 0
  }

  private prune(now: number) {
    if (buckets.size < 10_000) return
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }
}
