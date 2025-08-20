import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @DeleteDateColumn({ type: 'timestamp' })
  @Exclude()
  deleted_at?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
} 