import { Injectable, Logger, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType, UserStatus, Wallet, AuthProvider } from '../../../entities';
import { JWTService } from './jwt.service';
import { GoogleAuthService } from './google-auth.service';
import { AppleAuthService } from './apple-auth.service';
import { UserService } from '../../user/services/user.service';
import { GoogleAuthDto, AppleAuthDto } from '../dto';
import { getCurrencyForCountry } from '../../../utils/currency-mapper';
import { AuthResponseBuilder } from '../helpers/auth-response.builder';

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly userService: UserService,
    private readonly jwtService: JWTService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly appleAuthService: AppleAuthService,
    private readonly authResponseBuilder: AuthResponseBuilder,
  ) {}

  async googleSignIn(googleAuthDto: GoogleAuthDto) {
    const { idToken, firstName, lastName } = googleAuthDto;

    // Verify Google ID token
    const googleUserInfo = await this.googleAuthService.verifyIdToken(idToken);

    // Check if user exists with this Google ID
    let user = await this.userRepository.findOne({
      where: {
        provider_id: googleUserInfo.sub,
        auth_provider: AuthProvider.GOOGLE,
      },
    });

    if (!user) {
      user = await this.handleNewGoogleUser(googleUserInfo, firstName, lastName);
    } else {
      user = await this.updateExistingGoogleUser(user, googleUserInfo);
    }

    // Check if user is active
    this.validateUserStatus(user);

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`User signed in via Google: ${user.email}`);

    return this.authResponseBuilder.build(user, tokens);
  }

  async appleSignIn(appleAuthDto: AppleAuthDto) {
    const { identityToken, firstName, lastName, email } = appleAuthDto;

    // Verify Apple identity token
    const appleUserInfo = await this.appleAuthService.verifyIdentityToken(identityToken);

    // Use email from token if not provided in DTO
    const userEmail = email || appleUserInfo.email || appleUserInfo.sub;

    if (!userEmail) {
      throw new BadRequestException('Email is required for Apple Sign In');
    }

    // Check if user exists with this Apple ID
    let user = await this.userRepository.findOne({
      where: {
        provider_id: appleUserInfo.sub,
        auth_provider: AuthProvider.APPLE,
      },
    });

    if (!user) {
      user = await this.handleNewAppleUser(appleUserInfo, userEmail, firstName, lastName);
    } else {
      user = await this.updateExistingAppleUser(user, appleUserInfo, firstName, lastName);
    }

    // Check if user is active
    this.validateUserStatus(user);

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(user);

    this.logger.log(`User signed in via Apple: ${user.email}`);

    return this.authResponseBuilder.build(user, tokens);
  }

  private async handleNewGoogleUser(
    googleUserInfo: any,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    // Check if user exists with this email
    const existingUser = await this.userService.findByEmail(googleUserInfo.email);

    if (existingUser) {
      return await this.linkGoogleToExistingUser(existingUser, googleUserInfo);
    }

    // Create new user
    const nameParts = (googleUserInfo.name || '').split(' ');
    const userFirstName = firstName || googleUserInfo.given_name || nameParts[0] || '';
    const userLastName = lastName || googleUserInfo.family_name || nameParts.slice(1).join(' ') || '';

    const user = await this.userService.createUser({
      email: googleUserInfo.email,
      first_name: userFirstName || undefined,
      last_name: userLastName || undefined,
      auth_provider: AuthProvider.GOOGLE,
      provider_id: googleUserInfo.sub,
      provider_email: googleUserInfo.email,
      user_type: UserType.CUSTOMER,
      status: UserStatus.ACTIVE,
      email_verified_at: googleUserInfo.email_verified ? new Date() : undefined,
      image_url: googleUserInfo.picture,
      profile_completed: !!(userFirstName && userLastName),
    });

    // Create wallet for new user
    await this.createWalletForUser(user);

    this.logger.log(`Created new user via Google Sign In: ${user.id}`);

    return user;
  }

  private async handleNewAppleUser(
    appleUserInfo: any,
    userEmail: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    // Check if user exists with this email
    const existingUser = await this.userService.findByEmail(userEmail);

    if (existingUser) {
      return await this.linkAppleToExistingUser(existingUser, appleUserInfo, userEmail);
    }

    // Create new user
    const userFirstName = firstName || appleUserInfo.name?.firstName || '';
    const userLastName = lastName || appleUserInfo.name?.lastName || '';

    const user = await this.userService.createUser({
      email: userEmail,
      first_name: userFirstName || undefined,
      last_name: userLastName || undefined,
      auth_provider: AuthProvider.APPLE,
      provider_id: appleUserInfo.sub,
      provider_email: userEmail,
      user_type: UserType.CUSTOMER,
      status: UserStatus.ACTIVE,
      email_verified_at: appleUserInfo.email_verified ? new Date() : undefined,
      profile_completed: !!(userFirstName && userLastName),
    });

    // Create wallet for new user
    await this.createWalletForUser(user);

    this.logger.log(`Created new user via Apple Sign In: ${user.id}`);

    return user;
  }

  private async linkGoogleToExistingUser(existingUser: User, googleUserInfo: any): Promise<User> {
    // Only link if user has LOCAL auth
    if (existingUser.auth_provider === AuthProvider.LOCAL) {
      existingUser.auth_provider = AuthProvider.GOOGLE;
      existingUser.provider_id = googleUserInfo.sub;
      existingUser.provider_email = googleUserInfo.email;

      if (!existingUser.email_verified_at) {
        existingUser.markEmailVerified();
      }

      const user = await this.userRepository.save(existingUser);
      this.logger.log(`Linked Google account to existing user: ${user.id}`);
      return user;
    }

    // User exists with different provider
    throw new ConflictException(
      `Email is already registered with ${existingUser.auth_provider} authentication. Please sign in using ${existingUser.auth_provider}.`
    );
  }

  private async linkAppleToExistingUser(existingUser: User, appleUserInfo: any, userEmail: string): Promise<User> {
    // Only link if user has LOCAL auth
    if (existingUser.auth_provider === AuthProvider.LOCAL) {
      existingUser.auth_provider = AuthProvider.APPLE;
      existingUser.provider_id = appleUserInfo.sub;
      existingUser.provider_email = userEmail;

      if (!existingUser.email_verified_at) {
        existingUser.markEmailVerified();
      }

      const user = await this.userRepository.save(existingUser);
      this.logger.log(`Linked Apple account to existing user: ${user.id}`);
      return user;
    }

    // User exists with different provider
    throw new ConflictException(
      `Email is already registered with ${existingUser.auth_provider} authentication. Please sign in using ${existingUser.auth_provider}.`
    );
  }

  private async updateExistingGoogleUser(user: User, googleUserInfo: any): Promise<User> {
    let needsUpdate = false;

    if (googleUserInfo.picture && !user.image_url) {
      user.image_url = googleUserInfo.picture;
      needsUpdate = true;
    }

    if (googleUserInfo.email_verified && !user.email_verified_at) {
      user.markEmailVerified();
      needsUpdate = true;
    }

    user.updateLastActive();
    needsUpdate = true;

    if (needsUpdate) {
      return await this.userRepository.save(user);
    }

    return user;
  }

  private async updateExistingAppleUser(
    user: User,
    appleUserInfo: any,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    let needsUpdate = false;

    // Apple provides name only on first sign-in
    if (firstName && !user.first_name) {
      user.first_name = firstName;
      needsUpdate = true;
    }

    if (lastName && !user.last_name) {
      user.last_name = lastName;
      needsUpdate = true;
    }

    if (appleUserInfo.email_verified && !user.email_verified_at) {
      user.markEmailVerified();
      needsUpdate = true;
    }

    user.updateLastActive();
    needsUpdate = true;

    if (needsUpdate) {
      return await this.userRepository.save(user);
    }

    return user;
  }

  private async createWalletForUser(user: User): Promise<void> {
    const currency = getCurrencyForCountry(user.country || 'NG');
    const wallet = this.walletRepository.create({
      user_id: user.id,
      balance: 0,
      currency: currency,
    });
    await this.walletRepository.save(wallet);
    this.logger.log(`Created wallet with currency ${currency} for user ${user.id}`);
  }

  private validateUserStatus(user: User): void {
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Account is not active. Please contact support.');
    }
  }
}