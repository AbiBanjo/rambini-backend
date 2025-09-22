import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Order } from './order.entity';

export enum QuoteStatus {
  PENDING = 'pending',
  SELECTED = 'selected',
  EXPIRED = 'expired',
  USED = 'used',
  CANCELLED = 'cancelled',
}

export enum QuoteProvider {
  SHIPBUBBLE = 'shipbubble',
  UBER = 'uber',
}

@Entity('delivery_quotes')
@Index(['order_id'])
@Index(['provider', 'status'])
@Index(['expires_at'])
export class DeliveryQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  order_id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: QuoteProvider,
  })
  provider: QuoteProvider;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.PENDING,
  })
  status: QuoteStatus;

  // Provider-specific quote/request identifiers
  @Column({ name: 'provider_quote_id', nullable: true })
  provider_quote_id?: string; // Uber: quote.id, Shipbubble: request_token

  @Column({ name: 'provider_request_token', nullable: true })
  provider_request_token?: string; // Shipbubble: request_token

  // Quote metadata
  @Column({ name: 'quote_created_at', type: 'timestamp', nullable: true })
  quote_created_at?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expires_at?: Date;

  // Cost information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fee: number;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ name: 'currency_type', nullable: true })
  currency_type?: string; // Uber specific

  // Delivery timing
  @Column({ name: 'estimated_delivery_time', type: 'timestamp', nullable: true })
  estimated_delivery_time?: Date;

  @Column({ name: 'duration_minutes', nullable: true })
  duration_minutes?: number; // Uber specific

  @Column({ name: 'pickup_duration_minutes', nullable: true })
  pickup_duration_minutes?: number; // Uber specific

  // Courier/Service information (for Shipbubble)
  @Column({ name: 'courier_id', nullable: true })
  courier_id?: string;

  @Column({ name: 'courier_name', nullable: true })
  courier_name?: string;

  @Column({ name: 'service_code', nullable: true })
  service_code?: string;

  @Column({ name: 'service_type', nullable: true })
  service_type?: string;

  // Additional options
  @Column({ name: 'is_insurance_available', default: false })
  is_insurance_available: boolean;

  @Column({ name: 'insurance_code', nullable: true })
  insurance_code?: string;

  @Column({ name: 'insurance_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  insurance_fee?: number;

  @Column({ name: 'is_cod_available', default: false })
  is_cod_available: boolean;

  @Column({ name: 'cod_remit_days', nullable: true })
  cod_remit_days?: number;

  // Tracking information
  @Column({ name: 'tracking_level', nullable: true })
  tracking_level?: number; // Shipbubble: 1-10

  @Column({ name: 'waybill_available', default: false })
  waybill_available: boolean;

  @Column({ name: 'on_demand_available', default: false })
  on_demand_available: boolean;

  // Quality metrics
  @Column({ name: 'courier_rating', nullable: true })
  courier_rating?: number;

  @Column({ name: 'courier_votes', nullable: true })
  courier_votes?: number;

  // Station information (Shipbubble)
  @Column({ name: 'pickup_station', type: 'jsonb', nullable: true })
  pickup_station?: {
    name: string;
    address: string;
    phone: string;
  };

  @Column({ name: 'dropoff_station', type: 'jsonb', nullable: true })
  dropoff_station?: {
    name: string;
    address: string;
    phone: string;
  };

  // Address information
  @Column({ name: 'origin_address', type: 'jsonb' })
  origin_address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({ name: 'destination_address', type: 'jsonb' })
  destination_address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };

  // Package information
  @Column({ name: 'package_details', type: 'jsonb' })
  package_details: {
    weight: number;
    length: number;
    width: number;
    height: number;
    value?: number;
    items?: Array<{
      name: string;
      description: string;
      quantity: number;
      value: number;
      weight?: number;
    }>;
  };

  // Provider-specific data
  @Column({ name: 'provider_quote_data', type: 'jsonb', nullable: true })
  provider_quote_data?: any; // Full quote response from provider

  @Column({ name: 'provider_rates_data', type: 'jsonb', nullable: true })
  provider_rates_data?: any; // Full rates response from provider (Shipbubble)

  // Selection information
  @Column({ name: 'selected_at', type: 'timestamp', nullable: true })
  selected_at?: Date;

  @Column({ name: 'selected_by', nullable: true })
  selected_by?: string; // User ID who selected this quote

  @Column({ name: 'selection_reason', nullable: true })
  selection_reason?: string; // cheapest, fastest, preferred, etc.

  // Usage tracking
  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  used_at?: Date;

  @Column({ name: 'delivery_id', nullable: true })
  delivery_id?: string; // Reference to created delivery

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Helper methods
  isExpired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  }

  canBeUsed(): boolean {
    return this.status === QuoteStatus.SELECTED && !this.isExpired();
  }

  markAsSelected(selectedBy: string, reason?: string): void {
    this.status = QuoteStatus.SELECTED;
    this.selected_at = new Date();
    this.selected_by = selectedBy;
    this.selection_reason = reason;
  }

  markAsUsed(deliveryId: string): void {
    this.status = QuoteStatus.USED;
    this.used_at = new Date();
    this.delivery_id = deliveryId;
  }

  markAsExpired(): void {
    this.status = QuoteStatus.EXPIRED;
  }

  markAsCancelled(): void {
    this.status = QuoteStatus.CANCELLED;
  }

  // Get display information
  getDisplayName(): string {
    if (this.provider === QuoteProvider.UBER) {
      return 'Uber Direct';
    }
    return this.courier_name || 'Unknown Courier';
  }

  getTotalCost(): number {
    let total = this.fee;
    if (this.insurance_fee) {
      total += this.insurance_fee;
    }
    return total;
  }

  getEstimatedDeliveryTime(): string {
    if (this.estimated_delivery_time) {
      return this.estimated_delivery_time.toISOString();
    }
    return 'Not available';
  }
}

