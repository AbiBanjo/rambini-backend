// src/modules/user/services/profile/user-profile-picture.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/entities';
import { UserProfileBaseService } from './user-profile-base.service';

@Injectable()
export class UserProfilePictureService {
  private readonly logger = new Logger(UserProfilePictureService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly profileBaseService: UserProfileBaseService,
    private readonly configService: ConfigService,
  ) {}

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const user = await this.profileBaseService.getUserProfile(userId);

    // Dynamic import to avoid circular dependencies
    const { FileStorageService } = await import(
      'src/modules/file-storage/services/file-storage.service'
    );
    const fileStorageService = new FileStorageService(this.configService);

    // Upload image to cloud storage
    const uploadedFile = await fileStorageService.uploadImage(file, {
      quality: 85,
      createThumbnail: true,
      thumbnailSize: 300,
    });

    user.image_url = uploadedFile.url;
    await this.userRepository.save(user);

    this.logger.log(`Profile picture uploaded for user ${userId}`);

    return user;
  }

  async deleteProfilePicture(userId: string): Promise<User> {
    const user = await this.profileBaseService.getUserProfile(userId);

    // Here you might want to delete the file from storage
    // const { FileStorageService } = await import(...);
    // await fileStorageService.deleteFile(user.image_url);

    user.image_url = null;
    await this.userRepository.save(user);

    this.logger.log(`Profile picture deleted for user ${userId}`);

    return user;
  }
}