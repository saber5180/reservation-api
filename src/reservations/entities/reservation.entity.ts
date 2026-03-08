import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Professional } from '../../professionals/entities/professional.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CHANGE_PROPOSED = 'CHANGE_PROPOSED',
  CONFIRMED = 'CONFIRMED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  professionalId: string;

  @ManyToOne(() => Professional, (prof) => prof.reservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  professional: Professional;

  @Column({ nullable: true })
  clientId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  client: User | null;

  @Column({ type: 'varchar', nullable: true })
  guestName: string | null;

  @Column({ type: 'varchar', nullable: true })
  guestPhone: string | null;

  @Column({ type: 'timestamptz' })
  slotStart: Date;

  @Column({ type: 'timestamptz' })
  slotEnd: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  // When doctor proposes a new time: proposedSlotStart/End
  @Column({ type: 'timestamptz', nullable: true })
  proposedSlotStart: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  proposedSlotEnd: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
