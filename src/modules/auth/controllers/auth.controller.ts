import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { 
  LoginDto, 
  VerifyOtpDto, 
  CompleteProfileDto, 
  ResendOtpDto, 
  RefreshTokenDto, 
  SendOtpDto,
  VerifyProfileOtpDto 
} from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/entities';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for phone authentication' })
  async verifyOTP(@Body() verifyRequest: VerifyOtpDto) {
    return this.authService.verifyOTP(verifyRequest);
  }

  @Post('send-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number for profile completion' })
  async sendOTP(
    @GetUser() user: User,
    @Body() sendOtpDto: SendOtpDto
  ) {
    return this.authService.sendProfileOTP(sendOtpDto.phoneNumber);
  }

  // ✅ NEW ENDPOINT - Verify OTP immediately for instant feedback
  @Post('verify-profile-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify OTP immediately before profile completion',
    description: 'Validates the OTP code and caches the result in Redis. This gives users instant feedback if their OTP is wrong, before they fill out the complete profile form.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP validation result',
    schema: {
      example: {
        valid: true,
        message: 'OTP verified successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid OTP code',
    schema: {
      example: {
        valid: false,
        message: 'Invalid or expired OTP code'
      }
    }
  })
  async verifyProfileOTP(
    @GetUser() user: User,
    @Body() verifyDto: VerifyProfileOtpDto // ✅ Use proper DTO
  ): Promise<{ valid: boolean; message: string }> {
    const validation = await this.authService.verifyProfileOTP(
      verifyDto.phoneNumber,
      verifyDto.otpCode
    );
    
    return {
      valid: validation.isValid,
      message: validation.isValid 
        ? 'OTP verified successfully' 
        : validation.error || 'Invalid OTP code'
    };
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete user profile with phone verification' })
  async completeProfile(
    @GetUser() user: User,
    @Body() profileRequest: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(user.id, profileRequest);
  }

  @Post('resend-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP code' })
  async resendOTP(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOTP(resendOtpDto.otpId);
  }

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
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
      phoneVerified: !!user.is_phone_verified,
    };
  }
}