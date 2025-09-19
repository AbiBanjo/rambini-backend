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
