import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateProfessionalMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string;
}
