// scripts/email-normalization-analysis.ts
import { DataSource } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Wallet } from '../src/entities/wallet.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.production
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

interface EmailAnalysis {
  originalEmail: string;
  normalizedEmail: string;
  userId: string;
  userName: string;
  userType: string;
  profileCompleted: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  walletBalance: number;
  vendorBalance: number;
  createdAt: Date;
  lastActiveAt: Date | null | undefined;
}

interface DuplicateGroup {
  normalizedEmail: string;
  count: number;
  users: EmailAnalysis[];
}

// Database configuration - uses your .env variables
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432'),
  username: process.env.DATABASE_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.DATABASE_NAME || process.env.DB_NAME || 'rambini',
  entities: [User, Wallet],
  synchronize: false,
  logging: false,
});

async function analyzeEmails() {
  console.log('========================================');
  console.log('EMAIL NORMALIZATION IMPACT ANALYSIS');
  console.log('READ-ONLY - NO CHANGES WILL BE MADE');
  console.log('========================================\n');

  try {
    // Initialize database connection
    console.log('Connecting to database...');
    const pgOptions = AppDataSource.options as any;
    console.log(`Host: ${pgOptions.host}`);
    console.log(`Port: ${pgOptions.port}`);
    console.log(`Database: ${pgOptions.database}`);
    console.log(`User: ${pgOptions.username}\n`);
    
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const userRepository = AppDataSource.getRepository(User);

    // Get all users with emails
    const users = await userRepository.find({
      where: {},
      relations: ['wallet'],
      order: { email: 'ASC' },
    });

    const usersWithEmail = users.filter(user => user.email && user.email.trim() !== '');

    console.log(`📊 Total users with emails: ${usersWithEmail.length}\n`);

    // Analyze each user
    const analyses: EmailAnalysis[] = [];
    const emailsNeedingNormalization: EmailAnalysis[] = [];

    for (const user of usersWithEmail) {
      if (!user.email) continue;

      const normalizedEmail = user.email.toLowerCase().trim();
      const needsNormalization = user.email !== normalizedEmail;

      const analysis: EmailAnalysis = {
        originalEmail: user.email,
        normalizedEmail: normalizedEmail,
        userId: user.id,
        userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
        userType: user.user_type || 'USER',
        profileCompleted: user.profile_completed || false,
        emailVerified: !!user.email_verified_at,
        phoneVerified: user.is_phone_verified || false,
        walletBalance: Number(user.wallet?.balance || 0),
        vendorBalance: Number(user.wallet?.vendor_balance || 0),
        createdAt: user.created_at,
        lastActiveAt: user.last_active_at || null,
      };

      analyses.push(analysis);

      if (needsNormalization) {
        emailsNeedingNormalization.push(analysis);
      }
    }

    // Display emails that need normalization
    displayNormalizationNeeded(emailsNeedingNormalization);

    // Group by normalized email to find duplicates
    const duplicateGroups = findDuplicateGroups(analyses);

    // Display duplicate groups
    displayDuplicateGroups(duplicateGroups);

    // Display summary statistics
    displaySummary(analyses, emailsNeedingNormalization, duplicateGroups);

    // Close database connection
    await AppDataSource.destroy();
    console.log('\n✅ Analysis complete. Database connection closed.');

 } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Analysis failed:', error.message);
    } else {
      console.error('❌ Analysis failed:', error);
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

function displayNormalizationNeeded(emails: EmailAnalysis[]): void {
  console.log('========================================');
  console.log('[SECTION 1] EMAILS NEEDING NORMALIZATION');
  console.log('========================================\n');

  if (emails.length === 0) {
    console.log('✅ All emails are already normalized!\n');
    return;
  }

  console.log(`⚠️  Found ${emails.length} email(s) that need normalization:\n`);

  emails.forEach((email, index) => {
    console.log(`${index + 1}. User ID: ${email.userId}`);
    console.log(`   Original:   "${email.originalEmail}"`);
    console.log(`   Normalized: "${email.normalizedEmail}"`);
    console.log(`   Name: ${email.userName}`);
    console.log(`   Type: ${email.userType}`);
    console.log(`   Profile: ${email.profileCompleted ? '✓' : '✗'} | Email Verified: ${email.emailVerified ? '✓' : '✗'} | Phone Verified: ${email.phoneVerified ? '✓' : '✗'}`);
    console.log(`   Wallet: ₦${email.walletBalance} | Vendor: ₦${email.vendorBalance}`);
    console.log(`   Created: ${email.createdAt.toISOString().split('T')[0]}`);
    console.log('');
  });
}

function findDuplicateGroups(analyses: EmailAnalysis[]): DuplicateGroup[] {
  const groupMap = new Map<string, EmailAnalysis[]>();

  // Group by normalized email
  for (const analysis of analyses) {
    const normalized = analysis.normalizedEmail;
    
    if (!groupMap.has(normalized)) {
      groupMap.set(normalized, []);
    }
    
    groupMap.get(normalized)!.push(analysis);
  }

  // Filter only groups with duplicates (2+ users)
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [email, users] of groupMap.entries()) {
    if (users.length > 1) {
      duplicateGroups.push({
        normalizedEmail: email,
        count: users.length,
        users: users.sort((a, b) => {
          // Sort by various criteria for easier comparison
          if (a.emailVerified !== b.emailVerified) return b.emailVerified ? 1 : -1;
          if (a.profileCompleted !== b.profileCompleted) return b.profileCompleted ? 1 : -1;
          const aBalance = a.walletBalance + a.vendorBalance;
          const bBalance = b.walletBalance + b.vendorBalance;
          if (aBalance !== bBalance) return bBalance - aBalance;
          return b.createdAt.getTime() - a.createdAt.getTime();
        }),
      });
    }
  }

  // Sort duplicate groups by count (highest first)
  duplicateGroups.sort((a, b) => b.count - a.count);

  return duplicateGroups;
}

function displayDuplicateGroups(groups: DuplicateGroup[]): void {
  console.log('\n========================================');
  console.log('[SECTION 2] DUPLICATE EMAIL GROUPS');
  console.log('(After normalization)');
  console.log('========================================\n');

  if (groups.length === 0) {
    console.log('✅ No duplicate emails found after normalization!\n');
    return;
  }

  console.log(`⚠️  Found ${groups.length} duplicate email group(s):\n`);
  console.log(`📊 Total affected users: ${groups.reduce((sum, g) => sum + g.count, 0)}\n`);

  groups.forEach((group, groupIndex) => {
    console.log('═'.repeat(80));
    console.log(`GROUP ${groupIndex + 1}: ${group.normalizedEmail}`);
    console.log(`Total accounts: ${group.count}`);
    console.log('═'.repeat(80));

    group.users.forEach((user, userIndex) => {
      const totalBalance = user.walletBalance + user.vendorBalance;
      const daysSinceCreation = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceActive = user.lastActiveAt
        ? Math.floor((Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
        : 'Never';

      console.log(`\n  [${userIndex + 1}] User ID: ${user.userId}`);
      console.log(`      Original Email: "${user.originalEmail}"`);
      console.log(`      Name: ${user.userName}`);
      console.log(`      Type: ${user.userType}`);
      console.log(`      Status:`);
      console.log(`        • Profile Completed: ${user.profileCompleted ? '✓ Yes' : '✗ No'}`);
      console.log(`        • Email Verified: ${user.emailVerified ? '✓ Yes' : '✗ No'}`);
      console.log(`        • Phone Verified: ${user.phoneVerified ? '✓ Yes' : '✗ No'}`);
      console.log(`      Wallet:`);
      console.log(`        • Balance: ₦${user.walletBalance.toFixed(2)}`);
      console.log(`        • Vendor Balance: ₦${user.vendorBalance.toFixed(2)}`);
      console.log(`        • Total: ₦${totalBalance.toFixed(2)}`);
      console.log(`      Activity:`);
      console.log(`        • Account Age: ${daysSinceCreation} days`);
      console.log(`        • Last Active: ${daysSinceActive === 'Never' ? 'Never' : `${daysSinceActive} days ago`}`);
      console.log(`        • Created: ${user.createdAt.toISOString()}`);
    });

    console.log('\n' + '─'.repeat(80) + '\n');
  });
}

function displaySummary(
  allAnalyses: EmailAnalysis[],
  needsNormalization: EmailAnalysis[],
  duplicateGroups: DuplicateGroup[],
): void {
  console.log('\n========================================');
  console.log('SUMMARY STATISTICS');
  console.log('========================================\n');

  const totalUsers = allAnalyses.length;
  const uniqueNormalizedEmails = new Set(
    allAnalyses.map(a => a.normalizedEmail)
  ).size;
  const totalDuplicateUsers = duplicateGroups.reduce(
    (sum, g) => sum + g.count,
    0
  );
  const usersToBeRemoved = totalDuplicateUsers - duplicateGroups.length;

  console.log(`📊 Total users with emails: ${totalUsers}`);
  console.log(`📧 Unique emails (after normalization): ${uniqueNormalizedEmails}`);
  console.log(`🔄 Emails needing normalization: ${needsNormalization.length} (${((needsNormalization.length / totalUsers) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Duplicate groups: ${duplicateGroups.length}`);
  console.log(`👥 Total users in duplicate groups: ${totalDuplicateUsers}`);
  console.log(`❌ Users that would be removed: ${usersToBeRemoved}`);
  console.log(`✅ Users that would be kept: ${duplicateGroups.length}`);

  // Calculate impact on wallet balances
  let totalWalletImpact = 0;
  let totalVendorImpact = 0;

  duplicateGroups.forEach(group => {
    // Skip the first user (would be kept)
    group.users.slice(1).forEach(user => {
      totalWalletImpact += user.walletBalance;
      totalVendorImpact += user.vendorBalance;
    });
  });

  if (totalWalletImpact > 0 || totalVendorImpact > 0) {
    console.log(`\n💰 WALLET IMPACT (from removed accounts):`);
    console.log(`   • Total Wallet Balance: ₦${totalWalletImpact.toFixed(2)}`);
    console.log(`   • Total Vendor Balance: ₦${totalVendorImpact.toFixed(2)}`);
    console.log(`   • Combined Total: ₦${(totalWalletImpact + totalVendorImpact).toFixed(2)}`);
    console.log(`   ⚠️  WARNING: This money would be lost when accounts are deleted!`);
  }

  // User type breakdown of duplicates
  const userTypeBreakdown = new Map<string, number>();
  duplicateGroups.forEach(group => {
    group.users.slice(1).forEach(user => {
      const count = userTypeBreakdown.get(user.userType) || 0;
      userTypeBreakdown.set(user.userType, count + 1);
    });
  });

  if (userTypeBreakdown.size > 0) {
    console.log(`\n👤 ACCOUNTS TO BE REMOVED BY TYPE:`);
    for (const [type, count] of userTypeBreakdown.entries()) {
      console.log(`   • ${type}: ${count}`);
    }
  }

  console.log('\n========================================');
  console.log('💡 NEXT STEPS:');
  console.log('========================================');
  console.log('1. Review the duplicate groups above');
  console.log('2. Check if the scoring logic is appropriate');
  console.log('3. Run dry-run script for detailed decisions:');
  console.log('   npm run script:normalize-emails-dry-run');
  console.log('4. Execute normalization:');
  console.log('   npm run script:normalize-emails');
  console.log('========================================\n');
}

// Run the analysis
analyzeEmails();