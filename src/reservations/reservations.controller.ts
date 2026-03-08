import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateGuestReservationDto } from './dto/create-guest-reservation.dto';
import { ProposeChangeDto } from './dto/propose-change.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ProfessionalsService } from '../professionals/professionals.service';

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  @Post('guest')
  @Public()
  async createGuest(@Body() dto: CreateGuestReservationDto) {
    return this.reservationsService.createGuest(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: User, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(user, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: User) {
    if (user.role === UserRole.CLIENT) {
      return this.reservationsService.findForClient(user.id);
    }
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional) {
      return [];
    }
    return this.reservationsService.findForProfessional(professional.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOne(@CurrentUser() user: User, @Param('id') id: string) {
    const reservation = await this.reservationsService.findById(id);
    if (user.role === UserRole.CLIENT) {
      if (!reservation.clientId || reservation.clientId !== user.id) {
        throw new ForbiddenException('Not your reservation');
      }
    }
    if (user.role === UserRole.ADMIN) {
      const professional = await this.professionalsService.findByUserId(
        user.id,
      );
      if (!professional || reservation.professionalId !== professional.id) {
        throw new ForbiddenException('Not your reservation');
      }
    }
    return reservation;
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@CurrentUser() user: User, @Param('id') id: string) {
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional)
      throw new ForbiddenException('Professional profile required');
    return this.reservationsService.accept(professional.id, id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  async reject(@CurrentUser() user: User, @Param('id') id: string) {
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional)
      throw new ForbiddenException('Professional profile required');
    return this.reservationsService.reject(professional.id, id);
  }

  @Patch(':id/propose')
  @UseGuards(JwtAuthGuard)
  async propose(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ProposeChangeDto,
  ) {
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional)
      throw new ForbiddenException('Professional profile required');
    return this.reservationsService.proposeChange(professional.id, id, dto);
  }

  @Patch(':id/respond-proposal')
  @UseGuards(JwtAuthGuard)
  async respondToProposal(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { accept: boolean },
  ) {
    return this.reservationsService.respondToProposal(user.id, id, body.accept);
  }
}
