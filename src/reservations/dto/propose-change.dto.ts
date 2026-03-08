import { IsDateString } from 'class-validator';

export class ProposeChangeDto {
  @IsDateString()
  proposedSlotStart: string;

  @IsDateString()
  proposedSlotEnd: string;
}
