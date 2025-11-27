import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, ResendForgotPasswordDto } from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';

@ApiTags('Password Management')
@Controller('auth/password')
export class PasswordController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('resend-forgot')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendForgotPasswordOTP(@Body() resendDto: ResendForgotPasswordDto) {
    return this.authService.resendForgotPasswordOTP(resendDto);
  }

  @Post('reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }
}