import { IsString, IsOptional, IsNotEmpty } from 'class-validator';



export class IntializeDeliveryDto {
// customer address id
@IsString()
@IsNotEmpty()
customer_address_id: string;

// vendor's id
@IsString()
@IsNotEmpty()
vendor_id: string;
}