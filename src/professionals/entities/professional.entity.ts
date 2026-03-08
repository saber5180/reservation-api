import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Availability } from '../../availability/entities/availability.entity';

@Entity('professionals')
export class Professional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.professional, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ default: 'General Practitioner' })
  specialty: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  // Unique slug for public booking URL: /booking/dr-smith
  @Column({ unique: true })
  slug: string;

  // Full booking URL - generated from slug, used for QR code
  // e.g. https://your-domain.com/booking/dr-smith
  @Column()
  bookingLink: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Reservation, (reservation) => reservation.professional)
  reservations: Reservation[];

  @OneToMany(() => Availability, (availability) => availability.professional)
  availability: Availability[];
}
