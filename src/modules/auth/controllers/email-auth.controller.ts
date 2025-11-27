import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto, VerifyEmailDto, ResendVerificationEmailDto } from '../dto';
import { Public } from '../decorators/public.decorator';

@ApiTags('Email Authentication')
@Controller('auth/email')
export class EmailAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerRequest: RegisterDto) {
    return this.authService.register(registerRequest);
  }

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(@Body() resendDto: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(resendDto.email, resendDto.otpId);
  }
}