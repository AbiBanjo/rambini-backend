import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Delivery } from './delivery.entity';

@Entity('delivery_tracking')
export class DeliveryTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_id' })
  delivery_id: string;

  @ManyToOne(() => Delivery, (delivery) => delivery.tracking_events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'description' })
  description: string;

  @Column({ name: 'location', nullable: true })
  location?: string;

  @Column({ name: 'timestamp', type: 'timestamp' })
  timestamp: Date;

  @Column({ name: 'provider_data', type: 'jsonb', nullable: true })
  provider_data?: any;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
