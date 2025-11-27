import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { GoogleAuthDto, AppleAuthDto } from '../dto';
import { Public } from '../decorators/public.decorator';

@ApiTags('Social Authentication')
@Controller('auth/social')
export class SocialAuthController {
  constructor(private readonly authService: AuthService) {}

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