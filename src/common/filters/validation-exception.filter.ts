import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Get the exception response
    const exceptionResponse = exception.getResponse() as any;
    
    // Check if this is a validation error
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      // This is a validation error
      this.logger.warn(`Validation error occurred: ${exceptionResponse.message.join(', ')}`, {
        url: request.url,
        method: request.method,
        body: request.body,
        params: request.params,
        query: request.query,
        user: request.user?.id,
        timestamp: new Date().toISOString(),
      });

      // Construct the validation error response
      const errorResponse = {
        success: false,
        error: {
          message: 'Validation failed',
          type: 'validation_error',
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          details: exceptionResponse.message.map((msg: string) => {
            // Parse validation message to extract field and constraint
            const fieldMatch = msg.match(/^([^.]+)/);
            const field = fieldMatch ? fieldMatch[1] : 'unknown';
            
            return {
              field,
              message: msg,
              constraint: 'validation',
            };
          }),
        },
      };

      response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    } else {
      // This is a regular BadRequestException, let the HttpExceptionFilter handle it
      throw exception;
    }
  }
} 