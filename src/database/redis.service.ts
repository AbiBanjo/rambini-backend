import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: RedisClientType | null = null;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = !!(
      this.configService.get('REDIS_HOST') &&
      this.configService.get('REDIS_PORT')
    );

    if (this.isEnabled) {
      try {
        this.redisClient = createClient({
          socket: {
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
          },
          // password: this.configService.get('REDIS_PASSWORD'),
          // database: this.configService.get('REDIS_DB', 0),
        });

        this.redisClient.on('error', (err) => {
          this.logger.error('Redis Client Error:', err);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis Client Connected');
        });

        this.redisClient.connect().catch((err) => {
          this.logger.error('Failed to connect to Redis:', err);
          this.redisClient = null;
        });
      } catch (error) {
        this.logger.error('Failed to initialize Redis client:', error);
        this.redisClient = null;
      }
    } else {
      this.logger.warn('Redis not configured, RedisService will be disabled');
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.redisClient || !this.isEnabled) {
      return false;
    }
    
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!(await this.ensureConnection())) {
      return null;
    }

    try {
      return await this.redisClient!.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!(await this.ensureConnection())) {
      return;
    }

    try {
      await this.redisClient!.set(key, value);
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!(await this.ensureConnection())) {
      return;
    }

    try {
      await this.redisClient!.setEx(key, seconds, value);
    } catch (error) {
      this.logger.error(`Error setting key ${key} with expiry:`, error);
    }
  }

  async del(key: string): Promise<number> {
    if (!(await this.ensureConnection())) {
      return 0;
    }

    try {
      return await this.redisClient!.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!(await this.ensureConnection())) {
      return false;
    }

    try {
      const result = await this.redisClient!.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!(await this.ensureConnection())) {
      return false;
    }

    try {
      return await this.redisClient!.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Error setting expiry for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!(await this.ensureConnection())) {
      return -1;
    }

    try {
      return await this.redisClient!.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient && this.redisClient.isOpen) {
      try {
        await this.redisClient.quit();
        this.logger.log('Redis Client Disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting Redis client:', error);
      }
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled && this.redisClient !== null;
  }
} 