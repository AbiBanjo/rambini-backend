import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from '../../entities';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    UserModule, // Import UserModule to get AddressService
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
    NotificationModule, // Import NotificationModule to get access to NotificationService
  ],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}

// Export DTOs for use in other modules
export * from './dto/create-vendor.dto';
export * from './dto/admin-verification.dto'; 