import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem, Category, Vendor } from 'src/entities';
import { FileStorageModule } from 'src/modules/file-storage/file-storage.module';

// Controllers
import { MenuItemController } from './controllers/menu-item.controller';
import { CategoryController } from './controllers/category.controller';

// Services
import { MenuItemService } from './services/menu-item.service';
import { CategoryService } from './services/category.service';

// Repositories
import { MenuItemRepository } from './repositories/menu-item.repository';
import { CategoryRepository } from './repositories/category.repository';

// modules
import { VendorModule } from '../vendor/vendor.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuItem, Category, Vendor]),
    FileStorageModule,
    VendorModule,
    UserModule
  ],
  controllers: [
    MenuItemController,
    CategoryController,
  ],
  providers: [
    MenuItemService,
    CategoryService,
    MenuItemRepository,
    CategoryRepository,
  ],
  exports: [
    MenuItemService,
    CategoryService,
    MenuItemRepository,
    CategoryRepository,
  ],
})
export class MenuModule {} 