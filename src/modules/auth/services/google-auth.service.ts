import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

export interface GoogleUserInfo {
  sub: string;
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
  private readonly iosClientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.iosClientId = this.configService.get<string>('GOOGLE_IOS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!this.clientId) {
      this.logger.warn('GOOGLE_CLIENT_ID is not configured');
    }

    if (!this.iosClientId) {
      this.logger.warn('GOOGLE_IOS_CLIENT_ID is not configured');
    }

    this.client = new OAuth2Client(this.clientId, clientSecret);
  }

  /**
   * Build the list of accepted audiences (web + iOS client IDs)
   */
  private getAudiences(): string[] {
    const audiences: string[] = [];
    if (this.clientId) audiences.push(this.clientId);
    if (this.iosClientId) audiences.push(this.iosClientId);
    return audiences;
  }

  /**
   * Verify Google ID token and extract user information
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const audiences = this.getAudiences();

      if (audiences.length === 0) {
        throw new UnauthorizedException('Google client IDs are not configured');
      }

      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: audiences,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

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

      this.logger.log(`Google token verified for: ${userInfo.email}`);

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
   * Fallback: Verify token using Google's tokeninfo endpoint
   */
  async verifyIdTokenViaAPI(idToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );

      const audiences = this.getAudiences();
      const tokenAud = response.data.aud;

      if (!audiences.includes(tokenAud)) {
        this.logger.error(
          `Token audience mismatch. Got: ${tokenAud}, Expected one of: ${audiences.join(', ')}`
        );
        throw new UnauthorizedException('Token audience mismatch');
      }

      const payload = response.data;

      return {
        sub: payload.sub,
        email: payload.email || '',
        email_verified:
          payload.email_verified === 'true' || payload.email_verified === true,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      this.logger.error(
        `Google token verification via API failed: ${error.message}`
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Google ID token');
    }
  }
}