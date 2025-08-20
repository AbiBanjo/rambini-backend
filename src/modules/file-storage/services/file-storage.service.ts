import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

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

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', 'uploads');
    this.maxFileSize = this.configService.get('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
    this.allowedMimeTypes = this.configService.get('ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/webp').split(',');
    this.cdnUrl = this.configService.get('CDN_URL', '');
    
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
    const filePath = path.join(this.uploadDir, filename);

    try {
      // Process and save image
      const processedImage = await this.processImage(file.buffer, options);
      await fs.writeFile(filePath, processedImage);

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
        path: filePath,
        url: this.getFileUrl(filename),
        thumbnailUrl,
        metadata: {
          ...metadata,
          size: file.size,
        },
      };

      this.logger.log(`Image uploaded successfully: ${filename}`);
      return uploadedFile;
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
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
    const categoryDir = path.join(this.uploadDir, category);
    const filePath = path.join(categoryDir, filename);

    try {
      // Ensure category directory exists
      await fs.mkdir(categoryDir, { recursive: true });

      // Save document
      await fs.writeFile(filePath, file.buffer);

      const uploadedFile: UploadedFile = {
        originalName: file.originalname,
        filename,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath,
        url: this.getFileUrl(filename, category),
        metadata: {
          size: file.size,
        },
      };

      this.logger.log(`Document uploaded successfully: ${filename}`);
      return uploadedFile;
    } catch (error) {
      this.logger.error(`Failed to upload document: ${error.message}`);
      throw new BadRequestException('Failed to upload document');
    }
  }

  async deleteFile(filename: string, category?: string): Promise<void> {
    try {
      const filePath = category 
        ? path.join(this.uploadDir, category, filename)
        : path.join(this.uploadDir, filename);

      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new NotFoundException('File not found or could not be deleted');
    }
  }

  async getFileInfo(filename: string, category?: string): Promise<UploadedFile | null> {
    try {
      const filePath = category 
        ? path.join(this.uploadDir, category, filename)
        : path.join(this.uploadDir, filename);

      const stats = await fs.stat(filePath);
      
      return {
        originalName: filename,
        filename,
        mimetype: this.getMimeType(filename),
        size: stats.size,
        path: filePath,
        url: this.getFileUrl(filename, category),
        metadata: {
          size: stats.size,
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
      const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);

      // Ensure thumbnails directory exists
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      return this.getFileUrl(thumbnailFilename, 'thumbnails');
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

    // Fallback to local path
    return category 
      ? `/files/${category}/${filename}`
      : `/files/${filename}`;
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
} 