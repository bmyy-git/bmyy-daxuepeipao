import { Body, Controller, Get, Post } from '@nestjs/common'
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from './current-user.decorator'
import { Public } from './public.decorator'
import { AuthService } from './auth.service'
import type { AuthUser } from './auth.types'

class LoginDto {
  @IsString()
  identifier!: string

  @IsString()
  @MinLength(6)
  password!: string
}

class CardLoginDto {
  @IsString()
  cardId!: string

  @IsOptional()
  @IsString()
  idh?: string

  @IsOptional()
  @IsString()
  batchCode?: string

  @IsString()
  @MinLength(6)
  password!: string
}

class DemoLoginDto {
  @IsIn(['student', 'mentor', 'parent', 'admin'])
  role!: 'student' | 'mentor' | 'parent' | 'admin'
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string

  @IsString()
  @MinLength(8)
  newPassword!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.identifier, body.password)
  }

  @Public()
  @Post('card-login')
  cardLogin(@Body() body: CardLoginDto) {
    return this.auth.cardLogin(body.cardId, body.password, body.idh, body.batchCode)
  }

  @Public()
  @Post('demo-login')
  demoLogin(@Body() body: DemoLoginDto) {
    return this.auth.demoLogin(body.role)
  }

  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(user.userId, body.currentPassword, body.newPassword)
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user
  }
}
