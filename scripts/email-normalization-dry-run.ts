// src/scripts/email-normalization-dry-run.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { User, Wallet } from '../src/entities';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull } from 'typeorm';

interface DuplicateGroup {
  normalizedEmail: string;
  users: User[];
}

interface UserScore {
  user: User;
  score: number;
  reasons: string[];
}

interface DryRunReport {
  totalUsers: number;
  emailsToNormalize: number;
  duplicateGroups: number;
  usersToKeep: string[];
  usersToRemove: string[];
  estimatedChanges: {
    email: string;
    keepUserId: string;
    removeUserIds: string[];
    keepReason: string;
  }[];
}

@Injectable()
class EmailNormalizationDryRunService {
  private readonly logger = new Logger(EmailNormalizationDryRunService.name);
  private report: DryRunReport = {
    totalUsers: 0,
    emailsToNormalize: 0,
    duplicateGroups: 0,
    usersToKeep: [],
    usersToRemove: [],
    estimatedChanges: [],
  };

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * DRY RUN - No changes will be made to the database
   */
  async dryRun(): Promise<DryRunReport> {
    this.logger.log('========================================');
    this.logger.log('EMAIL NORMALIZATION - DRY RUN MODE');
    this.logger.log('NO CHANGES WILL BE MADE TO DATABASE');
    this.logger.log('========================================\n');

    // Count total users
    this.report.totalUsers = await this.userRepository.count();

    // Step 1: Check what emails need normalization
    await this.checkEmailNormalization();

    // Step 2: Find potential duplicates after normalization
    const duplicates = await this.findPotentialDuplicates();

    if (duplicates.length > 0) {
      this.report.duplicateGroups = duplicates.length;
      
      // Step 3: Simulate duplicate resolution
      await this.simulateDuplicateResolution(duplicates);
    }

    // Print report
    this.printReport();

    return this.report;
  }

  /**
   * Check which emails need normalization
   */
  private async checkEmailNormalization(): Promise<void> {
    this.logger.log('[STEP 1] Checking emails that need normalization...\n');

    const users = await this.userRepository.find({
      where: { email: Not(IsNull()) },
    });

    let needsNormalization = 0;

    for (const user of users) {
      if (!user.email) continue;

      const normalizedEmail = user.email.toLowerCase().trim();

      if (user.email !== normalizedEmail) {
        this.logger.log(
          `  Would normalize: "${user.email}" → "${normalizedEmail}" (User: ${user.id})`,
        );
        needsNormalization++;
      }
    }

    this.report.emailsToNormalize = needsNormalization;

    this.logger.log(
      `\n📊 ${needsNormalization} email(s) need normalization out of ${users.length} total\n`,
    );
  }

  /**
   * Find potential duplicates after normalization
   */
  private async findPotentialDuplicates(): Promise<DuplicateGroup[]> {
    this.logger.log(
      '[STEP 2] Finding potential duplicate emails after normalization...\n',
    );

    const users = await this.userRepository.find({
      where: { email: Not(IsNull()) },
      relations: ['wallet'],
    });

    // Group by normalized email
    const emailGroups = new Map<string, User[]>();

    for (const user of users) {
      if (!user.email) continue;

      const normalizedEmail = user.email.toLowerCase().trim();

      if (!emailGroups.has(normalizedEmail)) {
        emailGroups.set(normalizedEmail, []);
      }

      emailGroups.get(normalizedEmail)!.push(user);
    }

    // Filter groups with duplicates
    const duplicateGroups: DuplicateGroup[] = [];

    for (const [email, users] of emailGroups.entries()) {
      if (users.length > 1) {
        duplicateGroups.push({
          normalizedEmail: email,
          users,
        });

        this.logger.log(
          `  ⚠️  ${email} - ${users.length} accounts would be duplicates`,
        );
      }
    }

    if (duplicateGroups.length === 0) {
      this.logger.log('✅ No duplicates would exist after normalization\n');
    } else {
      this.logger.log(
        `\n📊 ${duplicateGroups.length} duplicate group(s) found\n`,
      );
    }

    return duplicateGroups;
  }

  /**
   * Simulate duplicate resolution
   */
  private async simulateDuplicateResolution(
    duplicates: DuplicateGroup[],
  ): Promise<void> {
    this.logger.log(
      '[STEP 3] Simulating duplicate resolution strategy...\n',
    );

    for (const group of duplicates) {
      this.logger.log(`\n📧 ${group.normalizedEmail}`);
      this.logger.log('─'.repeat(70));

      // Score each user
      const scoredUsers = await Promise.all(
        group.users.map(user => this.scoreUser(user)),
      );

      // Sort by score
      scoredUsers.sort((a, b) => b.score - a.score);

      const keepUser = scoredUsers[0];
      const removeUsers = scoredUsers.slice(1);

      // Log decision
      this.logger.log(`\n✅ WOULD KEEP: User ${keepUser.user.id}`);
      this.logger.log(`   Email (original): ${keepUser.user.email}`);
      this.logger.log(`   Score: ${keepUser.score.toFixed(2)}`);
      this.logger.log(`   Profile completed: ${keepUser.user.profile_completed}`);
      this.logger.log(`   Email verified: ${!!keepUser.user.email_verified_at}`);
      this.logger.log(
        `   Wallet balance: ${keepUser.user.wallet?.balance || 0}`,
      );
      this.logger.log(
        `   Vendor balance: ${keepUser.user.wallet?.vendor_balance || 0}`,
      );
      this.logger.log(`   Reasons:`);
      keepUser.reasons.forEach(reason => this.logger.log(`     • ${reason}`));

      this.report.usersToKeep.push(keepUser.user.id);

      this.logger.log(`\n❌ WOULD REMOVE: ${removeUsers.length} account(s)`);

      const removeIds: string[] = [];

      for (const scoreData of removeUsers) {
        this.logger.log(`\n   User ${scoreData.user.id}:`);
        this.logger.log(`     Email (original): ${scoreData.user.email}`);
        this.logger.log(`     Score: ${scoreData.score.toFixed(2)}`);
        this.logger.log(
          `     Profile completed: ${scoreData.user.profile_completed}`,
        );
        this.logger.log(
          `     Email verified: ${!!scoreData.user.email_verified_at}`,
        );
        this.logger.log(
          `     Wallet balance: ${scoreData.user.wallet?.balance || 0}`,
        );
        this.logger.log(
          `     Vendor balance: ${scoreData.user.wallet?.vendor_balance || 0}`,
        );
        this.logger.log(`     Reasons:`);
        scoreData.reasons.forEach(reason =>
          this.logger.log(`       • ${reason}`),
        );

        this.report.usersToRemove.push(scoreData.user.id);
        removeIds.push(scoreData.user.id);
      }

      this.report.estimatedChanges.push({
        email: group.normalizedEmail,
        keepUserId: keepUser.user.id,
        removeUserIds: removeIds,
        keepReason: `Score: ${keepUser.score.toFixed(2)} - ${keepUser.reasons.join(', ')}`,
      });

      this.logger.log('\n' + '─'.repeat(70));
    }
  }

  /**
   * Score a user (same logic as actual script)
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
        const walletScore = Math.min(100, totalBalance / 100);
        score += walletScore;
        reasons.push(
          `Wallet balance: ${totalBalance} (+${walletScore.toFixed(1)})`,
        );
      }
    }

    // 5. Account age (up to 50 points)
    const accountAge = Date.now() - user.created_at.getTime();
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
    const ageScore = Math.min(50, daysSinceCreation / 2);
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
   * Print summary report
   */
  private printReport(): void {
    this.logger.log('\n\n========================================');
    this.logger.log('DRY RUN SUMMARY REPORT');
    this.logger.log('========================================\n');

    this.logger.log(`📊 Total users in database: ${this.report.totalUsers}`);
    this.logger.log(
      `📧 Emails needing normalization: ${this.report.emailsToNormalize}`,
    );
    this.logger.log(
      `⚠️  Duplicate groups after normalization: ${this.report.duplicateGroups}`,
    );
    this.logger.log(
      `✅ Accounts that would be kept: ${this.report.usersToKeep.length}`,
    );
    this.logger.log(
      `❌ Accounts that would be removed: ${this.report.usersToRemove.length}`,
    );

    if (this.report.estimatedChanges.length > 0) {
      this.logger.log('\n📋 Detailed changes:\n');

      this.report.estimatedChanges.forEach((change, index) => {
        this.logger.log(`${index + 1}. ${change.email}:`);
        this.logger.log(`   Keep: ${change.keepUserId}`);
        this.logger.log(`   Remove: ${change.removeUserIds.join(', ')}`);
        this.logger.log(`   Reason: ${change.keepReason}`);
        this.logger.log('');
      });
    }

    this.logger.log('========================================');
    this.logger.log('💡 To execute these changes, run:');
    this.logger.log('   npm run script:normalize-emails');
    this.logger.log('========================================\n');
  }
}

/**
 * Script runner
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const dryRunService = app.get(EmailNormalizationDryRunService);

  try {
    await dryRunService.dryRun();
  } catch (error) {
    console.error('Dry run failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();