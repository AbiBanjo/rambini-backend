import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface UploadedFile {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    size: number;
  };
}

export interface ImageProcessingOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  createThumbnail?: boolean;
  thumbnailSize?: number;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly cdnUrl: string;
  private readonly s3: S3Client;
  private readonly s3BucketName: string;
  private readonly s3Region: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', 'uploads');
    this.maxFileSize = this.configService.get('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
    this.allowedMimeTypes = this.configService.get('ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/webp').split(',');
    this.cdnUrl = this.configService.get('CDN_URL', '');
    
    // AWS S3 Configuration
    this.s3BucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    this.s3Region = this.configService.get('AWS_REGION', 'us-east-1');
    
    // Initialize AWS S3 Client (v3)
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
      region: this.s3Region,
    });
    
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
  ): Promise<UploadedFile> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const s3Key = `images/${filename}`;

    try {
      // Process image
      const processedImage = await this.processImage(file.buffer, options);

      // Upload to S3
      const uploadResult = await this.uploadToS3(processedImage, s3Key, file.mimetype);

      // Create thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (options.createThumbnail) {
        thumbnailUrl = await this.createThumbnail(file.buffer, filename, options.thumbnailSize);
      }

      // Get image metadata
      const metadata = await this.getImageMetadata(file.buffer);

      const uploadedFile: UploadedFile = {
        originalName: file.originalname,
        filename,
        mimetype: file.mimetype,
        size: file.size,
        path: s3Key, // Store S3 key as path
        url: uploadResult.Location,
        thumbnailUrl,
        metadata: {
          ...metadata,
          size: file.size,
        },
      };

      this.logger.log(`Image uploaded successfully to S3: ${filename}`);
      return uploadedFile;
    } catch (error) {
      this.logger.error(`Failed to upload image to S3: ${error.message}`);
      throw new BadRequestException('Failed to process and upload image');
    }
  }

  async uploadDocument(
    file: Express.Multer.File,
    category: string = 'documents',
  ): Promise<UploadedFile> {
    // Validate document file
    this.validateDocumentFile(file);

    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const s3Key = `${category}/${filename}`;

    try {
      // Upload to S3
      const uploadResult = await this.uploadToS3(file.buffer, s3Key, file.mimetype);

      const uploadedFile: UploadedFile = {
        originalName: file.originalname,
        filename,
        mimetype: file.mimetype,
        size: file.size,
        path: s3Key, // Store S3 key as path
        url: uploadResult.Location,
        metadata: {
          size: file.size,
        },
      };

      this.logger.log(`Document uploaded successfully to S3: ${filename}`);
      return uploadedFile;
    } catch (error) {
      this.logger.error(`Failed to upload document to S3: ${error.message}`);
      throw new BadRequestException('Failed to upload document');
    }
  }

  async deleteFile(filename: string, category?: string): Promise<void> {
    try {
      const s3Key = category 
        ? `${category}/${filename}`
        : `images/${filename}`;

      await this.deleteFromS3(s3Key);
      this.logger.log(`File deleted successfully from S3: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      throw new NotFoundException('File not found or could not be deleted');
    }
  }

  async getFileInfo(filename: string, category?: string): Promise<UploadedFile | null> {
    try {
      const s3Key = category 
        ? `${category}/${filename}`
        : `images/${filename}`;

      const headResult = await this.getS3ObjectInfo(s3Key);
      
      return {
        originalName: filename,
        filename,
        mimetype: headResult.ContentType || this.getMimeType(filename),
        size: headResult.ContentLength || 0,
        path: s3Key,
        url: this.getFileUrl(path.basename(s3Key), path.dirname(s3Key)),
        metadata: {
          size: headResult.ContentLength || 0,
        },
      };
    } catch {
      return null;
    }
  }

  async resizeImage(
    imageBuffer: Buffer,
    width: number,
    height: number,
    quality: number = 80,
  ): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  async optimizeImage(
    imageBuffer: Buffer,
    quality: number = 80,
    format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  ): Promise<Buffer> {
    let sharpInstance = sharp(imageBuffer);

    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
    }

    return sharpInstance.toBuffer();
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  private validateDocumentFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize * 2) { // Documents can be larger
      throw new BadRequestException(`Document size exceeds maximum limit of ${(this.maxFileSize * 2) / (1024 * 1024)}MB`);
    }

    // Allow common document types
    const allowedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedDocTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Document type ${file.mimetype} is not allowed`);
    }
  }

  private async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions,
  ): Promise<Buffer> {
    let processedBuffer = buffer;

    // Resize if dimensions specified
    if (options.width || options.height) {
      processedBuffer = await this.resizeImage(
        processedBuffer,
        options.width || 800,
        options.height || 600,
        options.quality || 80,
      );
    }

    // Optimize and convert format if specified
    if (options.format) {
      processedBuffer = await this.optimizeImage(
        processedBuffer,
        options.quality || 80,
        options.format,
      );
    }

    return processedBuffer;
  }

  private async createThumbnail(
    buffer: Buffer,
    filename: string,
    size: number = 200,
  ): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailFilename = `thumb_${filename}`;
      const s3Key = `thumbnails/${thumbnailFilename}`;

      // Upload thumbnail to S3
      const uploadResult = await this.uploadToS3(thumbnailBuffer, s3Key, 'image/jpeg');

      return uploadResult.Location;
    } catch (error) {
      this.logger.warn(`Failed to create thumbnail: ${error.message}`);
      return '';
    }
  }

  private async getImageMetadata(buffer: Buffer): Promise<{
    width?: number;
    height?: number;
    format?: string;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch {
      return {};
    }
  }

  private getFileUrl(filename: string, category?: string): string {
    if (this.cdnUrl) {
      return category 
        ? `${this.cdnUrl}/${category}/${filename}`
        : `${this.cdnUrl}/${filename}`;
    }

    // Generate S3 URL
    const s3Key = category 
      ? `${category}/${filename}`
      : `images/${filename}`;
    
    // Note: For S3 buckets with ACLs disabled, ensure bucket policy allows public read access
    // Example bucket policy:
    // {
    //   "Version": "2012-10-17",
    //   "Statement": [
    //     {
    //       "Sid": "PublicReadGetObject",
    //       "Effect": "Allow",
    //       "Principal": "*",
    //       "Action": "s3:GetObject",
    //       "Resource": "arn:aws:s3:::your-bucket-name/*"
    //     }
    //   ]
    // }
    return `https://${this.s3BucketName}.s3.${this.s3Region}.amazonaws.com/${s3Key}`;
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async cleanupOrphanedFiles(): Promise<number> {
    // This method would clean up files that are no longer referenced in the database
    // Implementation depends on your database schema and requirements
    this.logger.log('Cleanup of orphaned files not implemented yet');
    return 0;
  }

  // S3 Helper Methods
  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ Location: string; Key: string }> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.s3BucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // ACL removed - use bucket policy for public access instead
      },
    });

    const result = await upload.done();
    return {
      Location: `https://${this.s3BucketName}.s3.${this.s3Region}.amazonaws.com/${key}`,
      Key: key,
    };
  }

  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.s3BucketName,
      Key: key,
    });

    await this.s3.send(command);
  }

  private async getS3ObjectInfo(key: string): Promise<any> {
    const command = new HeadObjectCommand({
      Bucket: this.s3BucketName,
      Key: key,
    });

    return await this.s3.send(command);
  }
} 