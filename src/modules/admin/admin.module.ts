import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrderModule } from '../order/order.module';
import { MenuModule } from '../menu/menu.module'; // Add this import
import { FileStorageModule } from '../file-storage/file-storage.module'; // Add this import
import { Vendor } from '@/entities';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    OrderModule,
    MenuModule,           // Add this - exports CategoryService
    FileStorageModule,    // Add this - exports FileStorageService
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}