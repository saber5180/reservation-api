import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  specialty: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;
}
