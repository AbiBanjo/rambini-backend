import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem, MenuItem } from 'src/entities';
import { MenuModule } from 'src/modules/menu/menu.module';
import { AuthModule } from 'src/modules/auth/auth.module';

// Controllers
import { CartController } from './controllers/cart.controller';

// Services
import { CartService } from './services/cart.service';

// Repositories
import { CartRepository } from './repositories/cart.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, MenuItem]),
    MenuModule,
    AuthModule, // Import AuthModule to get access to JWTService and JwtAuthGuard
  ],
  controllers: [
    CartController,
  ],
  providers: [
    CartService,
    CartRepository,
  ],
  exports: [
    CartService,
    CartRepository,
  ],
})
export class CartModule {} 