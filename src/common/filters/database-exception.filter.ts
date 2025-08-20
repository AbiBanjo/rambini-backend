import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';

@Catch(QueryFailedError, EntityNotFoundError, TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError | TypeORMError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log the full error for debugging
    this.logger.error(`Database error occurred: ${exception.message}`, {
      error: exception,
      url: request.url,
      method: request.method,
      body: request.body,
      params: request.params,
      query: request.query,
      user: request.user?.id,
      timestamp: new Date().toISOString(),
    });

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database operation failed';
    let details: any = {};

    if (exception instanceof QueryFailedError) {
      // Handle SQL query failures
      status = HttpStatus.BAD_REQUEST;
      
      // Extract PostgreSQL error details
      const pgError = exception as any;
      if (pgError.code) {
        details.code = pgError.code;
        details.constraint = pgError.constraint;
        details.table = pgError.table;
        details.column = pgError.column;
        details.detail = pgError.detail;
        details.hint = pgError.hint;
      }

      // Provide user-friendly messages for common database errors
      switch (pgError.code) {
        case '23505': // unique_violation
          message = 'Data already exists with the same unique identifier';
          break;
        case '23503': // foreign_key_violation
          message = 'Referenced data does not exist';
          break;
        case '23502': // not_null_violation
          message = 'Required field is missing';
          break;
        case '22P02': // invalid_text_representation
          message = 'Invalid data format provided';
          break;
        case '42703': // undefined_column
          message = 'Invalid field specified';
          break;
        case '42P01': // undefined_table
          message = 'Invalid table specified';
          break;
        case '42824': // wrong_object_type
          message = 'Invalid data type for field';
          break;
        case '22001': // string_data_right_truncation
          message = 'Data too long for field';
          break;
        case '23514': // check_violation
          message = 'Data does not meet validation requirements';
          break;
        default:
          message = pgError.message || 'Database constraint violation';
      }

      // Add specific details for common errors
      if (pgError.code === '22001' && pgError.column) {
        details.field = pgError.column;
        details.maxLength = this.extractMaxLength(pgError.message);
      }

      if (pgError.code === '23505' && pgError.constraint) {
        details.constraintName = pgError.constraint;
        details.field = pgError.column;
      }

    } else if (exception instanceof EntityNotFoundError) {
      // Handle entity not found errors
      status = HttpStatus.NOT_FOUND;
      message = 'Requested data not found';
      details.type = 'entity_not_found';
      
    } else if (exception instanceof TypeORMError) {
      // Handle other TypeORM errors
      status = HttpStatus.BAD_REQUEST;
      message = 'Database operation failed';
      details.type = 'typeorm_error';
      details.originalMessage = exception.message;
    }

    // Construct the error response
    const errorResponse = {
      success: false,
      error: {
        message,
        type: 'database_error',
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...details,
      },
    };

    // In development, include more details
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = exception.stack;
      errorResponse.error.originalError = {
        name: exception.name,
        message: exception.message,
        code: (exception as any).code,
      };
    }

    response.status(status).json(errorResponse);
  }

  private extractMaxLength(message: string): number | null {
    const match = message.match(/character varying\((\d+)\)/);
    return match ? parseInt(match[1], 10) : null;
  }
} 