/**
 * Base delivery provider interface with minimal common functionality
 */
export interface BaseDeliveryProviderInterface {
  /**
   * Get provider name
   * @returns string
   */
  getProviderName(): string;

  /**
   * Get supported countries
   * @returns string[]
   */
  getSupportedCountries(): string[];

  /**
   * Check if provider supports real-time tracking
   * @returns boolean
   */
  supportsRealTimeTracking(): boolean;

  /**
   * Check if provider requires consumer confirmation
   * @returns boolean
   */
  requiresConsumerConfirmation(): boolean;

  /**
   * Get provider workflow type
   * @returns 'on_demand' | 'scheduled' | 'batch'
   */
  getWorkflowType(): 'on_demand' | 'scheduled' | 'batch';

  /**
   * Get provider-specific features
   * @returns string[]
   */
  getProviderFeatures(): string[];
}
