import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    // Log the error
    this.logger.error(`HTTP error occurred: ${exception.message}`, {
      statusCode: status,
      url: request.url,
      method: request.method,
      body: request.body,
      params: request.params,
      query: request.query,
      user: request.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Get the error response from the exception
    const exceptionResponse = exception.getResponse() as any;
    
    // Construct the error response
    const errorResponse: any = {
      success: false,
      error: {
        message: exceptionResponse.message || exception.message,
        type: 'http_error',
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...(exceptionResponse.error && { details: exceptionResponse.error }),
      },
    };

    // In development, include more details
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = exception.stack;
      errorResponse.error.originalError = {
        name: exception.name,
        message: exception.message,
        status: exception.getStatus(),
      };
    }

    response.status(status).json(errorResponse);
  }
} 