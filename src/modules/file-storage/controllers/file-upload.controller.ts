import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileStorageService, UploadedFile as UploadedFileType, ImageProcessingOptions } from '../services/file-storage.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileUploadController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      quality?: string;
      width?: string;
      height?: string;
      format?: 'jpeg' | 'png' | 'webp';
      createThumbnail?: string;
      thumbnailSize?: string;
    },
    @Request() req,
  ): Promise<UploadedFileType> {
    const options: ImageProcessingOptions = {
      quality: body.quality ? parseInt(body.quality) : undefined,
      width: body.width ? parseInt(body.width) : undefined,
      height: body.height ? parseInt(body.height) : undefined,
      format: body.format,
      createThumbnail: body.createThumbnail === 'true',
      thumbnailSize: body.thumbnailSize ? parseInt(body.thumbnailSize) : undefined,
    };

    return this.fileStorageService.uploadImage(file, options);
  }

  @Post('upload/document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
  ): Promise<UploadedFileType> {
    return this.fileStorageService.uploadDocument(file, category);
  }

  @Post('upload/vendor-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVendorDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @Request() req,
  ): Promise<UploadedFileType> {
    // Validate that user is a vendor or applying to be one
    // This would typically check user permissions
    
    const category = `vendor-documents/${req.user.id}/${documentType}`;
    return this.fileStorageService.uploadDocument(file, category);
  }

  @Post('upload/menu-item-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMenuItemImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('menuItemId') menuItemId: string,
    @Request() req,
  ): Promise<UploadedFileType> {
    // Validate that user owns the menu item or is a vendor
    // This would typically check user permissions
    
    const options: ImageProcessingOptions = {
      quality: 85,
      width: 800,
      height: 600,
      format: 'jpeg',
      createThumbnail: true,
      thumbnailSize: 200,
    };

    return this.fileStorageService.uploadImage(file, options);
  }

  @Get(':filename')
  async getFileInfo(
    @Param('filename') filename: string,
    @Query('category') category?: string,
  ): Promise<UploadedFileType | null> {
    return this.fileStorageService.getFileInfo(filename, category);
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('filename') filename: string,
    @Request() req,
    @Query('category') category?: string,
  ): Promise<void> {
    // Validate that user owns the file or has permission to delete it
    // This would typically check user permissions
    
    await this.fileStorageService.deleteFile(filename, category);
  }

  @Post('optimize')
  @UseInterceptors(FileInterceptor('file'))
  async optimizeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      quality?: string;
      format?: 'jpeg' | 'png' | 'webp';
      width?: string;
      height?: string;
    },
  ): Promise<{ originalSize: number; optimizedSize: number; url: string }> {
    const options: ImageProcessingOptions = {
      quality: body.quality ? parseInt(body.quality) : 80,
      format: body.format || 'jpeg',
      width: body.width ? parseInt(body.width) : undefined,
      height: body.height ? parseInt(body.height) : undefined,
    };

    const uploadedFile = await this.fileStorageService.uploadImage(file, options);
    
    return {
      originalSize: file.size,
      optimizedSize: uploadedFile.metadata.size,
      url: uploadedFile.url,
    };
  }

  @Post('resize')
  @UseInterceptors(FileInterceptor('file'))
  async resizeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      width: string;
      height: string;
      quality?: string;
    },
  ): Promise<{ url: string; metadata: any }> {
    const options: ImageProcessingOptions = {
      width: parseInt(body.width),
      height: parseInt(body.height),
      quality: body.quality ? parseInt(body.quality) : 80,
    };

    const uploadedFile = await this.fileStorageService.uploadImage(file, options);
    
    return {
      url: uploadedFile.url,
      metadata: uploadedFile.metadata,
    };
  }
} 