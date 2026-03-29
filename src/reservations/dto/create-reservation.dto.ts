import { IsUUID, IsDateString } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  professionalId: string;

  @IsDateString()
  slotStart: string;

  @IsDateString()
  slotEnd: string;
}
