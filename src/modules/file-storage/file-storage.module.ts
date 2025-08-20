import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { FileStorageService } from './services/file-storage.service';
import { FileUploadController } from './controllers/file-upload.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: undefined, // Use memory storage for processing
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        // Allow images and documents
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      },
    }),
  ],
  controllers: [FileUploadController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {} 