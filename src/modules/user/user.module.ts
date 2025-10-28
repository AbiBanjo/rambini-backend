import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserProfileService } from './services/user-profile.service';
import { AddressService } from './services/address.service';
import { AccountCleanupService } from './services/account-cleanup.service';
import { AddressController } from './controllers/address.controller';
import { User, Address, CartItem, MenuItem, Vendor, Wallet } from 'src/entities';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Address, CartItem, MenuItem, Vendor, Wallet]),
    forwardRef(() => AuthModule),
    NotificationModule,
  ],
  controllers: [UserController, AddressController],
  providers: [UserService, UserProfileService, AddressService, AccountCleanupService],
  exports: [UserService, UserProfileService, AddressService, TypeOrmModule],
})
export class UserModule {} 