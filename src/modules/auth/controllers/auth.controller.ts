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
  RefreshTokenDto 
} from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

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
    return this.authService.login(loginDto.phoneNumber);
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
    @Request() req,
    @Body() profileRequest: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(req.user.id, profileRequest);
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
  async getCurrentUser(@Request() req) {
    return {
      id: req.user.id,
      phoneNumber: req.user.phone_number,
      userType: req.user.user_type,
    };
  }
} 