import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem, Category, Vendor, MenuLike } from 'src/entities'; // ✅ Add MenuLike
import { FileStorageModule } from 'src/modules/file-storage/file-storage.module';

// Controllers
import { MenuItemController } from './controllers/menu-item.controller';
import { CategoryController } from './controllers/category.controller';
import { MenuLikeController } from './controllers/menu-like.controller'; // ✅ Add this
import { VendorMenuLikeController } from './controllers/vendor-menu-like.controller'; // ✅ Add this

// Services
import { MenuItemService } from './services/menu-item.service';
import { CategoryService } from './services/category.service';
import { MenuLikeService } from './services/menu-like.service'; // ✅ Add this

// Repositories
import { MenuItemRepository } from './repositories/menu-item.repository';
import { CategoryRepository } from './repositories/category.repository';
import { MenuLikeRepository } from './repositories/menu-like.repository'; // ✅ Add this

// modules
import { VendorModule } from '../vendor/vendor.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuItem, Category, Vendor, MenuLike]), // ✅ Add MenuLike
    FileStorageModule,
    VendorModule,
    UserModule,
    AuthModule,
  ],
  controllers: [
    MenuItemController,
    CategoryController,
    MenuLikeController, // ✅ Add this
    VendorMenuLikeController, // ✅ Add this
  ],
  providers: [
    MenuItemService,
    CategoryService,
    MenuItemRepository,
    CategoryRepository,
    MenuLikeService, // ✅ Add this
    MenuLikeRepository, // ✅ Add this
  ],
  exports: [
    MenuItemService,
    CategoryService,
    MenuItemRepository,
    CategoryRepository,
    MenuLikeService, // ✅ Add this (in case other modules need it)
    MenuLikeRepository, // ✅ Add this (in case other modules need it)
  ],
})
export class MenuModule {}