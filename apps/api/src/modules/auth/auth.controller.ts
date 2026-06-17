import { Body, Controller, Get, Post } from '@nestjs/common'
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator'
import { CurrentUser } from './current-user.decorator'
import { Public } from './public.decorator'
import { AuthService } from './auth.service'
import type { AuthUser } from './auth.types'

class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string
}

class DemoLoginDto {
  @IsIn(['student', 'mentor', 'parent', 'admin'])
  role!: 'student' | 'mentor' | 'parent' | 'admin'
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password)
  }

  @Public()
  @Post('demo-login')
  demoLogin(@Body() body: DemoLoginDto) {
    return this.auth.demoLogin(body.role)
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user
  }
}
