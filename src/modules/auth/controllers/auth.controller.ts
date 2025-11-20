import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { 
  RegisterDto, 
  VerifyOtpDto, 
  CompleteProfileDto, 
  LoginDto, 
  ResendOtpDto, 
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  ResendForgotPasswordDto,
  GoogleAuthDto,
  AppleAuthDto
} from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerRequest: RegisterDto) {
    return this.authService.register(registerRequest);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() verifyRequest: VerifyOtpDto) {
    return this.authService.verifyOTP(verifyRequest);
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async completeProfile(
    @GetUser() user: User,
    @Body() profileRequest: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(user.id, profileRequest);
  }

  @Post('resend-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendOTP(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOTP(resendOtpDto.otpId);
  }

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@GetUser() user: User) {
    return {
      id: user.id,
      phoneNumber: user.phone_number,
      userType: user.user_type,
      profileCompleted: user.profile_completed,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      country: user.country,
      emailVerified: !!user.email_verified_at,
    };
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(@Body() resendVerificationEmailDto: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(resendVerificationEmailDto.email, resendVerificationEmailDto.otpId);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('resend-forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendForgotPasswordOTP(@Body() resendForgotPasswordDto: ResendForgotPasswordDto) {
    return this.authService.resendForgotPasswordOTP(resendForgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  async googleSignIn(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleSignIn(googleAuthDto);
  }

  @Post('apple')
  @Public()
  @HttpCode(HttpStatus.OK)
  async appleSignIn(@Body() appleAuthDto: AppleAuthDto) {
    return this.authService.appleSignIn(appleAuthDto);
  }
} 