// src/scripts/normalize-and-deduplicate-emails.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { User, Wallet } from '../src/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';

interface DuplicateGroup {
  normalizedEmail: string;
  users: User[];
}

interface UserScore {
  user: User;
  score: number;
  reasons: string[];
}

@Injectable()
class EmailNormalizationService {
  private readonly logger = new Logger(EmailNormalizationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Main execution method
   */
  async execute(): Promise<void> {
    this.logger.log('========================================');
    this.logger.log('EMAIL NORMALIZATION & DEDUPLICATION');
    this.logger.log('========================================\n');

    try {
      // Step 1: Normalize all emails
      await this.normalizeAllEmails();

      // Step 2: Find duplicates
      const duplicates = await this.findDuplicateEmails();

      if (duplicates.length === 0) {
        this.logger.log('✅ No duplicate emails found after normalization');
        return;
      }

      // Step 3: Resolve duplicates
      await this.resolveDuplicates(duplicates);

      this.logger.log('\n========================================');
      this.logger.log('✅ EMAIL NORMALIZATION COMPLETED');
      this.logger.log('========================================');
    } catch (error) {
      this.logger.error('❌ Email normalization failed:', error.message);
      throw error;
    }
  }

  /**
   * Step 1: Normalize all email addresses to lowercase
   */
  private async normalizeAllEmails(): Promise<void> {
    this.logger.log('[STEP 1] Normalizing all emails to lowercase...\n');

    const users = await this.userRepository.find({
      where: { email: Not(IsNull()) },
    });

    let normalizedCount = 0;

    for (const user of users) {
      if (!user.email) continue;

      const normalizedEmail = user.email.toLowerCase().trim();

      if (user.email !== normalizedEmail) {
        this.logger.log(
          `  Normalizing: "${user.email}" → "${normalizedEmail}"`,
        );

        user.email = normalizedEmail;
        await this.userRepository.save(user);
        normalizedCount++;
      }
    }

    this.logger.log(
      `\n✅ Normalized ${normalizedCount} email(s) out of ${users.length} total\n`,
    );
  }

  /**
   * Step 2: Find duplicate email addresses
   */
  private async findDuplicateEmails(): Promise<DuplicateGroup[]> {
    this.logger.log('[STEP 2] Finding duplicate emails...\n');

    const duplicateQuery = await this.userRepository
      .createQueryBuilder('user')
      .select('user.email', 'email')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.email IS NOT NULL')
      .groupBy('user.email')
      .having('COUNT(user.id) > 1')
      .getRawMany();

    if (duplicateQuery.length === 0) {
      this.logger.log('✅ No duplicate emails found\n');
      return [];
    }

    this.logger.log(`⚠️  Found ${duplicateQuery.length} duplicate email(s):\n`);

    const duplicateGroups: DuplicateGroup[] = [];

    for (const dup of duplicateQuery) {
      const users = await this.userRepository.find({
        where: { email: dup.email },
        relations: ['wallet'],
      });

      this.logger.log(`  📧 ${dup.email} (${dup.count} accounts)`);

      duplicateGroups.push({
        normalizedEmail: dup.email,
        users,
      });
    }

    this.logger.log('');
    return duplicateGroups;
  }

  /**
   * Step 3: Resolve duplicate emails by keeping the most valuable account
   */
  private async resolveDuplicates(
    duplicates: DuplicateGroup[],
  ): Promise<void> {
    this.logger.log(
      '[STEP 3] Resolving duplicates (keeping most valuable account)...\n',
    );

    for (const group of duplicates) {
      this.logger.log(`\n📧 Processing: ${group.normalizedEmail}`);
      this.logger.log('─'.repeat(60));

      // Score each user
      const scoredUsers = await Promise.all(
        group.users.map(user => this.scoreUser(user)),
      );

      // Sort by score (highest first)
      scoredUsers.sort((a, b) => b.score - a.score);

      const keepUser = scoredUsers[0];
      const removeUsers = scoredUsers.slice(1);

      // Log decision
      this.logger.log(`\n✅ KEEPING: User ${keepUser.user.id}`);
      this.logger.log(`   Score: ${keepUser.score}`);
      this.logger.log(`   Reasons:`);
      keepUser.reasons.forEach(reason => this.logger.log(`     • ${reason}`));

      this.logger.log(`\n❌ REMOVING: ${removeUsers.length} duplicate(s)`);

      // Remove duplicate accounts
      for (const scoreData of removeUsers) {
        this.logger.log(`\n   User ${scoreData.user.id}:`);
        this.logger.log(`     Score: ${scoreData.score}`);
        this.logger.log(`     Reasons:`);
        scoreData.reasons.forEach(reason =>
          this.logger.log(`       • ${reason}`),
        );

        await this.removeDuplicateUser(scoreData.user);
      }

      this.logger.log('\n' + '─'.repeat(60));
    }
  }

  /**
   * Score a user based on account value and activity
   * Higher score = more valuable account
   */
  private async scoreUser(user: User): Promise<UserScore> {
    let score = 0;
    const reasons: string[] = [];

    // 1. Profile completion (50 points)
    if (user.profile_completed) {
      score += 50;
      reasons.push('Profile completed (+50)');
    }

    // 2. Email verification (30 points)
    if (user.email_verified_at) {
      score += 30;
      reasons.push('Email verified (+30)');
    }

    // 3. Phone verification (20 points)
    if (user.is_phone_verified) {
      score += 20;
      reasons.push('Phone verified (+20)');
    }

    // 4. Wallet balance (up to 100 points)
    if (user.wallet) {
      const totalBalance =
        Number(user.wallet.balance || 0) +
        Number(user.wallet.vendor_balance || 0);

      if (totalBalance > 0) {
        const walletScore = Math.min(100, totalBalance / 100); // 1 point per 100 units
        score += walletScore;
        reasons.push(
          `Wallet balance: ${totalBalance} (+${walletScore.toFixed(1)})`,
        );
      }
    }

    // 5. Account age (up to 50 points)
    const accountAge = Date.now() - user.created_at.getTime();
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
    const ageScore = Math.min(50, daysSinceCreation / 2); // 1 point per 2 days, max 50
    score += ageScore;
    reasons.push(
      `Account age: ${daysSinceCreation.toFixed(1)} days (+${ageScore.toFixed(1)})`,
    );

    // 6. Last activity (up to 30 points)
    if (user.last_active_at) {
      const daysSinceActive =
        (Date.now() - user.last_active_at.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive < 30) {
        const activityScore = 30 - daysSinceActive;
        score += activityScore;
        reasons.push(
          `Recent activity: ${daysSinceActive.toFixed(1)} days ago (+${activityScore.toFixed(1)})`,
        );
      }
    }

    // 7. User type bonus
    if (user.user_type === 'VENDOR') {
      score += 20;
      reasons.push('Vendor account (+20)');
    } else if (user.user_type === 'ADMIN') {
      score += 100;
      reasons.push('Admin account (+100)');
    }

    // 8. Name filled in
    if (user.first_name && user.last_name) {
      score += 10;
      reasons.push('Name provided (+10)');
    }

    if (reasons.length === 0) {
      reasons.push('Empty account (0)');
    }

    return { user, score, reasons };
  }

  /**
   * Remove a duplicate user account
   */
  private async removeDuplicateUser(user: User): Promise<void> {
    this.logger.log(`     🗑️  Deleting user ${user.id}...`);

    try {
      // Delete associated wallet if exists
      if (user.wallet) {
        await this.walletRepository.delete(user.wallet.id);
        this.logger.log(`     ✓ Wallet deleted`);
      }

      // Soft delete the user
      await this.userRepository.softDelete(user.id);
      this.logger.log(`     ✓ User soft-deleted`);
    } catch (error) {
      this.logger.error(
        `     ❌ Failed to delete user ${user.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate summary report
   */
  async generateReport(): Promise<void> {
    this.logger.log('\n========================================');
    this.logger.log('SUMMARY REPORT');
    this.logger.log('========================================\n');

    const totalUsers = await this.userRepository.count();
    const uniqueEmails = await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(DISTINCT user.email)', 'count')
      .where('user.email IS NOT NULL')
      .getRawOne();

    const deletedUsers = await this.userRepository.count({
      withDeleted: true,
      where: { deleted_at: Not(IsNull()) },
    });

    this.logger.log(`Total active users: ${totalUsers}`);
    this.logger.log(`Unique emails: ${uniqueEmails.count}`);
    this.logger.log(`Deleted users: ${deletedUsers}`);
    this.logger.log('');
  }
}

// Helper imports for TypeORM operators
import { Not, IsNull } from 'typeorm';

/**
 * Script runner
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const emailNormalizationService = app.get(EmailNormalizationService);

  try {
    await emailNormalizationService.execute();
    await emailNormalizationService.generateReport();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();