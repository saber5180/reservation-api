import { IsInt, Min, Max, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

const TIME_RE =
  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

function trimTime(v: unknown): string {
  const s = typeof v === 'string' ? v : String(v ?? '');
  return s.length > 5 ? s.slice(0, 5) : s;
}

export class CreateAvailabilityDto {
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday

  @Transform(({ value }) => trimTime(value))
  @Matches(TIME_RE, {
    message: 'startTime must be in HH:MM or HH:MM:SS format',
  })
  startTime: string;

  @Transform(({ value }) => trimTime(value))
  @Matches(TIME_RE, {
    message: 'endTime must be in HH:MM or HH:MM:SS format',
  })
  endTime: string;
}
