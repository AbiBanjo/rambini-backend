import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique identifier
 */
export const generateId = (): string => {
  return uuidv4();
};

/**
 * Generate a random OTP code
 */
export const generateOTP = (length: number = 6): string => {
  return Math.random()
    .toString()
    .substring(2, 2 + length);
};

/**
 * Format phone number to international format
 */
export const formatPhoneNumber = (phone: string, countryCode: string = '+234'): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, replace with country code
  if (cleaned.startsWith('0')) {
    return countryCode + cleaned.substring(1);
  }
  
  // If it starts with country code without +, add +
  if (cleaned.startsWith(countryCode.replace('+', ''))) {
    return '+' + cleaned;
  }
  
  // If it's already in international format, return as is
  if (cleaned.startsWith('234')) {
    return '+' + cleaned;
  }
  
  // Default: add country code
  return countryCode + cleaned;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Generate a random string
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = 'NGN'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

/**
 * AWS S3 File Upload Interface
 */
export interface S3UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  metadata?: {
    filename: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
  };
}

/**
 * Upload file to AWS S3 bucket
 */
export const uploadFileToS3 = async (
  file: Express.Multer.File,
  bucketName: string,
  folder: string = 'uploads',
  options?: {
    acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
    contentType?: string;
    metadata?: Record<string, string>;
  }
): Promise<S3UploadResult> => {
  try {
    // Check if AWS SDK is available
    if (typeof window !== 'undefined') {
      throw new Error('AWS SDK not available in browser environment');
    }

    // Dynamically import AWS SDK
    const AWS = require('aws-sdk');
    
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const s3 = new AWS.S3();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = generateRandomString(8);
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${timestamp}-${randomString}.${fileExtension}`;
    
    // Create S3 key (path in bucket)
    const key = `${folder}/${filename}`;

    // Prepare upload parameters
    const uploadParams: any = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: options?.contentType || file.mimetype,
      ACL: options?.acl || 'private',
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        ...options?.metadata,
      },
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    return {
      success: true,
      url: result.Location,
      key: result.Key,
      metadata: {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file to S3',
    };
  }
};

/**
 * Delete file from AWS S3 bucket
 */
export const deleteFileFromS3 = async (
  bucketName: string,
  key: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if AWS SDK is available
    if (typeof window !== 'undefined') {
      throw new Error('AWS SDK not available in browser environment');
    }

    // Dynamically import AWS SDK
    const AWS = require('aws-sdk');
    
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const s3 = new AWS.S3();

    // Delete from S3
    await s3.deleteObject({
      Bucket: bucketName,
      Key: key,
    }).promise();

    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete file from S3',
    };
  }
};

/**
 * Get presigned URL for private S3 objects
 */
export const getPresignedUrl = async (
  bucketName: string,
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Check if AWS SDK is available
    if (typeof window !== 'undefined') {
      throw new Error('AWS SDK not available in browser environment');
    }

    // Dynamically import AWS SDK
    const AWS = require('aws-sdk');
    
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const s3 = new AWS.S3();

    // Generate presigned URL
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: bucketName,
      Key: key,
      Expires: expiresIn,
    });

    return { success: true, url };
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate presigned URL',
    };
  }
};

/**
 * Validate file for S3 upload
 */
export const validateFileForS3 = (file: Express.Multer.File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  if (!file.originalname || file.originalname.trim().length === 0) {
    errors.push('File must have a valid name');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}; 