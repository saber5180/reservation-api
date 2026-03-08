import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ProfessionalsService } from '../professionals/professionals.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  @Post('professional/:professionalId')
  @UseGuards(JwtAuthGuard)
  async setAvailability(
    @CurrentUser() user: User,
    @Param('professionalId') professionalId: string,
    @Body() body: SetAvailabilityDto,
  ) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can set availability');
    }
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional || professional.id !== professionalId) {
      throw new ForbiddenException('Not authorized');
    }
    return this.availabilityService.setAvailability(professionalId, body.slots);
  }

  @Get('professional/:professionalId')
  @UseGuards(JwtAuthGuard)
  async getAvailability(
    @CurrentUser() user: User,
    @Param('professionalId') professionalId: string,
  ) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can view availability');
    }
    return this.availabilityService.getAvailability(professionalId);
  }

  @Get('slug/:slug')
  @Public()
  async getAvailabilityBySlug(@Param('slug') slug: string) {
    const professional = await this.professionalsService.findBySlug(slug);
    return this.availabilityService.getAvailability(professional.id);
  }

  @Get('slots/:slug')
  @Public()
  async getSlotsForDate(
    @Param('slug') slug: string,
    @Query('date') dateStr: string,
  ) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Date must be YYYY-MM-DD');
    }
    return this.availabilityService.getAvailableSlotsForDate(slug, dateStr);
  }
}
