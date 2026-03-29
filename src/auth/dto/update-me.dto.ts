import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
  if (value === '' || value === null) return undefined;
  return value;
}

export class UpdateMeDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  /** Renseigné uniquement pour les comptes cabinet (ADMIN) ; chaîne vide = effacer le numéro. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
