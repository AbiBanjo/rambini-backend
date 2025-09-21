import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { DeliveryService } from '../services/delivery.service';
import { DeliveryProvider } from 'src/entities';
import {
  AddressValidationDto,
  AddressValidationResponseDto,
  DeliveryRateRequestDto,
  DeliveryRateResponseDto,
  CreateShipmentDto,
  CreateShipmentResponseDto,
  ShipmentTrackingResponseDto,
  DeliveryResponseDto,
  ShipbubblePackageCategoriesResponseDto,
  ShipbubblePackageDimensionsResponseDto,
  ShipbubbleCreateShipmentRequestDto,
  ShipbubbleCreateShipmentResponseDto,
} from '../dto';

@ApiTags('Delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('validate-address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate delivery address' })
  @ApiResponse({
    status: 200,
    description: 'Address validation result',
    type: AddressValidationResponseDto,
  })
  async validateAddress(
    @Body() addressValidationDto: AddressValidationDto,
    @Query('provider') provider: DeliveryProvider = DeliveryProvider.SHIPBUBBLE,
  ): Promise<AddressValidationResponseDto> {
    return await this.deliveryService.validateAddress(provider, addressValidationDto);
  }

  @Post('rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get delivery rates' })
  @ApiResponse({
    status: 200,
    description: 'Delivery rates',
    type: [DeliveryRateResponseDto],
  })
  async getDeliveryRates(
    @Body() rateRequest: DeliveryRateRequestDto,
    @Query('provider') provider: DeliveryProvider = DeliveryProvider.SHIPBUBBLE,
  ): Promise<DeliveryRateResponseDto[]> {
    return await this.deliveryService.getDeliveryRates(provider, rateRequest);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create delivery for order' })
  @ApiResponse({
    status: 201,
    description: 'Delivery created successfully',
    type: DeliveryResponseDto,
  })
  async createDelivery(
    @Body() createDeliveryDto: {
      orderId: string;
      provider: DeliveryProvider;
      shipmentData: CreateShipmentDto;
    },
  ): Promise<DeliveryResponseDto> {
    return await this.deliveryService.createDelivery(
      createDeliveryDto.orderId,
      createDeliveryDto.provider,
      createDeliveryDto.shipmentData,
    );
  }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track delivery' })
  @ApiResponse({
    status: 200,
    description: 'Delivery tracking information',
    type: ShipmentTrackingResponseDto,
  })
  async trackDelivery(@Param('trackingNumber') trackingNumber: string): Promise<ShipmentTrackingResponseDto> {
    return await this.deliveryService.trackDelivery(trackingNumber);
  }

  @Post('cancel/:trackingNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel delivery' })
  @ApiResponse({
    status: 200,
    description: 'Delivery cancellation result',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  async cancelDelivery(@Param('trackingNumber') trackingNumber: string): Promise<{ success: boolean }> {
    const success = await this.deliveryService.cancelDelivery(trackingNumber);
    return { success };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery details',
    type: DeliveryResponseDto,
  })
  async getDeliveryById(@Param('id') id: string): Promise<DeliveryResponseDto> {
    return await this.deliveryService.getDeliveryById(id);
  }

  @Get('tracking/:trackingNumber')
  @ApiOperation({ summary: 'Get delivery by tracking number' })
  @ApiResponse({
    status: 200,
    description: 'Delivery details',
    type: DeliveryResponseDto,
  })
  async getDeliveryByTrackingNumber(@Param('trackingNumber') trackingNumber: string): Promise<DeliveryResponseDto> {
    return await this.deliveryService.getDeliveryByTrackingNumber(trackingNumber);
  }

  @Get('package-categories')
  @ApiOperation({ summary: 'Get package categories for shipping' })
  @ApiResponse({
    status: 200,
    description: 'Package categories for shipping labels',
    type: ShipbubblePackageCategoriesResponseDto,
  })
  async getPackageCategories(): Promise<ShipbubblePackageCategoriesResponseDto> {
    return await this.deliveryService.getPackageCategories();
  }

  @Get('package-dimensions')
  @ApiOperation({ summary: 'Get package dimensions for shipping' })
  @ApiResponse({
    status: 200,
    description: 'Package dimensions and box sizes for shipping',
    type: ShipbubblePackageDimensionsResponseDto,
  })
  async getPackageDimensions(): Promise<ShipbubblePackageDimensionsResponseDto> {
    return await this.deliveryService.getPackageDimensions();
  }

  @Post('create-shipment-label')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create shipment label using request token from rates API' })
  @ApiResponse({
    status: 201,
    description: 'Shipment label created successfully',
    type: ShipbubbleCreateShipmentResponseDto,
  })
  async createShipmentLabel(
    @Body() shipmentRequest: ShipbubbleCreateShipmentRequestDto,
  ): Promise<ShipbubbleCreateShipmentResponseDto> {
    return await this.deliveryService.createShipmentLabel(shipmentRequest);
  }

  @Get()
  @ApiOperation({ summary: 'Get deliveries with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated delivery list',
    schema: {
      type: 'object',
      properties: {
        deliveries: { type: 'array', items: { $ref: '#/components/schemas/DeliveryResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled', 'returned'] })
  @ApiQuery({ name: 'provider', required: false, enum: ['shipbubble'] })
  async getDeliveries(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
  ): Promise<{ deliveries: DeliveryResponseDto[]; total: number; page: number; limit: number }> {
    return await this.deliveryService.getDeliveries(
      page,
      limit,
      status as any,
      provider as any,
    );
  }
}
