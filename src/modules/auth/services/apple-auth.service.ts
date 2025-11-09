import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import * as jwksRsa from 'jwks-rsa';
import type { JwksClient } from 'jwks-rsa';

export interface AppleUserInfo {
  sub: string; // Apple user ID
  email?: string;
  email_verified?: boolean;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

@Injectable()
export class AppleAuthService {
  private readonly logger = new Logger(AppleAuthService.name);
  private readonly clientId: string;
  private readonly jwksClient: JwksClient;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('APPLE_CLIENT_ID');

    if (!this.clientId) {
      this.logger.warn('APPLE_CLIENT_ID is not configured');
    }

    // Initialize JWKS client for Apple's public keys
    // jwks-rsa exports a default function, but TypeScript needs explicit handling
    const createJwksClient = (jwksRsa as any).default || jwksRsa;
    this.jwksClient = createJwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  /**
   * Get Apple's public key for token verification
   */
  private async getApplePublicKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        const signingKey = key.getPublicKey();
        resolve(signingKey);
      });
    });
  }

  /**
   * Verify Apple ID token and extract user information
   */
  async verifyIdentityToken(identityToken: string): Promise<AppleUserInfo> {
    try {
      // Decode the token without verification first to get the header
      const decoded = jwt.decode(identityToken, { complete: true }) as jwt.JwtPayload;

      this.logger.log(decoded);

      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid Apple token structure');
      }

      // Get Apple's public key
      const publicKey = await this.getApplePublicKey(decoded.header.kid);

      // Verify the token
      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
      }) as jwt.JwtPayload;

      // Verify the audience (client_id)
      if (payload.aud !== this.clientId && payload.aud !== `com.${this.clientId}`) {
        throw new UnauthorizedException('Token audience mismatch');
      }

      // Verify the issuer
      if (payload.iss !== 'https://appleid.apple.com') {
        throw new UnauthorizedException('Invalid token issuer');
      }

      // Extract user information
      const userInfo: AppleUserInfo = {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified === 'true' || payload.email_verified === true,
      };

      // Note: Apple doesn't include name in the token after the first sign-in
      // The name should be provided separately by the client
      if (payload.name) {
        userInfo.name = {
          firstName: payload.name.firstName,
          lastName: payload.name.lastName,
        };
      }

      return userInfo;
    } catch (error) {
      this.logger.error(`Apple token verification failed: ${error.message}`);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Invalid Apple token: ${error.message}`);
      }
      
      throw new UnauthorizedException('Invalid Apple identity token');
    }
  }

  /**
   * Verify authorization code (optional - for server-side flow)
   */
  async verifyAuthorizationCode(authorizationCode: string): Promise<any> {
    // This would require exchanging the code for tokens
    // For now, we'll focus on identity token verification
    // This method can be implemented if needed for a different flow
    throw new UnauthorizedException('Authorization code verification not implemented');
  }
}

