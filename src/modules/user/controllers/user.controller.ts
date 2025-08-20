import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { UserProfileService } from '../services/user-profile.service';
import { User, UserType, UserStatus } from 'src/entities';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';

@ApiTags('users')
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
  async updateCurrentUser(@Body() updateData: Partial<User>, @GetUser() user: User): Promise<User> {
    return await this.userService.updateUser(user.id, updateData);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteCurrentUser(@GetUser() user: User): Promise<void> {
    return await this.userService.deleteUser(user.id);
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
} 