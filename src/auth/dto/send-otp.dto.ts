import { IsString, MinLength } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @MinLength(6)
  phone: string;
}
