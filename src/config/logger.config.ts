import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

export const createLoggerConfig = (configService: ConfigService) => {
  const logLevel = configService.get('logging.level') || 'info';
  const logFilePath = configService.get('logging.filePath') || 'logs/app.log';

  return WinstonModule.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service: 'rambini-backend' },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      
      // File transport for errors
      new winston.transports.File({
        filename: logFilePath.replace('.log', '.error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: logFilePath,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
      new winston.transports.File({
        filename: logFilePath.replace('.log', '.exceptions.log'),
      }),
    ],
    
    // Handle unhandled rejections
    rejectionHandlers: [
      new winston.transports.File({
        filename: logFilePath.replace('.log', '.rejections.log'),
      }),
    ],
  });
}; 