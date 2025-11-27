import { Injectable } from '@nestjs/common';
import { User } from '../../../entities';
import { TokenPair } from '../services/jwt.service';

export interface AuthResponse {
  user: {
    id: string;
    phoneNumber?: string;
    userType: string;
    profileCompleted: boolean;
    firstName?: string;
    lastName?: string;
    email: string;
    country?: string;
    emailVerified: boolean;
  };
  tokens: TokenPair;
}

@Injectable()
export class AuthResponseBuilder {
  build(user: User, tokens: TokenPair): AuthResponse {
    return {
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        profileCompleted: user.profile_completed,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        country: user.country,
        emailVerified: !!user.email_verified_at,
      },
      tokens,
    };
  }
}