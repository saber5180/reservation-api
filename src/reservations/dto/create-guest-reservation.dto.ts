import { IsUUID, IsDateString, IsString, MinLength } from 'class-validator';

export class CreateGuestReservationDto {
  @IsUUID()
  professionalId: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  guestName: string;

  @IsString()
  @MinLength(6, { message: 'Le numéro de téléphone est requis' })
  guestPhone: string;

  @IsDateString()
  slotStart: string;

  @IsDateString()
  slotEnd: string;
}
