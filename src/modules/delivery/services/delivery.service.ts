import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { DeliveryProviderFactoryService } from './delivery-provider-factory.service';
import { Delivery, ShipmentStatus, DeliveryProvider, DeliveryTracking, DeliveryQuote, Order, OrderStatus, OrderType, NotificationType } from 'src/entities';
import { AddressService } from '../../user/services/address.service';
import {
  AddressValidationDto,
  DeliveryRateRequestDto,
  CreateShipmentDto,
  AddressValidationResponseDto,
  DeliveryRateResponseDto,
  CreateShipmentResponseDto,
  ShipmentTrackingResponseDto,
  DeliveryWebhookDto,
  ShipbubblePackageCategoriesResponseDto,
  ShipbubblePackageDimensionsResponseDto,
  ShipbubbleCreateShipmentRequestDto,
  ShipbubbleCreateShipmentResponseDto,
  ShipbubblePackageCategoryDto,
} from '../dto';
import { DeliveryResponseDto } from '../dto';
import { IntializeDeliveryDto } from '../interfaces/intializeDeliveryDto';
import { VendorService } from '../../vendor/services/vendor.service';
import { CartService } from '@/modules/cart/services/cart.service';
import { UberDeliveryService } from './uber-delivery.service';
import { ShipbubbleDeliveryService } from './shipbubble-delivery.service';
import { DeliveryProviderSelectorService } from './delivery-provider-selector.service';
import { getCurrencyForCountry } from '@/utils/currency-mapper';
import { UserService } from '@/modules/user/services/user.service';
import { NotificationSSEService } from '@/modules/notification/services/notification-sse.service';
import { NotificationService } from '@/modules/notification/notification.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly providerFactory: DeliveryProviderFactoryService,
    private readonly vendorService: VendorService,
    @Inject(forwardRef(() => AddressService))
    private readonly addressService: AddressService,
    @InjectRepository(DeliveryTracking)
    private readonly deliveryTrackingRepository: Repository<DeliveryTracking>,
    @InjectRepository(DeliveryQuote)
    private readonly deliveryQuoteRepository: Repository<DeliveryQuote>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly deliveryProviderSelector: DeliveryProviderSelectorService,
    private readonly cartService: CartService,
    private readonly shipbubbleDeliveryService: ShipbubbleDeliveryService,
    private readonly uberDeliveryService: UberDeliveryService,
    private readonly userService: UserService,
    private readonly notificationSSEService: NotificationSSEService,
    private readonly notificationService: NotificationService,

  ) {}

  private getProviderByCountry(country: string) {
    return this.providerFactory.getProviderByCountry(country);
  }


  async intializeDelivery (user_id: string,userDetails:{name: string, email: string, phone: string}, intializeDto : IntializeDeliveryDto) {

    const customerAddress = await this.addressService.getAddressByIdForDelivery(user_id, intializeDto.customer_address_id);

    const vendor = await this.vendorService.getVendorById(intializeDto.vendor_id);
    // get user cart items for this vendor
    const {subtotal, items} = await this.cartService.getCartByVendor(user_id, vendor.id);
    this.logger.log('Subtotal', subtotal);
    // select delivery provider based on vendor country
     const selectedDeliveryProvider = this.deliveryProviderSelector.selectProvider(vendor.address.country);
    // const selectedDeliveryProvider = DeliveryProvider.UBER;
    // const selectedDeliveryProvider = DeliveryProvider.SHIPBUBBLE;

      // Initialize delivery fee and provider
    let deliveryFee = 0;

    try {

      this.logger.log('Getting delivery quote');
      // Validate and get delivery quotes
      const deliveryQuoteResult = await this.getDeliveryQuoteForOrder(
        vendor,
        customerAddress,
        items,
        subtotal,
        selectedDeliveryProvider,
        userDetails
      );
      
      deliveryFee = deliveryQuoteResult.fee;
      this.logger.log('Delivery quote result', deliveryQuoteResult);
      // let currency be based on vendor country
      const currency = getCurrencyForCountry(vendor.address.country);
      
      // save the delivery quote to db
      const deliveryQuote = this.deliveryQuoteRepository.create({
        provider: selectedDeliveryProvider,
        fee: deliveryQuoteResult.fee,
        provider_quote_id: deliveryQuoteResult.quote_id,
        provider_request_token: deliveryQuoteResult.quote_requestToken,
        service_code: deliveryQuoteResult.qoute_ServiceCode,
        courier_id: deliveryQuoteResult.courier_id,
        currency: currency,
        quantity_of_items: items.length,
        items_price: subtotal,
        origin_address: {
          address: vendor.address.address_line_1,
          city: vendor.address.city,
          state: vendor.address.state,
          country: vendor.address.country,
          postalCode: vendor.address.postal_code,
          latitude: vendor.address.latitude,
          longitude: vendor.address.longitude,
          phone: vendor.user.phone_number,
          email: vendor.user.email,
          name: vendor.user.full_name,
        },
        destination_address: {
          address: customerAddress.address_line_2,
          city: customerAddress.city,
          state: customerAddress.state,
          country: customerAddress.country,
          postalCode: customerAddress.postal_code,
          latitude: customerAddress.latitude,
          longitude: customerAddress.longitude,
          phone: customerAddress.phone,
          email: customerAddress.email,
          name: customerAddress.name,
        }
      });

      await this.deliveryQuoteRepository.save(deliveryQuote);

      this.logger.log(`Delivery fee calculated: ${deliveryFee} via ${selectedDeliveryProvider}`);

      return {
        fee: deliveryQuote.fee,
        delivery_id: deliveryQuote.id,
      }
      
    } catch (error) {
      this.logger.error('Failed to get delivery quotes', error);
      throw new BadRequestException('Failed to get delivery quotes');
    }


  }

  async validateAddress(
    country: string,
    address: AddressValidationDto & { name: string; email: string; phone: string },
  ): Promise<AddressValidationResponseDto> {
    const provider = this.getProviderByCountry(country);
    
    if (!provider) {
      throw new BadRequestException(`No delivery provider available for country: ${country}`);
    }

    return await provider.validateAddress(address);
  }


  async getDeliveryRates(
    rateRequest: DeliveryRateRequestDto,
  ): Promise<DeliveryRateResponseDto[]> {
    const country = rateRequest.destination.country;
    const provider = this.getProviderByCountry(country);
    
    if (!provider) {
      throw new BadRequestException(`No delivery provider available for country: ${country}`);
    }

    // Use legacy method for backward compatibility
    if ('getDeliveryRates' in provider && typeof provider.getDeliveryRates === 'function') {
      return await provider.getDeliveryRates(rateRequest);
    }

    throw new BadRequestException(`Provider does not support legacy rate calculation`);
  }

 
  async createDelivery(
    deliveryQuoteId: string,
    orderId: string,
  ): Promise<DeliveryResponseDto> {
    this.logger.log(`Creating delivery for order ${orderId} using delivery quote ${deliveryQuoteId}`);

    // Check if delivery already exists for this order
    const existingDelivery = await this.deliveryRepository.findByOrderId(orderId);
    if (existingDelivery) {
      throw new BadRequestException('Delivery already exists for this order');
    }

    // Get the delivery quote
    const deliveryQuote = await this.deliveryQuoteRepository.findOne({
      where: { id: deliveryQuoteId }
    });

    if (!deliveryQuote) {
      throw new NotFoundException('Delivery quote not found');
    }

   this.logger.log('Delivery quote', deliveryQuote);
   this.logger.log('Delivery quote provider', deliveryQuote.origin_address);
   this.logger.log('Delivery quote destination address', deliveryQuote.destination_address);
   
    // Get the appropriate provider based on the quote
    let deliveryResult: any;
    let trackingNumber: string;
    let referenceNumber: string;
    let labelUrl: string;

    if (deliveryQuote.provider === DeliveryProvider.UBER) {
      // Use Uber's createDelivery method
      this.logger.log('Creating delivery with Uber Direct');
      
      // Get Uber delivery service
      const uberService = this.uberDeliveryService;
      
      // Create delivery request from quote data
      const deliveryRequest = {
        pickup_name: deliveryQuote.origin_address?.name || 'Vendor', // This should come from vendor data
        pickup_address: JSON.stringify({
          street_address:[ deliveryQuote.origin_address?.address],
          city: deliveryQuote.origin_address?.city,
          state: deliveryQuote.origin_address?.state,
          zip_code: deliveryQuote.origin_address?.postalCode,
          country: deliveryQuote.origin_address?.country,
        }),
        pickup_phone_number: deliveryQuote.origin_address?.phone || '+1234567890', // This should come from vendor data
        dropoff_name: deliveryQuote.destination_address?.name || 'Customer', // This should come from order data
        dropoff_address: JSON.stringify({
          street_address:[ deliveryQuote.destination_address?.address],
          city: deliveryQuote.destination_address?.city,
          state: deliveryQuote.destination_address?.state,
          zip_code: deliveryQuote.destination_address?.postalCode,
          country: deliveryQuote.destination_address?.country,
        }),
        dropoff_phone_number: deliveryQuote.destination_address?.phone || '+1234567890', // This should come from order data
        manifest_items: [{
          name: 'Food Order',
          description: 'Food delivery order',
          quantity: deliveryQuote.quantity_of_items || 1,
          price: Math.round((deliveryQuote.items_price || 0) * 100), 
        }],
        manifest_total_value: Math.round((deliveryQuote.package_details?.value || 0) * 100),
        pickup_ready_dt: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes from now
        pickup_deadline_dt: new Date(Date.now() + 50 * 60 * 1000).toISOString(), // 50 minutes from now
        dropoff_ready_dt: new Date(Date.now() + 50 * 60 * 1000).toISOString(), // 50 minutes from now
        dropoff_deadline_dt: new Date(Date.now() + 140 * 60 * 1000).toISOString(), // 140 minutes from now
        manifest_reference: orderId,
        external_store_id: orderId,
        external_id: orderId,
        quote_id: deliveryQuote.provider_quote_id,
        deliverable_action: 'deliverable_action_meet_at_door' as const,
        undeliverable_action: 'return' as const,
        dropoff_notes: 'Please ring the doorbell',
      };

      this.logger.log('Delivery request', deliveryRequest);

      deliveryResult = await uberService.createDelivery(deliveryRequest);
      this.logger.log('Delivery response', deliveryResult);
      trackingNumber = deliveryResult.id;
      referenceNumber = deliveryResult.external_id || orderId;
      labelUrl = deliveryResult.tracking_url;

    } else if (deliveryQuote.provider === DeliveryProvider.SHIPBUBBLE) {
      // Use Shipbubble's createShipmentLabel method
      this.logger.log('Creating shipment label with Shipbubble');
      
      // Get Shipbubble delivery service
      const shipbubbleService = this.shipbubbleDeliveryService;
      
      // Create shipment request from quote data
      const shipmentRequest = {
        request_token: deliveryQuote.provider_request_token,
        courier_id: deliveryQuote.courier_id,
        service_code: deliveryQuote.service_code,
      };

      this.logger.log('Shipment request', shipmentRequest);

      deliveryResult = await shipbubbleService.createShipmentLabel(shipmentRequest);
      this.logger.log('Shipment response', deliveryResult);
      trackingNumber = deliveryResult.data.tracking_number || deliveryResult.data.tracking_url
      referenceNumber = deliveryResult.data.reference_number || orderId;
      labelUrl = deliveryResult.data.tracking_url

    } else {
      throw new BadRequestException(`Unsupported delivery provider: ${deliveryQuote.provider}`);
    }
    
    deliveryQuote.trackingNumber = trackingNumber;
    deliveryQuote.labelUrl = labelUrl;
    deliveryQuote.referenceNumber = referenceNumber;
    await this.deliveryQuoteRepository.save(deliveryQuote);

    return this.mapToDeliveryResponse(deliveryQuote);
  }

 
  async trackDelivery(trackingNumber: string): Promise<ShipmentTrackingResponseDto> {
    const delivery = await this.deliveryRepository.findByTrackingNumber(trackingNumber);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // Get provider based on the stored provider type
    const deliveryProvider = delivery.provider === DeliveryProvider.SHIPBUBBLE 
      ? this.providerFactory.getShipbubbleProvider()
      : this.providerFactory.getUberProvider();

    const trackingData = await deliveryProvider.trackShipment(trackingNumber);

    // Update delivery status based on tracking data
    const newStatus = this.mapTrackingStatusToDeliveryStatus(trackingData.status);
    if (newStatus !== delivery.status) {
      await this.deliveryRepository.updateStatus(delivery.id, newStatus);
      
      // Add tracking event
      await this.addTrackingEvent(delivery.id, trackingData.status, 'Status updated', trackingData.currentLocation);
    }

    // Convert to standard format
    return {
      success: trackingData.success,
      trackingNumber: trackingData.trackingNumber,
      status: trackingData.status,
      statusDescription: 'Tracking information retrieved',
      currentLocation: trackingData.currentLocation,
      events: trackingData.events || [],
      estimatedDelivery: trackingData.estimatedDelivery,
      courier: 'courier',
      service: 'service',
    };
  }

 
  async cancelDelivery(trackingNumber: string): Promise<boolean> {
    const delivery = await this.deliveryRepository.findByTrackingNumber(trackingNumber);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status === ShipmentStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel delivered delivery');
    }

    // Get provider based on the stored provider type
    const deliveryProvider = delivery.provider === DeliveryProvider.SHIPBUBBLE 
      ? this.providerFactory.getShipbubbleProvider()
      : this.providerFactory.getUberProvider();

    const cancelled = await deliveryProvider.cancelShipment(trackingNumber);
    if (cancelled) {
      await this.deliveryRepository.updateStatus(delivery.id, ShipmentStatus.CANCELLED);
      await this.addTrackingEvent(delivery.id, 'cancelled', 'Delivery cancelled by user');
    }

    return cancelled;
  }

 
  async processWebhook(
    provider: DeliveryProvider,
    payload: any,
    signature: string,
  ): Promise<DeliveryWebhookDto> {
    // Get provider based on the provider type
    const deliveryProvider = provider === DeliveryProvider.SHIPBUBBLE 
      ? this.providerFactory.getShipbubbleProvider()
      : this.providerFactory.getUberProvider();

    const webhookResult = await deliveryProvider.processWebhook(payload, signature);
    
    if (webhookResult.success && webhookResult.trackingId) {
      // Update delivery status based on webhook event
      // GET delivery quote with trackingid
      const deliveryQuote = await this.deliveryQuoteRepository.findOne({ 
        where: { provider_quote_id: webhookResult.trackingId },
        relations: ['order', 'order.customer']
      });

      // if there is delivery, update the order status and send notifications to the customer
      if (deliveryQuote && deliveryQuote.order) {
        this.logger.log(`Processing webhook for delivery quote ${deliveryQuote.id} and order ${deliveryQuote.order.id}`);
        
        // Map delivery status to order status
        const newOrderStatus = this.mapDeliveryStatusToOrderStatus(webhookResult.status || webhookResult.eventType);
        
        if (newOrderStatus) {
          const order = deliveryQuote.order;
          const previousStatus = order.order_status;
          
          // Only update if status has changed
          if (previousStatus !== newOrderStatus) {
            this.logger.log(`Updating order ${order.id} status from ${previousStatus} to ${newOrderStatus}`);
            
            // Update order status based on delivery status
            order.order_status = newOrderStatus;
            
            // Update additional fields based on status
            if (newOrderStatus === OrderStatus.OUT_FOR_DELIVERY) {
              // Order is out for delivery
              if (!order.order_ready_at) {
                order.order_ready_at = new Date();
              }
            } else if (newOrderStatus === OrderStatus.DELIVERED) {
              // Order has been delivered
              order.delivered_at = new Date();
            }
            
            // Save updated order using OrderRepository
            await this.orderRepository.save(order);
            
            // Get customer ID
            const customerId = order.customer_id;
            const orderNumber = order.order_number;
            
            // Send SSE notification to customer
            try {
              const notificationMessage = this.getOrderStatusNotificationMessage(newOrderStatus, orderNumber, order.order_type);
              this.notificationSSEService.sendOrderUpdate(
                customerId,
                order.id,
                newOrderStatus,
                notificationMessage
              );
              this.logger.log(`SSE notification sent to customer ${customerId} for order ${order.id} status: ${newOrderStatus}`);
            } catch (error) {
              this.logger.error(`Failed to send SSE notification for order ${order.id}: ${error.message}`);
            }
            
            // Send push notification to customer
            try {
              const pushTitle = `Order #${orderNumber} - ${this.getOrderStatusTitle(newOrderStatus)}`;
              const pushMessage = this.getOrderStatusNotificationMessage(newOrderStatus, orderNumber, order.order_type);
              
              await this.notificationService.sendPushNotification(
                customerId,
                NotificationType.ORDER_UPDATE,
                pushTitle,
                pushMessage,
                {
                  order_id: order.id,
                  order_number: orderNumber,
                  status: newOrderStatus,
                  order_type: order.order_type,
                  delivery_status: webhookResult.status || webhookResult.eventType,
                  delivery_provider: provider
                }
              );
              this.logger.log(`Push notification sent to customer ${customerId} for order ${order.id} status: ${newOrderStatus}`);
            } catch (error) {
              this.logger.error(`Failed to send push notification for order ${order.id}: ${error.message}`);
            }
          } else {
            this.logger.log(`Order ${order.id} status unchanged: ${previousStatus}`);
          }
        } else {
          this.logger.warn(`Could not map delivery status ${webhookResult.status || webhookResult.eventType} to order status`);
        }
      } else {
        this.logger.warn(`No order found for delivery quote ${webhookResult.trackingId}`);
      }
    }

    return webhookResult;
  }




  private async addTrackingEvent(
    deliveryId: string,
    status: string,
    description: string,
    location?: string,
  ): Promise<void> {
    const trackingEvent = this.deliveryTrackingRepository.create({
      delivery_id: deliveryId,
      status,
      description,
      location,
      timestamp: new Date(),
    });

    await this.deliveryTrackingRepository.save(trackingEvent);
  }


  private mapTrackingStatusToDeliveryStatus(trackingStatus: string): ShipmentStatus {
    switch (trackingStatus.toLowerCase()) {
      case 'picked_up':
        return ShipmentStatus.PICKED_UP;
      case 'in_transit':
        return ShipmentStatus.IN_TRANSIT;
      case 'out_for_delivery':
        return ShipmentStatus.OUT_FOR_DELIVERY;
      case 'delivered':
        return ShipmentStatus.DELIVERED;
      case 'failed':
        return ShipmentStatus.FAILED;
      case 'cancelled':
        return ShipmentStatus.CANCELLED;
      case 'returned':
        return ShipmentStatus.RETURNED;
      default:
        return ShipmentStatus.PENDING;
    }
  }


  private mapWebhookEventToDeliveryStatus(eventType: string): ShipmentStatus | null {
    switch (eventType) {
      case 'shipment.picked_up':
        return ShipmentStatus.PICKED_UP;
      case 'shipment.in_transit':
        return ShipmentStatus.IN_TRANSIT;
      case 'shipment.out_for_delivery':
        return ShipmentStatus.OUT_FOR_DELIVERY;
      case 'shipment.delivered':
        return ShipmentStatus.DELIVERED;
      case 'shipment.failed':
        return ShipmentStatus.FAILED;
      case 'shipment.cancelled':
        return ShipmentStatus.CANCELLED;
      case 'shipment.returned':
        return ShipmentStatus.RETURNED;
      default:
        return null;
    }
  }

  async getPackageCategories(): Promise<ShipbubblePackageCategoriesResponseDto> {
    this.logger.log('Getting package categories from Shipbubble');
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.getPackageCategories();
  }

  
  async getPackageDimensions(): Promise<ShipbubblePackageDimensionsResponseDto> {
    this.logger.log('Getting package dimensions from Shipbubble');
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.getPackageDimensions();
  }


  async createShipmentLabel(shipmentRequest: ShipbubbleCreateShipmentRequestDto): Promise<ShipbubbleCreateShipmentResponseDto> {
    this.logger.log(`Creating shipment label with request token: ${shipmentRequest.request_token}`);
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.createShipmentLabel(shipmentRequest);
  }


  async fetchShippingRates(ratesRequest: any): Promise<any> {
    this.logger.log('Fetching shipping rates from Shipbubble');
    const shipbubbleProvider = this.providerFactory.getShipbubbleProvider();
    return await shipbubbleProvider.fetchShippingRates(ratesRequest);
  }

 
  getSupportedCountries(): string[] {
    return this.providerFactory.getSupportedCountries();
  }

  isCountrySupported(country: string): boolean {
    return this.providerFactory.isCountrySupported(country);
  }


  getProviderNameByCountry(country: string): string {
    return this.providerFactory.getProviderNameByCountry(country);
  }

  private mapToDeliveryResponse(delivery: DeliveryQuote): DeliveryResponseDto {
    return {
      id: delivery.id,
      orderId: delivery.order_id,
      provider: delivery.provider,
      trackingNumber: delivery.trackingNumber,
      status: delivery.status,
      cost: delivery.fee,
      courier: delivery.courier_name,
      service: delivery.service_type,
      createdAt: delivery.created_at,
      updatedAt: delivery.updated_at,
    };
  }

  private async getDeliveryQuoteForOrder(
    vendor: any,
    deliveryAddress: any,
    cartItems: any[],
    subtotal: number,
    provider: DeliveryProvider,
    userDetails: {name: string, email: string, phone: string}
  ): Promise<{fee: number, quote_requestToken?: string , quote_id:string, qoute_ServiceCode?:string, courier_id?:string}> {
    this.logger.log(`Getting delivery quotes for provider: ${provider}`);

    // Validate addresses and get address codes for Shipbubble
    if (provider === DeliveryProvider.SHIPBUBBLE) {
      return await this.getShipbubbleQuoteForOrder(vendor, deliveryAddress, cartItems, subtotal, userDetails);
    } else if (provider === DeliveryProvider.UBER) {
      this.logger.log('Getting Uber quote');
      return await this.getUberQuoteForOrder(vendor, deliveryAddress, cartItems, subtotal);
    }

    throw new Error(`Unsupported delivery provider: ${provider}`);
  }

   private async getShipbubbleQuoteForOrder(
    vendor: any,
    deliveryAddress: any,
    cartItems: any[],
    subtotal: number,
    userDetails: {name: string, email: string, phone: string}
  ): Promise<{fee: number, quote_requestToken: string, quote_ServiceCode: string, quote_id: string, courier_id: string}> {
    const shipbubbleService = this.shipbubbleDeliveryService;

    let vendorAddressCode = vendor.address.shipbubble_address_code;
    let customerAddressCode = deliveryAddress.shipbubble_address_code;

    // Check if vendor address doesn't have shipbubble address code, if not validate it
    if (!vendorAddressCode) {
      // Validate vendor address and get/save address code
      const vendorAddressValidation = await shipbubbleService.validateAddress({
        name: vendor.business_name || 'Vendor',
        email: vendor.email || 'vendor@example.com',
        phone: vendor.phone || '+2348000000000',
        address:vendor.address.address_line_1 || vendor.address.address_line_2,
        latitude: vendor.address.latitude,
        longitude: vendor.address.longitude,
      });

      this.logger.log('Vendor address validation', vendorAddressValidation);

      if (!vendorAddressValidation.success || !vendorAddressValidation.data) {
        throw new Error('Vendor address validation failed');
      }

      // Update vendor address with Shipbubble address code if needed
      if (vendorAddressValidation.data.address_code) {
        vendorAddressCode = vendorAddressValidation.data.address_code;
        await this.addressService.updateAddressCode(vendor.address.id, vendorAddressCode);
      }
    }

    if (!customerAddressCode) {
      // Validate customer delivery address and get/save address code
      const customerAddressValidation = await shipbubbleService.validateAddress({
        name: userDetails.name, 
        email: userDetails.email, 
        phone: userDetails.phone, 
        address: deliveryAddress.address_line_2 || deliveryAddress.address_line_1,
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude,
      });

      this.logger.log('Customer address validation', customerAddressValidation);

      if (!customerAddressValidation.success || !customerAddressValidation.data) {
        throw new Error('Customer address validation failed');
      }

      // Update customer address with Shipbubble address code if needed
      if (customerAddressValidation.data.address_code) {
        customerAddressCode = customerAddressValidation.data.address_code;
        await this.addressService.updateAddressCode(deliveryAddress.id, customerAddressCode);
      }
    }

    // Get package categories
    const categories = await shipbubbleService.getPackageCategories();
    this.logger.log('Shipbubble package categories', categories);
    
    // Choose food category
    const foodCategory = categories.data?.find((category: ShipbubblePackageCategoryDto) => category.category.toLowerCase() === 'food');
    const categoryId = foodCategory?.category_id || categories.data?.[0]?.category_id || 1;


    this.logger.log("cart items",cartItems)
    // Calculate package dimensions based on cart items
    const packageDimensions = this.calculatePackageDimensions(cartItems);
    
    this.logger.log('Package dimensions', packageDimensions);

    // Prepare Shipbubble rates request
    const ratesRequest = {
      sender_address_code: vendorAddressCode,
      reciever_address_code: customerAddressCode,
      category_id: categoryId,
      package_items: cartItems.map(item => ({
        name: item.menu_item?.name || 'Food Item',
        description: item.menu_item?.description || 'Food delivery',
        unit_weight: (item.quantity * 0.5).toString(), // Estimate 0.5kg per item
        unit_amount: item.unit_price.toString(),
        quantity: item.quantity.toString(),
      })),
      package_dimension: packageDimensions,
      pickup_date: new Date().toISOString().split('T')[0], // Today's date
      service_type:"pickup",
    };

    this.logger.log("Rate Request",ratesRequest)

    // Fetch rates from Shipbubble
    const ratesResponse = await shipbubbleService.fetchShippingRates(ratesRequest);

    this.logger.log('Shipbubble rates response', ratesResponse);

    if (!ratesResponse.couriers || ratesResponse.couriers.length === 0) {
      throw new Error('No courier options available from Shipbubble');
    }

    // Find the lowest fee, the service code and courier id of the lowest fee
    const lowestFeeCourier = ratesResponse.couriers.reduce((min, courier) => 
      courier.total < min.total ? courier : min,
      ratesResponse.couriers[0]
    );
    
    const lowestFeeServiceCode = lowestFeeCourier.service_code;
    const lowestFeeCourierId = lowestFeeCourier.courier_id.toString();
    const lowestFee = lowestFeeCourier.total;


    this.logger.log(`Shipbubble lowest delivery fee: ${lowestFee}`);

    // Return request token too for later use
    const requestToken = ratesResponse.request_token;
    return {
      fee: lowestFee,
      quote_requestToken: requestToken,
      quote_id: lowestFeeCourierId,
      quote_ServiceCode: lowestFeeServiceCode,
      courier_id: lowestFeeCourierId
    };
  }

  private async getUberQuoteForOrder(
    vendor: any,
    deliveryAddress: any,
    cartItems: any[],
    subtotal: number
  ): Promise<{fee: number, quote_id:string }> {
    this.logger.log('Getting Uber quote');
    const uberService = this.uberDeliveryService;

    // get customer's phone 
    const user = await this.userService.findById(deliveryAddress.user_id);

    // Prepare Uber Direct quote request
    const quoteRequest = {
      pickup_address: JSON.stringify({
        street_address: [vendor.address.address_line_1],
        city: vendor.address.city,
        state: vendor.address.state,
        zip_code: vendor.address.postal_code || '100001',
        country: vendor.address.country,
      }),
      dropoff_address: JSON.stringify({
        street_address: [deliveryAddress.address_line_2],
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        zip_code: deliveryAddress.postal_code || '100001',
        country: deliveryAddress.country,
      }),
      pickup_phone_number: vendor.phone || '+2348020542618',
      dropoff_phone_number: user.phone_number || '+2348020542618',
      manifest_total_value: Math.round(subtotal * 100), // Convert to cents
      pickup_ready_dt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      pickup_deadline_dt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      dropoff_ready_dt: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 minutes from now
      dropoff_deadline_dt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    };

    this.logger.log('Quote request', quoteRequest);

    this.logger.log('Creating delivery quote');
    // Create quote with Uber Direct
    const quoteResponse = await uberService.createDeliveryQuote(quoteRequest);

    this.logger.log('Quote response', quoteResponse);

    // Convert fee from cents to naira (assuming USD to NGN conversion or direct NGN)
    const deliveryFee = quoteResponse.fee / 100;

    this.logger.log(`Uber Direct delivery fee: ${deliveryFee}`);

    return {
      fee: deliveryFee,
      quote_id:quoteResponse.id,
    };
  }

 
  private calculatePackageDimensions(cartItems: any[]): {length: number, width: number, height: number} {
    const totalQuantity = cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    
    // Base dimensions for food delivery
    let length = 30; // cm
    let width = 30;  // cm
    let height = 15; // cm

    // Scale dimensions based on quantity
    if (totalQuantity > 5) {
      length = 40;
      width = 40;
      height = 20;
    } else if (totalQuantity > 10) {
      length = 50;
      width = 40;
      height = 25;
    }

    return { length, width, height };
  }

  /**
   * Map delivery status to order status
   */
  private mapDeliveryStatusToOrderStatus(deliveryStatus: string): OrderStatus | null {
    if (!deliveryStatus) return null;

    const status = deliveryStatus.toLowerCase();
    
    // Map shipment statuses
    if (status.includes('picked') || status.includes('pickup') || status.includes('picked_up')) {
      return OrderStatus.OUT_FOR_DELIVERY;
    }
    
    if (status.includes('transit') || status.includes('in_transit')) {
      return OrderStatus.OUT_FOR_DELIVERY;
    }
    
    if (status.includes('out_for_delivery') || status.includes('out for delivery')) {
      return OrderStatus.OUT_FOR_DELIVERY;
    }
    
    if (status.includes('delivered') || status.includes('completed')) {
      return OrderStatus.DELIVERED;
    }
    
    if (status.includes('cancelled') || status.includes('canceled')) {
      return OrderStatus.CANCELLED;
    }
    
    // Map webhook event types
    if (status.includes('shipment.picked_up')) {
      return OrderStatus.OUT_FOR_DELIVERY;
    }
    
    if (status.includes('shipment.in_transit')) {
      return OrderStatus.OUT_FOR_DELIVERY;
    }
    
    if (status.includes('shipment.out_for_delivery')) {
      return OrderStatus.OUT_FOR_DELIVERY;
    }
    
    if (status.includes('shipment.delivered')) {
      return OrderStatus.DELIVERED;
    }
    
    if (status.includes('shipment.cancelled')) {
      return OrderStatus.CANCELLED;
    }
    
    // Default: no mapping
    return null;
  }

  /**
   * Get notification message based on order status
   */
  private getOrderStatusNotificationMessage(status: OrderStatus, orderNumber: string, orderType: OrderType): string {
    switch (status) {
      case OrderStatus.OUT_FOR_DELIVERY:
        return `Your order #${orderNumber} is out for delivery! Track your order for real-time updates.`;
      
      case OrderStatus.DELIVERED:
        if (orderType === OrderType.PICKUP) {
          return `Your order #${orderNumber} has been delivered. Thank you for your order!`;
        }
        return `Your order #${orderNumber} has been delivered! We hope you enjoy your meal.`;
      
      case OrderStatus.CANCELLED:
        return `Your order #${orderNumber} has been cancelled. Please contact support if you have any questions.`;
      
      default:
        return `Your order #${orderNumber} status has been updated to ${status}.`;
    }
  }

  /**
   * Get notification title based on order status
   */
  private getOrderStatusTitle(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'Out for Delivery';
      
      case OrderStatus.DELIVERED:
        return 'Delivered';
      
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }
}
