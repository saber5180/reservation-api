import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Professional } from '../../professionals/entities/professional.entity';

// 0 = Sunday, 1 = Monday, ... 6 = Saturday
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

@Entity('availability')
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  professionalId: string;

  @ManyToOne(() => Professional, (prof) => prof.availability, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  professional: Professional;

  @Column({ type: 'int' }) // 0-6
  dayOfWeek: number;

  @Column({ type: 'time' }) // e.g. "09:00"
  startTime: string;

  @Column({ type: 'time' }) // e.g. "17:00"
  endTime: string;
}
