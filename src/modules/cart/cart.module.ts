import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem, MenuItem } from 'src/entities';
import { MenuModule } from 'src/modules/menu/menu.module';

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