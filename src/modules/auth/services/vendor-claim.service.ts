import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, Vendor, UserStatus, UserType } from '@/entities';
import { RedisService } from '@/database/redis.service';
import { EmailNotificationService } from '@/modules/notification/services/email-notification.service';
import { EmailTemplates } from '../helpers/email-templates';

type VendorClaimPayload = {
  userId: string;
  vendorId: string;
  email: string;
  createdAt: string;
};

@Injectable()
export class VendorClaimService {
  private readonly logger = new Logger(VendorClaimService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly redisService: RedisService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
  ) {}

  async sendVendorClaimInvite(userId: string, vendorId: string, email: string): Promise<{ claimUrl: string }> {
    if (!this.redisService.isServiceEnabled()) {
      throw new ServiceUnavailableException('Invite service is not available (Redis not configured)');
    }

    const token = randomBytes(32).toString('hex');
    const payload: VendorClaimPayload = {
      userId,
      vendorId,
      email,
      createdAt: new Date().toISOString(),
    };

    const ttlSeconds = this.configService.get<number>('VENDOR_CLAIM_TTL_SECONDS') || 7 * 24 * 60 * 60;
    const key = this.getClaimKey(token);
    await this.redisService.setex(key, ttlSeconds, JSON.stringify(payload));

    const baseUrl = 'https://rambini-admin-portal.vercel.app';

    const claimUrl = `${baseUrl.replace(/\/$/, '')}/vendor-claim?token=${token}`;

    await this.emailNotificationService.sendEmail({
      to: email,
      subject: 'Claim Your Vendor Account - Rambini',
      html: EmailTemplates.vendorClaim(claimUrl),
      text: `Claim Your Vendor Account\n\nClick this link to set your password and activate your vendor account:\n${claimUrl}\n\nIf you didn't request this, ignore this email.`,
      from: process.env.EMAIL_FROM || 'noreply@rambini.com',
      replyTo: process.env.EMAIL_REPLY_TO || 'support@rambini.com',
    });

    this.logger.log(`Vendor claim invite sent to ${email} for vendor ${vendorId}`);

    return { claimUrl };
  }

  async verifyClaimToken(token: string): Promise<{ vendorId: string; email: string; businessName: string }> {
    const payload = await this.getClaimPayload(token);
    const vendor = await this.vendorRepository.findOne({ where: { id: payload.vendorId }, relations: ['user'] });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return {
      vendorId: vendor.id,
      email: payload.email,
      businessName: vendor.business_name,
    };
  }

  async completeClaim(token: string, password: string): Promise<{ message: string }> {
    const payload = await this.getClaimPayload(token);

    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const vendor = await this.vendorRepository.findOne({ where: { id: payload.vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (user.password) {
      throw new BadRequestException('Account already claimed');
    }

    const saltRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.status = UserStatus.ACTIVE;
    user.user_type = UserType.VENDOR;
    user.email_verified_at = new Date();

    vendor.is_active = true;

    await this.userRepository.save(user);
    await this.vendorRepository.save(vendor);

    await this.redisService.del(this.getClaimKey(token));

    return { message: 'Vendor account claimed successfully' };
  }

  private async getClaimPayload(token: string): Promise<VendorClaimPayload> {
    if (!this.redisService.isServiceEnabled()) {
      throw new ServiceUnavailableException('Invite service is not available (Redis not configured)');
    }

    const key = this.getClaimKey(token);
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BadRequestException('Invalid or expired claim token');
    }

    try {
      return JSON.parse(raw) as VendorClaimPayload;
    } catch {
      throw new BadRequestException('Invalid claim token data');
    }
  }

  private getClaimKey(token: string): string {
    return `vendor:claim:${token}`;
  }
}
