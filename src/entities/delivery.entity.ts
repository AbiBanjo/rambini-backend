import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { DeliveryTracking } from './delivery-tracking.entity';

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum DeliveryProvider {
  SHIPBUBBLE = 'shipbubble',
  UBER = 'uber',
  // Add other providers as needed
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  order_id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: DeliveryProvider,
    default: DeliveryProvider.SHIPBUBBLE,
  })
  provider: DeliveryProvider;

  @Column({ name: 'tracking_number', unique: true })
  tracking_number: string;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status: ShipmentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ name: 'courier_name' })
  courier_name: string;

  @Column({ name: 'service_type' })
  service_type: string;

  @Column({ name: 'rate_id' })
  rate_id: string;

  @Column({ name: 'reference_number', nullable: true })
  reference_number?: string;

  @Column({ name: 'label_url', nullable: true })
  label_url?: string;

  @Column({ name: 'estimated_delivery', type: 'timestamp' })
  estimated_delivery: Date;

  @Column({ name: 'actual_delivery', type: 'timestamp', nullable: true })
  actual_delivery?: Date;

  @Column({ name: 'origin_address', type: 'jsonb' })
  origin_address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };

  @Column({ name: 'destination_address', type: 'jsonb' })
  destination_address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };

  @Column({ name: 'package_details', type: 'jsonb' })
  package_details: {
    weight: number;
    length: number;
    width: number;
    height: number;
    value?: number;
  };

  @Column({ name: 'provider_response', type: 'jsonb', nullable: true })
  provider_response?: any;

  @Column({ name: 'failure_reason', nullable: true })
  failure_reason?: string;

  @OneToMany(() => DeliveryTracking, (tracking) => tracking.delivery)
  tracking_events: DeliveryTracking[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Helper methods
  markAsPickedUp(): void {
    this.status = ShipmentStatus.PICKED_UP;
  }

  markAsInTransit(): void {
    this.status = ShipmentStatus.IN_TRANSIT;
  }

  markAsOutForDelivery(): void {
    this.status = ShipmentStatus.OUT_FOR_DELIVERY;
  }

  markAsDelivered(): void {
    this.status = ShipmentStatus.DELIVERED;
    this.actual_delivery = new Date();
  }

  markAsFailed(reason: string): void {
    this.status = ShipmentStatus.FAILED;
    this.failure_reason = reason;
  }

  markAsCancelled(): void {
    this.status = ShipmentStatus.CANCELLED;
  }

  markAsReturned(): void {
    this.status = ShipmentStatus.RETURNED;
  }
}
