import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, TransactionStatus } from 'src/entities';

export class TransactionDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Wallet ID' })
  wallet_id: string;

  @ApiProperty({ description: 'Transaction type', enum: TransactionType })
  transaction_type: TransactionType;

  @ApiProperty({ description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ description: 'Balance before transaction' })
  balance_before: number;

  @ApiProperty({ description: 'Balance after transaction' })
  balance_after: number;

  @ApiProperty({ description: 'Transaction description' })
  description: string;

  @ApiProperty({ description: 'Reference ID', required: false })
  reference_id?: string;

  @ApiProperty({ description: 'External reference', required: false })
  external_reference?: string;

  @ApiProperty({ description: 'Transaction status', enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ description: 'Failure reason', required: false })
  failure_reason?: string;

  @ApiProperty({ description: 'Processed at', required: false })
  processed_at?: Date;

  @ApiProperty({ description: 'Reversed at', required: false })
  reversed_at?: Date;

  @ApiProperty({ description: 'Reversal reason', required: false })
  reversal_reason?: string;

  @ApiProperty({ description: 'Transaction metadata', required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Created at' })
  created_at: Date;

  @ApiProperty({ description: 'Updated at' })
  updated_at: Date;

  // Virtual properties
  @ApiProperty({ description: 'Is credit transaction' })
  is_credit: boolean;

  @ApiProperty({ description: 'Is debit transaction' })
  is_debit: boolean;

  @ApiProperty({ description: 'Is completed' })
  is_completed: boolean;

  @ApiProperty({ description: 'Is pending' })
  is_pending: boolean;

  @ApiProperty({ description: 'Is failed' })
  is_failed: boolean;

  @ApiProperty({ description: 'Is reversed' })
  is_reversed: boolean;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ description: 'List of transactions', type: [TransactionDto] })
  transactions: TransactionDto[];

  @ApiProperty({ description: 'Total number of transactions' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  total_pages: number;

  @ApiProperty({ description: 'Has next page' })
  has_next: boolean;

  @ApiProperty({ description: 'Has previous page' })
  has_previous: boolean;
}

export class TransactionQueryDto {
  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  page?: number = 1;

  @ApiProperty({ description: 'Number of items per page', required: false, default: 10 })
  limit?: number = 10;

  @ApiProperty({ description: 'Transaction type filter', enum: TransactionType, required: false })
  transaction_type?: TransactionType;

  @ApiProperty({ description: 'Transaction status filter', enum: TransactionStatus, required: false })
  status?: TransactionStatus;

  @ApiProperty({ description: 'Start date filter (ISO string)', required: false })
  start_date?: string;

  @ApiProperty({ description: 'End date filter (ISO string)', required: false })
  end_date?: string;

  @ApiProperty({ description: 'Search term for description', required: false })
  search?: string;
}
