import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryProvider, DeliveryQuote, QuoteStatus } from '../../../entities/delivery-quote.entity';
import { Order } from '../../../entities/order.entity';
import { ShipbubbleDeliveryService } from './shipbubble-delivery.service';
import { UberDeliveryService } from './uber-delivery.service';
import {
  ShipbubbleShippingRatesRequestDto,
  ShipbubbleShippingRatesResponseDto,
  UberDirectDeliveryQuoteRequestDto,
  UberDirectDeliveryQuoteResponseDto,
} from '../dto';

@Injectable()
export class DeliveryQuoteService {
  private readonly logger = new Logger(DeliveryQuoteService.name);

  constructor(
    @InjectRepository(DeliveryQuote)
    private readonly deliveryQuoteRepository: Repository<DeliveryQuote>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly shipbubbleDeliveryService: ShipbubbleDeliveryService,
    private readonly uberDeliveryService: UberDeliveryService,
  ) {}

  /**
   * Create delivery quotes for an order
   */
  async createQuotesForOrder(orderId: string, providers: DeliveryProvider [] = [DeliveryProvider .SHIPBUBBLE, DeliveryProvider .UBER]): Promise<DeliveryQuote[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['delivery_address'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const quotes: DeliveryQuote[] = [];

    for (const provider of providers) {
      try {
        const quote = await this.createQuoteForProvider(order, provider);
        if (quote) {
          quotes.push(quote);
        }
      } catch (error) {
        this.logger.error(`Failed to create quote for provider ${provider}: ${error.message}`);
        // Continue with other providers even if one fails
      }
    }

    return quotes;
  }

  /**
   * Create a single quote for a specific provider
   */
  private async createQuoteForProvider(order: Order, provider: DeliveryProvider ): Promise<DeliveryQuote | null> {
    try {
      if (provider === DeliveryProvider .SHIPBUBBLE) {
        return await this.createShipbubbleQuote(order);
      } else if (provider === DeliveryProvider .UBER) {
        return await this.createUberQuote(order);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to create ${provider} quote: ${error.message}`);
      return null;
    }
  }

  /**
   * Create Shipbubble quote
   */
  private async createShipbubbleQuote(order: Order): Promise<DeliveryQuote | null> {
    try {
      // First, validate addresses to get address codes
      const originValidation = await this.shipbubbleDeliveryService.validateAddress({
        name: order.vendor?.business_name || 'Vendor',
        email: order.vendor?.user?.email || 'vendor@example.com',
        phone: order.vendor?.user?.phone_number || '+1234567890',
        address: `${order.vendor?.address?.address_line_1 || 'Vendor Address'}, ${order.vendor?.address?.city || 'City'}, ${order.vendor?.address?.state || 'State'}`,
      }) as any;

      const destinationValidation = await this.shipbubbleDeliveryService.validateAddress({
        name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Customer',
        email: order.customer?.email || 'customer@example.com',
        phone: order.customer?.phone_number || '+1234567890',
        address: `${order.delivery_address?.address_line_1 || 'Customer Address'}, ${order.delivery_address?.city || 'City'}, ${order.delivery_address?.state || 'State'}`,
      }) as any;

      if (!originValidation.success || !destinationValidation.success) {
        throw new BadRequestException('Address validation failed');
      }

      // Get package categories
      const categories = await this.shipbubbleDeliveryService.getPackageCategories();
      const categoryId = categories.data?.[0]?.category_id || 1; // Use first category as default

      // Prepare rates request
      const ratesRequest: ShipbubbleShippingRatesRequestDto = {
        sender_address_code: originValidation.data.address_code,
        reciever_address_code: destinationValidation.data.address_code,
        category_id: categoryId,
        package_items: order.order_items?.map(item => ({
          name: item.menu_item?.name || 'Food Item',
          description: item.menu_item?.description || 'Food delivery',
          unit_weight: (item.quantity * 0.5).toString(), // Estimate 0.5kg per item
          unit_amount: item.unit_price.toString(),
          quantity: item.quantity.toString(),
        })) || [{
          name: 'Food Order',
          description: 'Food delivery',
          unit_weight: '1.0',
          unit_amount: order.subtotal.toString(),
          quantity: '1',
        }],
        package_dimension: {
          length: 30,
          width: 30,
          height: 15,
        },
      };

      // Fetch rates
      const ratesResponse = await this.shipbubbleDeliveryService.fetchShippingRates(ratesRequest);

      // Create quote record for each courier option
      const quotes: DeliveryQuote[] = [];
      
      for (const courier of ratesResponse.couriers) {
        const quote = this.deliveryQuoteRepository.create({
          provider: DeliveryProvider .SHIPBUBBLE,
          status: QuoteStatus.PENDING,
          provider_request_token: ratesResponse.request_token,
          fee: courier.total,
          currency: courier.currency,
          estimated_delivery_time: new Date(courier.delivery_eta_time),
          courier_id: courier.courier_id.toString(),
          courier_name: courier.courier_name,
          service_code: courier.service_code,
          service_type: courier.service_type,
          is_insurance_available: !!courier.insurance?.code,
          insurance_code: courier.insurance?.code,
          insurance_fee: courier.insurance?.fee,
          is_cod_available: courier.is_cod_available,
          cod_remit_days: courier.cod_remit_days,
          tracking_level: courier.tracking_level,
          waybill_available: courier.waybill,
          on_demand_available: courier.on_demand,
          courier_rating: courier.ratings,
          courier_votes: courier.votes,
          pickup_station: courier.pickup_station,
          dropoff_station: courier.dropoff_station,
          origin_address: {
            address: originValidation.data.formatted_address,
            city: originValidation.data.city,
            state: originValidation.data.state,
            country: originValidation.data.country,
            postalCode: originValidation.data.postal_code,
            latitude: originValidation.data.latitude,
            longitude: originValidation.data.longitude,
          },
          destination_address: {
            address: destinationValidation.data.formatted_address,
            city: destinationValidation.data.city,
            state: destinationValidation.data.state,
            country: destinationValidation.data.country,
            postalCode: destinationValidation.data.postal_code,
            latitude: destinationValidation.data.latitude,
            longitude: destinationValidation.data.longitude,
          },
          package_details: {
            weight: order.order_items?.reduce((sum, item) => sum + (item.quantity * 0.5), 0) || 1.0,
            length: 30,
            width: 30,
            height: 15,
            value: order.subtotal,
            items: order.order_items?.map(item => ({
              name: item.menu_item?.name || 'Food Item',
              description: item.menu_item?.description || 'Food delivery',
              quantity: item.quantity,
              value: item.total_price,
            })) || [],
          },
          provider_rates_data: ratesResponse,
        });

        const savedQuote = await this.deliveryQuoteRepository.save(quote);
        quotes.push(savedQuote);
      }

      return quotes[0]; // Return first quote as primary
    } catch (error) {
      this.logger.error(`Failed to create Shipbubble quote: ${error.message}`);
      return null;
    }
  }

  /**
   * Create Uber quote
   */
  private async createUberQuote(order: Order): Promise<DeliveryQuote | null> {
    try {
      // Prepare quote request
      const quoteRequest: UberDirectDeliveryQuoteRequestDto = {
        pickup_address: JSON.stringify({
          street_address: [order.vendor?.address?.address_line_1 || 'Vendor Address'],
          city: order.vendor?.address?.city || 'Lagos',
          state: order.vendor?.address?.state || 'Lagos',
          zip_code: order.vendor?.address?.postal_code || '100001',
          country: 'NG',
        }),
        dropoff_address: JSON.stringify({
          street_address: [order.delivery_address?.address_line_1 || 'Customer Address'],
          city: order.delivery_address?.city || 'Lagos',
          state: order.delivery_address?.state || 'Lagos',
          zip_code: order.delivery_address?.postal_code || '100001',
          country: 'NG',
        }),
        pickup_phone_number: order.vendor?.user?.phone_number || '+1234567890',
        dropoff_phone_number: order.customer?.phone_number || '+1234567890',
        manifest_total_value: Math.round(order.subtotal * 100), // Convert to cents
        pickup_ready_dt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        pickup_deadline_dt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        dropoff_ready_dt: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 minutes from now
        dropoff_deadline_dt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
      };

      // Create quote
      const quoteResponse = await this.uberDeliveryService.createDeliveryQuote(quoteRequest);

      // Create quote record
      const quoteData = {
        provider: DeliveryProvider.UBER,
        status: QuoteStatus.PENDING,
        provider_quote_id: quoteResponse.id,
        quote_created_at: new Date(quoteResponse.created),
        expires_at: new Date(quoteResponse.expires),
        fee: quoteResponse.fee / 100, // Convert from cents
        currency: quoteResponse.currency,
        currency_type: quoteResponse.currency_type,
        estimated_delivery_time: new Date(quoteResponse.dropoff_eta),
        duration_minutes: quoteResponse.duration,
        pickup_duration_minutes: quoteResponse.pickup_duration,
        courier_name: 'Uber Direct',
        service_type: 'on_demand',
        origin_address: {
          address: order.vendor?.address?.address_line_1 || 'Vendor Address',
          city: order.vendor?.address?.city || 'Lagos',
          state: order.vendor?.address?.state || 'Lagos',
          country: 'NG',
          postalCode: order.vendor?.address?.postal_code,
        },
        destination_address: {
          address: order.delivery_address?.address_line_1 || 'Customer Address',
          city: order.delivery_address?.city || 'Lagos',
          state: order.delivery_address?.state || 'Lagos',
          country: 'NG',
          postalCode: order.delivery_address?.postal_code,
        },
        package_details: {
          weight: order.order_items?.reduce((sum, item) => sum + (item.quantity * 0.5), 0) || 1.0,
          length: 30,
          width: 30,
          height: 15,
          value: order.subtotal,
          items: order.order_items?.map(item => ({
            name: item.menu_item?.name || 'Food Item',
            description: item.menu_item?.description || 'Food delivery',
            quantity: item.quantity,
            value: item.total_price,
          })) || [],
        },
        provider_quote_data: quoteResponse,
      };

      const quote = this.deliveryQuoteRepository.create(quoteData);
      return await this.deliveryQuoteRepository.save(quote);
    } catch (error) {
      this.logger.error(`Failed to create Uber quote: ${error.message}`);
      return null;
    }
  }



  /**
   * Mark quote as used
   */
  async markQuoteAsUsed(quoteId: string, deliveryId: string): Promise<DeliveryQuote> {
    const quote = await this.deliveryQuoteRepository.findOne({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    quote.markAsUsed(deliveryId);
    return await this.deliveryQuoteRepository.save(quote);
  }

  /**
   * Get quote by ID
   */
  async getQuoteById(quoteId: string): Promise<DeliveryQuote> {
    const quote = await this.deliveryQuoteRepository.findOne({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  /**
   * Clean up expired quotes
   */
  async cleanupExpiredQuotes(): Promise<number> {
    const result = await this.deliveryQuoteRepository.update(
      { 
        status: QuoteStatus.PENDING,
        expires_at: { $lt: new Date() } as any,
      },
      { status: QuoteStatus.EXPIRED }
    );

    return result.affected || 0;
  }
}

