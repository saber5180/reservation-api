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
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly realtime: RealtimeService,
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
    const saved = await this.reservationRepository.save(reservation);
    this.realtime.notifyNewReservation(saved.professionalId, {
      id: saved.id,
      status: saved.status,
      slotStart: saved.slotStart,
      slotEnd: saved.slotEnd,
    });
    return saved;
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
    const saved = await this.reservationRepository.save(reservation);
    this.realtime.notifyNewReservation(saved.professionalId, {
      id: saved.id,
      status: saved.status,
      slotStart: saved.slotStart,
      slotEnd: saved.slotEnd,
    });
    return saved;
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
    const saved = await this.reservationRepository.save(reservation);
    if (saved.clientId) {
      this.realtime.notifyClientReservation(saved.clientId, {
        id: saved.id,
        status: saved.status,
        slotStart: saved.slotStart,
        slotEnd: saved.slotEnd,
      });
    }
    return saved;
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
    const saved = await this.reservationRepository.save(reservation);
    if (saved.clientId) {
      this.realtime.notifyClientReservation(saved.clientId, {
        id: saved.id,
        status: saved.status,
      });
    }
    return saved;
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
    const proposedStart = new Date(dto.proposedSlotStart);
    const proposedEnd = new Date(dto.proposedSlotEnd);
    if (!(proposedEnd.getTime() > proposedStart.getTime())) {
      throw new BadRequestException(
        "L'heure de fin doit être après l'heure de début",
      );
    }
    if (proposedStart.getTime() < Date.now()) {
      throw new BadRequestException('Le créneau proposé doit être dans le futur');
    }
    reservation.status = ReservationStatus.CHANGE_PROPOSED;
    reservation.proposedSlotStart = proposedStart;
    reservation.proposedSlotEnd = proposedEnd;
    const saved = await this.reservationRepository.save(reservation);
    if (saved.clientId) {
      this.realtime.notifyClientReservation(saved.clientId, {
        id: saved.id,
        status: saved.status,
        proposedSlotStart: saved.proposedSlotStart ?? undefined,
        proposedSlotEnd: saved.proposedSlotEnd ?? undefined,
      });
    }
    return saved;
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
      reservation.status = ReservationStatus.PENDING;
      reservation.proposedSlotStart = null;
      reservation.proposedSlotEnd = null;
    }
    const saved = await this.reservationRepository.save(reservation);
    if (saved.clientId) {
      this.realtime.notifyClientReservation(saved.clientId, {
        id: saved.id,
        status: saved.status,
        slotStart: saved.slotStart,
        slotEnd: saved.slotEnd,
      });
    }
    this.realtime.notifyProfessionalRefresh(saved.professionalId, {
      id: saved.id,
      status: saved.status,
    });
    return saved;
  }
}
