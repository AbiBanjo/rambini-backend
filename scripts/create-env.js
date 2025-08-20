const fs = require('fs');
const path = require('path');

function createEnvFile() {
  const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=rambini
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Twilio SMS Configuration (Optional - for SMS functionality)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps API Key (Optional - for geocoding)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Mapbox Access Token (Optional - alternative to Google Maps)
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# AWS S3 Configuration (Required for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=rambini-vendor-documents

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100

# Environment
NODE_ENV=development
`;

  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully at:', envPath);
    console.log('\n📝 Please update the database credentials in the .env file:');
    console.log('   - DB_USERNAME: Your PostgreSQL username');
    console.log('   - DB_PASSWORD: Your PostgreSQL password');
    console.log('   - DB_DATABASE: Your database name');
    console.log('\n💡 After updating the credentials, run: node scripts/fix-database-schema.js');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
}

createEnvFile(); 