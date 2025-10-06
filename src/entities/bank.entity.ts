import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsNotEmpty, Length } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('banks')
@Index(['user_id'])
@Index(['bank_name'])
export class Bank extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  account_number: string;

  // Relationships
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual properties
  get masked_account_number(): string {
    if (this.account_number.length <= 4) {
      return '*'.repeat(this.account_number.length);
    }
    return '*'.repeat(this.account_number.length - 4) + this.account_number.slice(-4);
  }

  get display_name(): string {
    return `${this.name} (${this.bank_name})`;
  }
}

