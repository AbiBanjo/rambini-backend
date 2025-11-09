import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!this.clientId) {
      this.logger.warn('GOOGLE_CLIENT_ID is not configured');
    }

    // Initialize OAuth2Client for token verification
    this.client = new OAuth2Client(this.clientId, clientSecret);
  }

  /**
   * Verify Google ID token and extract user information
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      // Verify the token
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      // Extract user information
      const userInfo: GoogleUserInfo = {
        sub: payload.sub,
        email: payload.email || '',
        email_verified: payload.email_verified || false,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };

      if (!userInfo.email) {
        throw new UnauthorizedException('Email not provided by Google');
      }

      return userInfo;
    } catch (error) {
      this.logger.error(`Google token verification failed: ${error.message}`);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  /**
   * Alternative method: Verify token using Google's tokeninfo endpoint
   * This is a fallback method if OAuth2Client doesn't work
   */
  async verifyIdTokenViaAPI(idToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );

      if (response.data.aud !== this.clientId) {
        throw new UnauthorizedException('Token audience mismatch');
      }

      const payload = response.data;

      return {
        sub: payload.sub,
        email: payload.email || '',
        email_verified: payload.email_verified === 'true' || payload.email_verified === true,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      this.logger.error(`Google token verification via API failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }
}

