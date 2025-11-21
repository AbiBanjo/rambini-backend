import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { UserProfileService } from '../services/user-profile.service';
import { User, UserType, UserStatus } from 'src/entities';
import { UpdateUserDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users V1')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createUser(@Body() userData: Partial<User>): Promise<User> {
    return await this.userService.createUser(userData);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUserProfile(@GetUser() user: User): Promise<User> {
    return await this.userProfileService.getUserProfile(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUser(@GetUser() user: User): Promise<User> {
    return await this.userService.findById(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or validation failed' })
  @ApiResponse({ status: 409, description: 'Email or phone number already taken' })
  async updateCurrentUser(@Body() updateData: UpdateUserDto, @GetUser() user: User): Promise<User> {
    return await this.userService.updateUser(user.id, updateData);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'User account marked for deletion. Can be reactivated within 30 days.' })
  @ApiResponse({ status: 400, description: 'Bad request - Account has balance or already marked for deletion' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteCurrentUser(@Body() deleteAccountDto: DeleteAccountDto, @GetUser() user: User): Promise<{ message: string }> {
    await this.userService.deleteUserAccount(user.id, deleteAccountDto.reason);
    return { message: 'Account marked for deletion. You have 30 days to reactivate your account if you change your mind.' };
  }

  @Post('me/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate deleted user account within 30 days' })
  @ApiResponse({ status: 200, description: 'User account reactivated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Account cannot be reactivated or grace period expired' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateCurrentUser(@GetUser() user: User): Promise<{ message: string; user: User }> {
    const reactivatedUser = await this.userService.reactivateAccount(user.id);
    return { 
      message: 'Account reactivated successfully', 
      user: reactivatedUser 
    };
  }

  @Post('profile/picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiResponse({ status: 200, description: 'Profile picture uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadProfilePicture(@UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        new FileTypeValidator({ fileType: /image\/.*$/ }),
      ],
      fileIsRequired: true, // Make file optional
    }),
  ) file: Express.Multer.File, @GetUser() user: User): Promise<User> {
    return await this.userProfileService.uploadProfilePicture(user.id, file);
  }

  @Post('verify-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark current user phone as verified' })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyPhone(@GetUser() user: User): Promise<User> {
    return await this.userService.markPhoneVerified(user.id);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark current user email as verified' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmail(@GetUser() user: User): Promise<User> {
    return await this.userService.markEmailVerified(user.id);
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark current user profile as completed' })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async completeProfile(@GetUser() user: User): Promise<User> {
    return await this.userService.completeProfile(user.id);
  }

  @Post('suspend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend current user' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendCurrentUser(@GetUser() user: User): Promise<User> {
    return await this.userService.suspendUser(user.id);
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate current user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateCurrentUser(@GetUser() user: User): Promise<User> {
    return await this.userService.activateUser(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveUsers(@GetUser() currentUser: User): Promise<User[]> {
    return await this.userService.findActiveUsers();
  }

  @Get('type/:userType')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users by type' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsersByType(@Param('userType') userType: UserType, @GetUser() currentUser: User): Promise<User[]> {
    return await this.userService.findUsersByType(userType);
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUserProfileById(@GetUser() user: User): Promise<User> {
    return await this.userProfileService.getUserProfile(user.id);
  }

  @Post('generate-otp')
  @ApiOperation({ summary: 'Generate OTP' })
  @ApiResponse({ status: 200, description: 'OTP generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async generateOTP(@Body() generateOTPRequest: {email: string}): Promise<{ otpId: string }> {
    return await this.userService.generateOTP(generateOTPRequest.email);
  }

  /**
   * More user endpoints has been added below by Engr., Isaiah Pius
   */
  @Delete('admin/delete/{userId}')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('userId') userId: string): Promise<void> {
    return await this.userService.deleteUser(userId);
  }
} 