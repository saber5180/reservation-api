import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateGuestReservationDto } from './dto/create-guest-reservation.dto';
import { ProposeChangeDto } from './dto/propose-change.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async createGuest(dto: CreateGuestReservationDto): Promise<Reservation> {
    const reservation = this.reservationRepository.create({
      professionalId: dto.professionalId,
      clientId: null,
      guestName: dto.guestName,
      guestPhone: dto.guestPhone,
      slotStart: new Date(dto.slotStart),
      slotEnd: new Date(dto.slotEnd),
      status: ReservationStatus.PENDING,
    });
    return this.reservationRepository.save(reservation);
  }

  async create(client: User, dto: CreateReservationDto): Promise<Reservation> {
    if (client.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Only clients can create reservations');
    }
    const reservation = this.reservationRepository.create({
      professionalId: dto.professionalId,
      clientId: client.id,
      slotStart: new Date(dto.slotStart),
      slotEnd: new Date(dto.slotEnd),
      status: ReservationStatus.PENDING,
    });
    return this.reservationRepository.save(reservation);
  }

  async findById(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['professional', 'professional.user', 'client'],
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }
    return reservation;
  }

  async findForClient(clientId: string): Promise<Reservation[]> {
    return this.reservationRepository.find({
      where: { clientId },
      relations: ['professional', 'professional.user'],
      order: { slotStart: 'DESC' },
    });
  }

  async findForProfessional(professionalId: string): Promise<Reservation[]> {
    return this.reservationRepository.find({
      where: { professionalId },
      relations: ['client'],
      order: { slotStart: 'DESC' },
    });
  }

  async accept(professionalId: string, reservationId: string): Promise<Reservation> {
    const reservation = await this.findById(reservationId);
    if (reservation.professionalId !== professionalId) {
      throw new ForbiddenException('Not your reservation');
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Can only accept pending reservations');
    }
    reservation.status = ReservationStatus.CONFIRMED;
    return this.reservationRepository.save(reservation);
  }

  async reject(professionalId: string, reservationId: string): Promise<Reservation> {
    const reservation = await this.findById(reservationId);
    if (reservation.professionalId !== professionalId) {
      throw new ForbiddenException('Not your reservation');
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Can only reject pending reservations');
    }
    reservation.status = ReservationStatus.REJECTED;
    return this.reservationRepository.save(reservation);
  }

  async proposeChange(
    professionalId: string,
    reservationId: string,
    dto: ProposeChangeDto,
  ): Promise<Reservation> {
    const reservation = await this.findById(reservationId);
    if (reservation.professionalId !== professionalId) {
      throw new ForbiddenException('Not your reservation');
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Can only propose change for pending reservations');
    }
    reservation.status = ReservationStatus.CHANGE_PROPOSED;
    reservation.proposedSlotStart = new Date(dto.proposedSlotStart);
    reservation.proposedSlotEnd = new Date(dto.proposedSlotEnd);
    return this.reservationRepository.save(reservation);
  }

  async respondToProposal(
    clientId: string,
    reservationId: string,
    accept: boolean,
  ): Promise<Reservation> {
    const reservation = await this.findById(reservationId);
    if (reservation.clientId !== clientId) {
      throw new ForbiddenException('Not your reservation');
    }
    if (reservation.status !== ReservationStatus.CHANGE_PROPOSED) {
      throw new BadRequestException('No proposal to respond to');
    }
    if (accept && reservation.proposedSlotStart && reservation.proposedSlotEnd) {
      reservation.slotStart = reservation.proposedSlotStart;
      reservation.slotEnd = reservation.proposedSlotEnd;
      reservation.proposedSlotStart = null;
      reservation.proposedSlotEnd = null;
      reservation.status = ReservationStatus.CONFIRMED;
    } else {
      reservation.status = ReservationStatus.REJECTED;
      reservation.proposedSlotStart = null;
      reservation.proposedSlotEnd = null;
    }
    return this.reservationRepository.save(reservation);
  }
}
