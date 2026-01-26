// File: src/scripts/fix-duplicates.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FixDuplicateCreditsService } from '../src/modules/payment/services/fix-duplicate-credits.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const fixService = app.get(FixDuplicateCreditsService);

  // Get vendor user ID from command line argument
  const vendorUserId = process.argv[2];

  if (!vendorUserId) {
    console.error('❌ Error: Please provide vendor user ID as argument');
    console.log('Usage: npm run fix-duplicates <vendor-user-id>');
    process.exit(1);
  }

  console.log(`\n🔍 Checking for duplicates for vendor: ${vendorUserId}\n`);

  try {
    // First check
    const duplicates = await fixService.checkForDuplicates(vendorUserId);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      await app.close();
      process.exit(0);
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate payment(s):\n`);
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. Reference: ${dup.reference_id}`);
      console.log(`   Amount: ${dup.amount}`);
      console.log(`   Times credited: ${dup.count}`);
      console.log(`   First credit: ${dup.first_credit_at}`);
      console.log(`   Last credit: ${dup.last_credit_at}`);
      console.log('');
    });

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      'Do you want to fix these duplicates? (yes/no): ',
      async (answer: string) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          console.log('\n🔧 Fixing duplicates...\n');

          const result = await fixService.fixDuplicateCredits(vendorUserId);

          console.log('✅ Fix completed!');
          console.log(`   Duplicates found: ${result.duplicatesFound}`);
          console.log(`   Amount deducted: ${result.amountToDeduct}`);
          console.log(`   New wallet balance: ${result.fixedBalance}`);

          readline.close();
          await app.close();
          process.exit(0);
        } else {
          console.log('❌ Fix cancelled.');
          readline.close();
          await app.close();
          process.exit(0);
        }
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Error:', String(error));
    }
    await app.close();
    process.exit(1);
  }
}

bootstrap();
