import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'
import { AuthService } from './auth.service'
import { PublicRateLimitGuard } from './public-rate-limit.guard'

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET', '')
        const isProduction = config.get<string>('NODE_ENV') === 'production'
        if (isProduction && (
          secret.length < 32 ||
          secret === 'development-only-change-me-32-chars' ||
          secret.startsWith('replace-with-')
        )) {
          throw new Error('JWT_ACCESS_SECRET must be a unique random value of at least 32 characters in production')
        }
        return {
          secret: secret || 'development-only-change-me-32-chars',
          signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '2h') as never },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PublicRateLimitGuard },
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
