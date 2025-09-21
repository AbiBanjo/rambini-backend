import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AddressService } from '../services/address.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Address, User } from '../../../entities';
import { GetUser } from '@/common/decorators/get-user.decorator';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAddress(
    @GetUser() user: User,
    @Body() createRequest: CreateAddressDto,
  ): Promise<Address> {
    return this.addressService.createAddress(user.id, createRequest);
  }

  @Get()
  async getUserAddresses(@GetUser() user: User): Promise<Address[]> {
    return this.addressService.getUserAddresses(user.id);
  }

  @Get('default')
  async getDefaultAddress(@GetUser() user: User): Promise<Address | null> {
    return this.addressService.getDefaultAddress(user.id);
  }

  @Get(':id')
  async getAddressById(@GetUser() user: User, @Param('id') id: string): Promise<Address> {
    return this.addressService.getAddressById(user.id, id);
  }

  @Put(':id')
  async updateAddress(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateRequest: UpdateAddressDto,
  ): Promise<Address> {
    return this.addressService.updateAddress(user.id, id, updateRequest);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@GetUser() user: User, @Param('id') id: string): Promise<void> {
    await this.addressService.deleteAddress(user.id, id);
  }

  @Put(':id/default')
  async setDefaultAddress(@GetUser() user: User, @Param('id') id: string): Promise<Address> {
    return this.addressService.setDefaultAddress(user.id, id);
  }

  @Post('validate')
  async validateAddress(@Body() addressRequest: CreateAddressDto): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    return this.addressService.validateAddress(addressRequest);
  }

  // @Post('validate-shipbubble')
  // async validateAddressWithShipBubble(
  //   @GetUser() user: User,
  //   @Body() addressRequest: CreateAddressDto,
  // ): Promise<{
  //   success: boolean;
  //   isValid: boolean;
  //   data?: {
  //     name: string;
  //     email: string;
  //     phone: string;
  //     formatted_address: string;
  //     country: string;
  //     country_code: string;
  //     city: string;
  //     city_code: string;
  //     state: string;
  //     state_code: string;
  //     postal_code: string;
  //     latitude: number;
  //     longitude: number;
  //     address_code: number;
  //   };
  //   error?: string;
  // }> {
  //   const fullAddress = [
  //     addressRequest.address_line_1,
  //     addressRequest.address_line_2,
  //     addressRequest.city,
  //     addressRequest.state,
  //     addressRequest.country || 'Nigeria'
  //   ].filter(Boolean).join(', ');

  //   const userInfo = {
  //     name: user.full_name || `${user.first_name} ${user.last_name}`,
  //     email: user.email,
  //     phone: user.phone_number,
  //   };

  //   return this.addressService.validateAddressWithShipBubble({
  //     ...userInfo,
  //     address: fullAddress,
  //     latitude: addressRequest.latitude,
  //     longitude: addressRequest.longitude,
  //   });
  // }

//  @Post(':id/validate-for-delivery')
//    async validateAddressForDelivery(
//     @GetUser() user: User,
//     @Param('id') addressId: string,
//   ): Promise<Address> {
//     const userInfo = {
//       name: user.full_name || `${user.first_name} ${user.last_name}`,
//       email: user.email,
//       phone: user.phone_number,
//     };

//     return this.addressService.validateAddressForDelivery(addressId, userInfo);
//   }
} 