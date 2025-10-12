import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { DeliveryService } from '../services/delivery.service';
import { DeliveryProvider } from 'src/entities';
import { DeliveryWebhookDto } from '../dto';

@ApiTags('Delivery Webhooks')
@Controller('delivery/webhooks')
export class DeliveryWebhookController {
  private readonly logger = new Logger(DeliveryWebhookController.name);

  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('shipbubble')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger as this is a webhook endpoint
  @ApiOperation({ summary: 'Shipbubble delivery webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  async handleShipbubbleWebhook(
    @Body() payload: any,
    @Headers('x-ship-signature') signature: string,
  ): Promise<{ success: boolean }> {
    this.logger.log('Received Shipbubble webhook');

    try {
      const result = await this.deliveryService.processWebhook(
        DeliveryProvider.SHIPBUBBLE,
        payload,
        signature,
      );

      return { success: result.success };
    } catch (error) {
      this.logger.error(`Failed to process Shipbubble webhook: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('uber')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger as this is a webhook endpoint
  @ApiOperation({ summary: 'Uber Direct delivery webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  async handleUberWebhook(
    @Body() payload: any,
    @Headers('x-uber-signature') uberSignature: string,
    @Headers('x-postmates-signature') postmatesSignature: string,
  ): Promise<{ success: boolean }> {
    this.logger.log('Received Uber Direct webhook');

    try {
      // Uber Direct supports both x-uber-signature and x-postmates-signature
      // Prefer x-uber-signature if available
      const signature = uberSignature || postmatesSignature;

      if (!signature) {
        this.logger.error('No signature header found in Uber webhook');
        throw new BadRequestException('Missing webhook signature');
      }

      const result = await this.deliveryService.processWebhook(
        DeliveryProvider.UBER,
        payload,
        signature,
      );

      return { success: result.success };
    } catch (error) {
      this.logger.error(`Failed to process Uber webhook: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook processed',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  async testWebhook(@Body() webhookDto: DeliveryWebhookDto): Promise<{ success: boolean }> {
    this.logger.log('Received test webhook');

    // This is for testing purposes only
    return { success: true };
  }
}
