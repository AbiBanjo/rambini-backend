import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserProfileService } from './services/user-profile.service';
import { AddressService } from './services/address.service';
import { AddressController } from './controllers/address.controller';
import { User, Address } from 'src/entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Address]),
     AuthModule, 
  ],
  controllers: [UserController, AddressController],
  providers: [UserService, UserProfileService, AddressService],
  exports: [UserService, UserProfileService, AddressService, TypeOrmModule],
})
export class UserModule {} 