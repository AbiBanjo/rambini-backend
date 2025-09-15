import { PaymentMethod } from 'src/entities';

export interface PaymentProviderInterface {
  /**
   * Initialize a payment with the external provider
   * @param amount Payment amount
   * @param currency Payment currency
   * @param reference Payment reference
   * @param metadata Additional payment metadata
   * @returns Promise<PaymentInitiationResult>
   */
  initializePayment(
    amount: number,
    currency: string,
    reference: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitiationResult>;

  /**
   * Verify payment status with the external provider
   * @param reference Payment reference
   * @returns Promise<PaymentVerificationResult>
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;

  /**
   * Process payment webhook from external provider
   * @param payload Webhook payload
   * @param signature Webhook signature for verification
   * @returns Promise<PaymentWebhookResult>
   */
  processWebhook(payload: any, signature: string): Promise<PaymentWebhookResult>;

  /**
   * Refund a payment
   * @param reference Payment reference
   * @param amount Refund amount (optional, defaults to full amount)
   * @param reason Refund reason
   * @returns Promise<RefundResult>
   */
  refundPayment(
    reference: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult>;

  /**
   * Get supported payment methods
   * @returns PaymentMethod[]
   */
  getSupportedPaymentMethods(): PaymentMethod[];
}

export interface PaymentInitiationResult {
  success: boolean;
  payment_url?: string;
  external_reference?: string;
  gateway_response?: Record<string, any>;
  error?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  external_reference?: string;
  gateway_response?: Record<string, any>;
  error?: string;
}

export interface PaymentWebhookResult {
  success: boolean;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  external_reference?: string;
  amount?: number;
  gateway_response?: Record<string, any>;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refund_reference?: string;
  gateway_response?: Record<string, any>;
  error?: string;
}
