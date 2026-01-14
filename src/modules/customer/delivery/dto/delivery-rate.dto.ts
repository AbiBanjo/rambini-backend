import { IsString, IsNumber, IsOptional, IsArray, IsNotEmpty, Min, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Postal/ZIP code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class PackageDto {
  @ApiProperty({ description: 'Package weight in kg' })
  @IsNumber()
  @Min(0.1)
  weight: number;

  @ApiProperty({ description: 'Package length in cm' })
  @IsNumber()
  @Min(1)
  length: number;

  @ApiProperty({ description: 'Package width in cm' })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: 'Package height in cm' })
  @IsNumber()
  @Min(1)
  height: number;

  @ApiProperty({ description: 'Package value for insurance', required: false })
  @IsNumber()
  @IsOptional()
  value?: number;
}

export class DeliveryRateRequestDto {
  @ApiProperty({ description: 'Origin address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  origin: AddressDto;

  @ApiProperty({ description: 'Destination address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  destination: AddressDto;

  @ApiProperty({ description: 'Package details', type: PackageDto })
  @ValidateNested()
  @Type(() => PackageDto)
  @IsObject()
  package: PackageDto;

  @ApiProperty({ description: 'Specific courier codes', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  couriers?: string[];
}

export class DeliveryRateResponseDto {
  @ApiProperty({ description: 'Courier code' })
  courier: string;

  @ApiProperty({ description: 'Courier name' })
  courierName: string;

  @ApiProperty({ description: 'Service code' })
  service: string;

  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiProperty({ description: 'Rate ID for creating shipment' })
  rateId: string;

  @ApiProperty({ description: 'Delivery cost' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Estimated delivery days' })
  estimatedDays: number;

  @ApiProperty({ description: 'Service features', required: false, type: [String] })
  features?: string[];
}

// Shipbubble-specific DTOs for shipping rates
export class ShipbubblePackageItemDto {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Item description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Unit weight in KG' })
  @IsString()
  @IsNotEmpty()
  unit_weight: string;

  @ApiProperty({ description: 'Unit amount/price' })
  @IsString()
  @IsNotEmpty()
  unit_amount: string;

  @ApiProperty({ description: 'Quantity' })
  @IsString()
  @IsNotEmpty()
  quantity: string;
}

export class ShipbubblePackageDimensionDto {
  @ApiProperty({ description: 'Length in CM' })
  @IsNumber()
  @Min(1)
  length: number;

  @ApiProperty({ description: 'Width in CM' })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: 'Height in CM' })
  @IsNumber()
  @Min(1)
  height: number;
}

export class ShipbubbleShippingRatesRequestDto {
  @ApiProperty({ description: 'Sender address code (from Addresses API)' })
  @IsNumber()
  sender_address_code: number;

  @ApiProperty({ description: 'Receiver address code (from Addresses API)' })
  @IsNumber()
  reciever_address_code: number;

  @ApiProperty({ description: 'Pickup date (format: yyyy-mm-dd) - automatically set to present day', required: false })
  @IsString()
  @IsOptional()
  pickup_date?: string;

  @ApiProperty({ description: 'Package item category ID' })
  @IsNumber()
  category_id: number;

  @ApiProperty({ description: 'Package items to be shipped', type: [ShipbubblePackageItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ShipbubblePackageItemDto)
  @IsArray()
  package_items: ShipbubblePackageItemDto[];

  @ApiProperty({ description: 'Package dimensions', type: ShipbubblePackageDimensionDto })
  @ValidateNested()
  @Type(() => ShipbubblePackageDimensionDto)
  @IsObject()
  package_dimension: ShipbubblePackageDimensionDto;

  @ApiProperty({ description: 'Service type filter (pickup or dropoff)', required: false })
  @IsString()
  @IsOptional()
  service_type?: string;

  @ApiProperty({ description: 'Additional delivery instructions', required: false })
  @IsString()
  @IsOptional()
  delivery_instructions?: string;
}

export class ShipbubbleCourierRateDto {
  @ApiProperty({ description: 'Courier ID' })
  courier_id: string | number;

  @ApiProperty({ description: 'Courier name' })
  courier_name: string;

  @ApiProperty({ description: 'Courier image URL' })
  courier_image: string;

  @ApiProperty({ description: 'Service code' })
  service_code: string;

  @ApiProperty({ description: 'Insurance details' })
  insurance: {
    code: string;
    fee: number;
  };

  @ApiProperty({ description: 'Discount information' })
  discount: {
    percentage: number;
    symbol: string;
    discounted: number;
  };

  @ApiProperty({ description: 'Service type (pickup or dropoff)' })
  service_type: string;

  @ApiProperty({ description: 'Whether waybill is available' })
  waybill: boolean;

  @ApiProperty({ description: 'Whether on-demand service is available' })
  on_demand: boolean;

  @ApiProperty({ description: 'Whether cash on delivery is available' })
  is_cod_available: boolean;

  @ApiProperty({ description: 'COD remit days' })
  cod_remit_days: number;

  @ApiProperty({ description: 'Tracking level (1-10)' })
  tracking_level: number;

  @ApiProperty({ description: 'Courier ratings' })
  ratings: number;

  @ApiProperty({ description: 'Number of votes' })
  votes: number;

  @ApiProperty({ description: 'Whether connected account is available' })
  connected_account: boolean;

  @ApiProperty({ description: 'Rate card amount' })
  rate_card_amount: number;

  @ApiProperty({ description: 'Rate card currency' })
  rate_card_currency: string;

  @ApiProperty({ description: 'Pickup ETA description' })
  pickup_eta: string;

  @ApiProperty({ description: 'Pickup ETA time' })
  pickup_eta_time: string;

  @ApiProperty({ description: 'Dropoff station details', required: false })
  dropoff_station?: {
    name: string;
    address: string;
    phone: string;
  };

  @ApiProperty({ description: 'Pickup station details', required: false })
  pickup_station?: {
    name: string;
    address: string;
    phone: string;
  };

  @ApiProperty({ description: 'Delivery ETA description' })
  delivery_eta: string;

  @ApiProperty({ description: 'Delivery ETA time' })
  delivery_eta_time: string;

  @ApiProperty({ description: 'Additional info', required: false })
  info?: string;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'VAT amount' })
  vat: number;

  @ApiProperty({ description: 'Total amount' })
  total: number;

  @ApiProperty({ description: 'Tracking information' })
  tracking: {
    bars: number;
    label: string;
  };
}

export class ShipbubbleCheckoutDataDto {
  @ApiProperty({ description: 'Ship from details' })
  ship_from: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };

  @ApiProperty({ description: 'Ship to details' })
  ship_to: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Package amount' })
  package_amount: number;

  @ApiProperty({ description: 'Package weight' })
  package_weight: number;

  @ApiProperty({ description: 'Pickup date formatted' })
  pickup_date: string;

  @ApiProperty({ description: 'Whether invoice is required' })
  is_invoice_required: boolean;
}

export class ShipbubbleShippingRatesResponseDto {
  @ApiProperty({ description: 'Request token for identifying rates request' })
  request_token: string;

  @ApiProperty({ description: 'Available courier rates', type: [ShipbubbleCourierRateDto] })
  couriers: ShipbubbleCourierRateDto[];

  @ApiProperty({ description: 'Fastest courier option', type: ShipbubbleCourierRateDto })
  fastest_courier: ShipbubbleCourierRateDto;

  @ApiProperty({ description: 'Cheapest courier option', type: ShipbubbleCourierRateDto })
  cheapest_courier: ShipbubbleCourierRateDto;

  @ApiProperty({ description: 'Checkout data summary', type: ShipbubbleCheckoutDataDto })
  checkout_data: ShipbubbleCheckoutDataDto;
}

export class ShipbubblePackageCategoryDto {
  @ApiProperty({ description: 'Category ID' })
  category_id: number;

  @ApiProperty({ description: 'Category name' })
  category: string;
}

export class ShipbubblePackageCategoriesResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Package categories', type: [ShipbubblePackageCategoryDto] })
  data: ShipbubblePackageCategoryDto[];
}

export class ShipbubblePackageDimensionBoxDto {
  @ApiProperty({ description: 'Box size ID' })
  box_size_id: number;

  @ApiProperty({ description: 'Box name' })
  name: string;

  @ApiProperty({ description: 'Description image URL' })
  description_image_url: string;

  @ApiProperty({ description: 'Height in CM' })
  height: number;

  @ApiProperty({ description: 'Width in CM' })
  width: number;

  @ApiProperty({ description: 'Length in CM' })
  length: number;

  @ApiProperty({ description: 'Maximum weight in KG' })
  max_weight: number;
}

export class ShipbubblePackageDimensionsResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Package dimensions', type: [ShipbubblePackageDimensionBoxDto] })
  data: ShipbubblePackageDimensionBoxDto[];
}

export class ShipbubbleCreateShipmentRequestDto {
  @ApiProperty({ description: 'Request token from rates API' })
  @IsString()
  @IsNotEmpty()
  request_token: string;

  @ApiProperty({ description: 'Service code of selected courier rate' })
  @IsString()
  @IsNotEmpty()
  service_code: string;

  @ApiProperty({ description: 'Courier ID of selected courier rate' })
  @IsString()
  @IsNotEmpty()
  courier_id: string;

  @ApiProperty({ description: 'Insurance code if insurance is to be purchased', required: false })
  @IsString()
  @IsOptional()
  insurance_code?: string;

  @ApiProperty({ description: 'Whether this is a cash on delivery shipment', required: false })
  @IsBoolean()
  @IsOptional()
  is_cod_label?: boolean;
}

export class ShipbubbleShipmentItemDto {
  @ApiProperty({ description: 'Item name' })
  name: string;

  @ApiProperty({ description: 'Item description' })
  description: string;

  @ApiProperty({ description: 'Item weight in KG' })
  weight: number;

  @ApiProperty({ description: 'Item amount/price' })
  amount: string;

  @ApiProperty({ description: 'Item quantity' })
  quantity: string;

  @ApiProperty({ description: 'Total amount for this item' })
  total: number;
}

export class ShipbubbleCourierContactDto {
  @ApiProperty({ description: 'Courier name' })
  name: string;

  @ApiProperty({ description: 'Courier email' })
  email: string;

  @ApiProperty({ description: 'Courier phone' })
  phone: string;
}

export class ShipbubbleShipmentAddressDto {
  @ApiProperty({ description: 'Contact name' })
  name: string;

  @ApiProperty({ description: 'Contact phone' })
  phone: string;

  @ApiProperty({ description: 'Contact email' })
  email: string;

  @ApiProperty({ description: 'Full address' })
  address: string;

  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;
}

export class ShipbubblePaymentInfoDto {
  @ApiProperty({ description: 'Shipping fee' })
  shipping_fee: number;

  @ApiProperty({ description: 'Payment type' })
  type: string;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiProperty({ description: 'Currency' })
  currency: string;
}

export class ShipbubbleCreateShipmentDataDto {
  @ApiProperty({ description: 'Order ID' })
  order_id: string;

  @ApiProperty({ description: 'Courier contact information', type: ShipbubbleCourierContactDto })
  courier: ShipbubbleCourierContactDto;

  @ApiProperty({ description: 'Shipment status' })
  status: string;

  @ApiProperty({ description: 'Ship from details', type: ShipbubbleShipmentAddressDto })
  ship_from: ShipbubbleShipmentAddressDto;

  @ApiProperty({ description: 'Ship to details', type: ShipbubbleShipmentAddressDto })
  ship_to: ShipbubbleShipmentAddressDto;

  @ApiProperty({ description: 'Payment information', type: ShipbubblePaymentInfoDto })
  payment: ShipbubblePaymentInfoDto;

  @ApiProperty({ description: 'Shipment items', type: [ShipbubbleShipmentItemDto] })
  items: ShipbubbleShipmentItemDto[];

  @ApiProperty({ description: 'Tracking URL' })
  tracking_url: string;

  @ApiProperty({ description: 'Creation date' })
  date: string;
}

export class ShipbubbleCreateShipmentResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Shipment details', type: ShipbubbleCreateShipmentDataDto })
  data: ShipbubbleCreateShipmentDataDto;
}

// Uber Direct Delivery Quote DTOs
export class UberDirectAddressDto {
  @ApiProperty({ description: 'Street address array' })
  @IsArray()
  @IsString({ each: true })
  street_address: string[];

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'ZIP/Postal code' })
  @IsString()
  @IsNotEmpty()
  zip_code: string;

  @ApiProperty({ description: 'Country code' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class UberDirectDeliveryQuoteRequestDto {
  @ApiProperty({ description: 'Pickup address as JSON string' })
  @IsString()
  @IsNotEmpty()
  pickup_address: string;

  @ApiProperty({ description: 'Dropoff address as JSON string' })
  @IsString()
  @IsNotEmpty()
  dropoff_address: string;

  @ApiProperty({ description: 'Pickup latitude coordinate', required: false })
  @IsNumber()
  @IsOptional()
  pickup_latitude?: number;

  @ApiProperty({ description: 'Pickup longitude coordinate', required: false })
  @IsNumber()
  @IsOptional()
  pickup_longitude?: number;

  @ApiProperty({ description: 'Dropoff latitude coordinate', required: false })
  @IsNumber()
  @IsOptional()
  dropoff_latitude?: number;

  @ApiProperty({ description: 'Dropoff longitude coordinate', required: false })
  @IsNumber()
  @IsOptional()
  dropoff_longitude?: number;

  @ApiProperty({ description: 'Pickup ready datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  pickup_ready_dt: string;

  @ApiProperty({ description: 'Pickup deadline datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  pickup_deadline_dt: string;

  @ApiProperty({ description: 'Dropoff ready datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  dropoff_ready_dt: string;

  @ApiProperty({ description: 'Dropoff deadline datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  dropoff_deadline_dt: string;

  @ApiProperty({ description: 'Pickup phone number' })
  @IsString()
  @IsNotEmpty()
  pickup_phone_number: string;

  @ApiProperty({ description: 'Dropoff phone number' })
  @IsString()
  @IsNotEmpty()
  dropoff_phone_number: string;

  @ApiProperty({ description: 'Manifest total value in cents' })
  @IsNumber()
  @Min(1)
  manifest_total_value: number;

  @ApiProperty({ description: 'External store ID', required: false })
  @IsString()
  @IsOptional()
  external_store_id?: string;
}

export class UberDirectDeliveryQuoteResponseDto {
  @ApiProperty({ description: 'Response kind' })
  kind: string;

  @ApiProperty({ description: 'Quote ID' })
  id: string;

  @ApiProperty({ description: 'Quote creation timestamp' })
  created: string;

  @ApiProperty({ description: 'Quote expiration timestamp' })
  expires: string;

  @ApiProperty({ description: 'Delivery fee in cents' })
  fee: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Currency type' })
  currency_type: string;

  @ApiProperty({ description: 'Dropoff ETA timestamp' })
  dropoff_eta: string;

  @ApiProperty({ description: 'Total duration in minutes' })
  duration: number;

  @ApiProperty({ description: 'Pickup duration in minutes' })
  pickup_duration: number;

  @ApiProperty({ description: 'Dropoff deadline timestamp' })
  dropoff_deadline: string;
}

export class UberDirectErrorResponseDto {
  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Response kind' })
  kind: string;
}

// Uber Direct Create Delivery DTOs
export class UberDirectManifestItemDto {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Item description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Item quantity' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Item value in cents' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Item weight in grams', required: false })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ description: 'Item dimensions', required: false })
  @IsObject()
  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export class UberDirectPickupVerificationDto {
  @ApiProperty({ description: 'Require picture verification', required: false })
  @IsBoolean()
  @IsOptional()
  picture?: boolean;

  @ApiProperty({ description: 'Require barcode scanning', required: false })
  @IsBoolean()
  @IsOptional()
  barcode?: boolean;

  @ApiProperty({ description: 'Require signature', required: false })
  @IsBoolean()
  @IsOptional()
  signature?: boolean;
}

export class UberDirectDropoffVerificationDto {
  @ApiProperty({ description: 'Require picture verification', required: false })
  @IsBoolean()
  @IsOptional()
  picture?: boolean;

  @ApiProperty({ description: 'Require barcode scanning', required: false })
  @IsBoolean()
  @IsOptional()
  barcode?: boolean;

  @ApiProperty({ description: 'Require signature', required: false })
  @IsBoolean()
  @IsOptional()
  signature?: boolean;

  @ApiProperty({ description: 'Require ID verification', required: false })
  @IsBoolean()
  @IsOptional()
  identification?: boolean;

  @ApiProperty({ description: 'Require PIN verification', required: false })
  @IsBoolean()
  @IsOptional()
  pin?: boolean;
}

export class UberDirectReturnVerificationDto {
  @ApiProperty({ description: 'Require picture verification', required: false })
  @IsBoolean()
  @IsOptional()
  picture?: boolean;

  @ApiProperty({ description: 'Require barcode scanning', required: false })
  @IsBoolean()
  @IsOptional()
  barcode?: boolean;

  @ApiProperty({ description: 'Require signature', required: false })
  @IsBoolean()
  @IsOptional()
  signature?: boolean;
}

export class UberDirectExternalUserInfoDto {
  @ApiProperty({ description: 'User name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'User phone', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class UberDirectUserFeesSummaryDto {
  @ApiProperty({ description: 'Fee type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Fee amount in cents' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Fee description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UberDirectCreateDeliveryRequestDto {
  @ApiProperty({ description: 'Pickup location name' })
  @IsString()
  @IsNotEmpty()
  pickup_name: string;

  @ApiProperty({ description: 'Pickup address as JSON string' })
  @IsString()
  @IsNotEmpty()
  pickup_address: string;

  @ApiProperty({ description: 'Pickup phone number' })
  @IsString()
  @IsNotEmpty()
  pickup_phone_number: string;

  @ApiProperty({ description: 'Dropoff location name' })
  @IsString()
  @IsNotEmpty()
  dropoff_name: string;

  @ApiProperty({ description: 'Dropoff address as JSON string' })
  @IsString()
  @IsNotEmpty()
  dropoff_address: string;

  @ApiProperty({ description: 'Dropoff phone number' })
  @IsString()
  @IsNotEmpty()
  dropoff_phone_number: string;

  @ApiProperty({ description: 'Manifest items', type: [UberDirectManifestItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UberDirectManifestItemDto)
  @IsArray()
  manifest_items: UberDirectManifestItemDto[];

  @ApiProperty({ description: 'Pickup business name', required: false })
  @IsString()
  @IsOptional()
  pickup_business_name?: string;

  @ApiProperty({ description: 'Pickup latitude', required: false })
  @IsNumber()
  @IsOptional()
  pickup_latitude?: number;

  @ApiProperty({ description: 'Pickup longitude', required: false })
  @IsNumber()
  @IsOptional()
  pickup_longitude?: number;

  @ApiProperty({ description: 'Pickup notes', required: false })
  @IsString()
  @IsOptional()
  pickup_notes?: string;

  @ApiProperty({ description: 'Pickup verification requirements', type: UberDirectPickupVerificationDto, required: false })
  @ValidateNested()
  @Type(() => UberDirectPickupVerificationDto)
  @IsOptional()
  pickup_verification?: UberDirectPickupVerificationDto;

  @ApiProperty({ description: 'Dropoff business name', required: false })
  @IsString()
  @IsOptional()
  dropoff_business_name?: string;

  @ApiProperty({ description: 'Dropoff latitude', required: false })
  @IsNumber()
  @IsOptional()
  dropoff_latitude?: number;

  @ApiProperty({ description: 'Dropoff longitude', required: false })
  @IsNumber()
  @IsOptional()
  dropoff_longitude?: number;

  @ApiProperty({ description: 'Dropoff notes', required: false })
  @IsString()
  @IsOptional()
  dropoff_notes?: string;

  @ApiProperty({ description: 'Dropoff seller notes', required: false })
  @IsString()
  @IsOptional()
  dropoff_seller_notes?: string;

  @ApiProperty({ description: 'Dropoff verification requirements', type: UberDirectDropoffVerificationDto, required: false })
  @ValidateNested()
  @Type(() => UberDirectDropoffVerificationDto)
  @IsOptional()
  dropoff_verification?: UberDirectDropoffVerificationDto;

  @ApiProperty({ description: 'Deliverable action', enum: ['deliverable_action_meet_at_door', 'deliverable_action_leave_at_door'], required: false })
  @IsString()
  @IsOptional()
  deliverable_action?: 'deliverable_action_meet_at_door' | 'deliverable_action_leave_at_door';

  @ApiProperty({ description: 'Manifest reference', required: false })
  @IsString()
  @IsOptional()
  manifest_reference?: string;

  @ApiProperty({ description: 'Manifest total value in cents' })
  @IsNumber()
  @Min(0)
  manifest_total_value: number;

  @ApiProperty({ description: 'Quote ID', required: false })
  @IsString()
  @IsOptional()
  quote_id?: string;

  @ApiProperty({ description: 'Undeliverable action', enum: ['leave_at_door', 'return', 'discard'], required: false })
  @IsString()
  @IsOptional()
  undeliverable_action?: 'leave_at_door' | 'return' | 'discard';

  @ApiProperty({ description: 'Pickup ready datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  pickup_ready_dt: string;

  @ApiProperty({ description: 'Pickup deadline datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  pickup_deadline_dt: string;

  @ApiProperty({ description: 'Dropoff ready datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  dropoff_ready_dt: string;

  @ApiProperty({ description: 'Dropoff deadline datetime (RFC 3339)' })
  @IsString()
  @IsNotEmpty()
  dropoff_deadline_dt: string;

  @ApiProperty({ description: 'Requires dropoff signature (deprecated)', required: false })
  @IsBoolean()
  @IsOptional()
  requires_dropoff_signature?: boolean;

  @ApiProperty({ description: 'Requires ID (deprecated)', required: false })
  @IsBoolean()
  @IsOptional()
  requires_id?: boolean;

  @ApiProperty({ description: 'Tip amount in cents', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tip?: number;

  @ApiProperty({ description: 'Idempotency key', required: false })
  @IsString()
  @IsOptional()
  idempotency_key?: string;

  @ApiProperty({ description: 'External store ID', required: false })
  @IsString()
  @IsOptional()
  external_store_id?: string;

  @ApiProperty({ description: 'Return notes', required: false })
  @IsString()
  @IsOptional()
  return_notes?: string;

  @ApiProperty({ description: 'Return verification requirements', type: UberDirectReturnVerificationDto, required: false })
  @ValidateNested()
  @Type(() => UberDirectReturnVerificationDto)
  @IsOptional()
  return_verification?: UberDirectReturnVerificationDto;

  @ApiProperty({ description: 'External user info', type: UberDirectExternalUserInfoDto, required: false })
  @ValidateNested()
  @Type(() => UberDirectExternalUserInfoDto)
  @IsOptional()
  external_user_info?: UberDirectExternalUserInfoDto;

  @ApiProperty({ description: 'External ID', required: false })
  @IsString()
  @IsOptional()
  external_id?: string;

  @ApiProperty({ description: 'User fees summary', type: [UberDirectUserFeesSummaryDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => UberDirectUserFeesSummaryDto)
  @IsArray()
  @IsOptional()
  user_fees_summary?: UberDirectUserFeesSummaryDto[];
}

export class UberDirectCreateDeliveryResponseDto {
  @ApiProperty({ description: 'Delivery ID' })
  id: string;

  @ApiProperty({ description: 'Delivery status' })
  status: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updated: string;

  @ApiProperty({ description: 'Pickup details' })
  pickup: {
    name: string;
    address: string;
    phone: string;
    business_name?: string;
    notes?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @ApiProperty({ description: 'Dropoff details' })
  dropoff: {
    name: string;
    address: string;
    phone: string;
    business_name?: string;
    notes?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @ApiProperty({ description: 'Manifest details' })
  manifest: {
    items: UberDirectManifestItemDto[];
    total_value: number;
    reference?: string;
  };

  @ApiProperty({ description: 'Delivery fee in cents' })
  fee: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Estimated delivery time' })
  eta: string;

  @ApiProperty({ description: 'Tracking URL' })
  tracking_url: string;

  @ApiProperty({ description: 'External store ID', required: false })
  external_store_id?: string;

  @ApiProperty({ description: 'External ID', required: false })
  external_id?: string;
}

// Uber Direct Get Delivery DTOs
export class UberDirectCourierDto {
  @ApiProperty({ description: 'Courier ID' })
  id: string;

  @ApiProperty({ description: 'Courier name' })
  name: string;

  @ApiProperty({ description: 'Courier phone' })
  phone: string;

  @ApiProperty({ description: 'Courier location', required: false })
  location?: {
    latitude: number;
    longitude: number;
  };

  @ApiProperty({ description: 'Courier vehicle type', required: false })
  vehicle_type?: string;

  @ApiProperty({ description: 'Courier rating', required: false })
  rating?: number;
}

export class UberDirectDeliveryStatusDto {
  @ApiProperty({ description: 'Current status' })
  status: string;

  @ApiProperty({ description: 'Status description' })
  description: string;

  @ApiProperty({ description: 'Status timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Location at status change', required: false })
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class UberDirectDeliveryDetailsDto {
  @ApiProperty({ description: 'Delivery ID' })
  id: string;

  @ApiProperty({ description: 'Delivery status' })
  status: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updated: string;

  @ApiProperty({ description: 'Pickup details' })
  pickup: {
    name: string;
    address: string;
    phone: string;
    business_name?: string;
    notes?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    ready_dt: string;
    deadline_dt: string;
    completed_dt?: string;
  };

  @ApiProperty({ description: 'Dropoff details' })
  dropoff: {
    name: string;
    address: string;
    phone: string;
    business_name?: string;
    notes?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    ready_dt: string;
    deadline_dt: string;
    completed_dt?: string;
  };

  @ApiProperty({ description: 'Manifest details' })
  manifest: {
    items: UberDirectManifestItemDto[];
    total_value: number;
    reference?: string;
  };

  @ApiProperty({ description: 'Delivery fee in cents' })
  fee: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Estimated delivery time' })
  eta: string;

  @ApiProperty({ description: 'Actual delivery time', required: false })
  delivered_at?: string;

  @ApiProperty({ description: 'Tracking URL' })
  tracking_url: string;

  @ApiProperty({ description: 'Courier information', required: false })
  courier?: UberDirectCourierDto;

  @ApiProperty({ description: 'Delivery status history', type: [UberDirectDeliveryStatusDto] })
  status_history: UberDirectDeliveryStatusDto[];

  @ApiProperty({ description: 'External store ID', required: false })
  external_store_id?: string;

  @ApiProperty({ description: 'External ID', required: false })
  external_id?: string;

  @ApiProperty({ description: 'Quote ID used for this delivery', required: false })
  quote_id?: string;

  @ApiProperty({ description: 'Tip amount in cents', required: false })
  tip?: number;

  @ApiProperty({ description: 'Total amount including tip in cents', required: false })
  total_amount?: number;

  @ApiProperty({ description: 'Delivery instructions', required: false })
  instructions?: {
    pickup_instructions?: string;
    dropoff_instructions?: string;
    return_instructions?: string;
  };

  @ApiProperty({ description: 'Verification requirements', required: false })
  verification?: {
    pickup_verification?: UberDirectPickupVerificationDto;
    dropoff_verification?: UberDirectDropoffVerificationDto;
    return_verification?: UberDirectReturnVerificationDto;
  };

  @ApiProperty({ description: 'Deliverable action' })
  deliverable_action: 'deliverable_action_meet_at_door' | 'deliverable_action_leave_at_door';

  @ApiProperty({ description: 'Undeliverable action' })
  undeliverable_action: 'leave_at_door' | 'return' | 'discard';

  @ApiProperty({ description: 'External user info', required: false })
  external_user_info?: UberDirectExternalUserInfoDto;
}