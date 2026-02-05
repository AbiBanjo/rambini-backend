import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { MenuItem } from './menu-item.entity';

@Entity('menu_likes')
@Unique(['user_id', 'menu_item_id']) // Prevent duplicate likes
@Index(['user_id'])
@Index(['menu_item_id'])
@Index(['created_at'])
export class MenuLike extends BaseEntity {
  @Column({ type: 'uuid' })  // ✅ Changed from varchar to uuid
  user_id: string;

  @Column({ type: 'uuid' })  // ✅ Changed from varchar to uuid
  menu_item_id: string;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item: MenuItem;
}