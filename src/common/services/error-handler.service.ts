import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';

export interface ErrorDetails {
  message: string;
  code?: string;
  field?: string;
  constraint?: string;
  table?: string;
  column?: string;
  detail?: string;
  hint?: string;
  maxLength?: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    type: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    method?: string;
    details?: ErrorDetails[];
    code?: string;
    field?: string;
    constraint?: string;
    table?: string;
    column?: string;
    detail?: string;
    hint?: string;
    maxLength?: number;
  };
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle database errors and convert them to user-friendly messages
   */
  handleDatabaseError(error: QueryFailedError | EntityNotFoundError | TypeORMError): ErrorResponse {
    if (error instanceof QueryFailedError) {
      return this.handleQueryFailedError(error);
    } else if (error instanceof EntityNotFoundError) {
      return this.handleEntityNotFoundError(error);
    } else if (error instanceof TypeORMError) {
      return this.handleTypeORMError(error);
    }

    // Fallback for unknown database errors
    return {
      success: false,
      error: {
        message: 'Database operation failed',
        type: 'database_error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle SQL query failures with specific error codes
   */
  private handleQueryFailedError(error: QueryFailedError): ErrorResponse {
    const pgError = error as any;
    let message = 'Database constraint violation';
    let statusCode = HttpStatus.BAD_REQUEST;
    let details: Partial<ErrorDetails> = {};

    if (pgError.code) {
      details.code = pgError.code;
      details.constraint = pgError.constraint;
      details.table = pgError.table;
      details.column = pgError.column;
      details.detail = pgError.detail;
      details.hint = pgError.hint;

      switch (pgError.code) {
        case '23505': // unique_violation
          message = 'Data already exists with the same unique identifier';
          details.field = pgError.column;
          details.constraint = pgError.constraint;
          break;
        case '23503': // foreign_key_violation
          message = 'Referenced data does not exist';
          details.field = pgError.column;
          details.table = pgError.table;
          break;
        case '23502': // not_null_violation
          message = 'Required field is missing';
          details.field = pgError.column;
          details.table = pgError.table;
          break;
        case '22P02': // invalid_text_representation
          message = 'Invalid data format provided';
          details.field = pgError.column;
          break;
        case '42703': // undefined_column
          message = 'Invalid field specified';
          details.field = pgError.column;
          details.table = pgError.table;
          break;
        case '42P01': // undefined_table
          message = 'Invalid table specified';
          details.table = pgError.table;
          break;
        case '42824': // wrong_object_type
          message = 'Invalid data type for field';
          details.field = pgError.column;
          break;
        case '22001': // string_data_right_truncation
          message = 'Data too long for field';
          details.field = pgError.column;
          details.maxLength = this.extractMaxLength(pgError.message);
          break;
        case '23514': // check_violation
          message = 'Data does not meet validation requirements';
          details.field = pgError.column;
          details.constraint = pgError.constraint;
          break;
        default:
          message = pgError.message || 'Database constraint violation';
      }
    }

    return {
      success: false,
      error: {
        message,
        type: 'database_error',
        statusCode,
        timestamp: new Date().toISOString(),
        ...details,
      },
    };
  }

  /**
   * Handle entity not found errors
   */
  private handleEntityNotFoundError(error: EntityNotFoundError): ErrorResponse {
    return {
      success: false,
      error: {
        message: 'Requested data not found',
        type: 'entity_not_found',
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle other TypeORM errors
   */
  private handleTypeORMError(error: TypeORMError): ErrorResponse {
    return {
      success: false,
      error: {
        message: 'Database operation failed',
        type: 'typeorm_error',
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        detail: error.message,
      },
    };
  }

  /**
   * Extract maximum length from error message
   */
  private extractMaxLength(message: string): number | null {
    const match = message.match(/character varying\((\d+)\)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Create a custom HTTP exception with database error details
   */
  createDatabaseException(error: QueryFailedError | EntityNotFoundError | TypeORMError): HttpException {
    const errorResponse = this.handleDatabaseError(error);
    return new HttpException(errorResponse, errorResponse.error.statusCode);
  }

  /**
   * Log error with context for debugging
   */
  logError(error: any, context?: any): void {
    this.logger.error('Error occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if an error is a database error
   */
  isDatabaseError(error: any): boolean {
    return (
      error instanceof QueryFailedError ||
      error instanceof EntityNotFoundError ||
      error instanceof TypeORMError
    );
  }
} 