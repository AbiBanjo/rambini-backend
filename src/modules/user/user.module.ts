// src/modules/user/user.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { AddressController } from './controllers/address.controller';

// Core User Services
import { UserService } from './services/user.service';
import { UserBaseService } from './services/user-base.service';
import { UserUpdateService } from './services/user-update.service';
import { UserDeletionService } from './services/user-deletion.service';
import { UserOTPService } from './services/user-otp.service';

// Profile Services
import { UserProfileService } from './services/user-profile.service';
import { UserProfileBaseService } from './services/profile/user-profile-base.service';
import { UserProfileUpdateService } from './services/profile/user-profile-update.service';
import { UserProfilePhoneService } from './services/profile/user-profile-phone.service';
import { UserProfilePictureService } from './services/profile/user-profile-picture.service';

// Other Services
import { AddressService } from './services/address.service';
import { AccountCleanupService } from './services/account-cleanup.service';

// Entities
import { User, Address, CartItem, MenuItem, Vendor, Wallet } from 'src/entities';

// Modules
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Address, CartItem, MenuItem, Vendor, Wallet]),
    forwardRef(() => AuthModule), // This provides OTPService
    forwardRef(() => NotificationModule),
  ],
  controllers: [UserController, AddressController],
  providers: [
    // Core User Services (Main facades)
    UserService,
    UserProfileService,
    
    // User Management Services
    UserBaseService,
    UserUpdateService,
    UserDeletionService,
    UserOTPService,
    
    // Profile Management Services
    UserProfileBaseService,
    UserProfileUpdateService,
    UserProfilePhoneService, // Now has OTPService injected from AuthModule
    UserProfilePictureService,
    
    // Supporting Services
    AddressService,
    AccountCleanupService,
  ],
  exports: [
    // Export main facade services
    UserService,
    UserProfileService,
    AddressService,
    
    // Export specialized services for direct use if needed
    UserBaseService,
    UserDeletionService,
    AccountCleanupService,
    
    TypeOrmModule,
  ],
})
export class UserModule {}