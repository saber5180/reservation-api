import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get('default')
  @Public()
  async getDefault() {
    const prof = await this.professionalsService.findDefault();
    if (!prof) throw new NotFoundException('No doctor configured');
    return {
      id: prof.id,
      name: prof.user?.name || 'Docteur',
      specialty: prof.specialty,
      bio: prof.bio,
      slug: prof.slug,
      bookingLink: prof.bookingLink,
    };
  }

  @Get('default/qr')
  @Public()
  async getDefaultQr() {
    const prof = await this.professionalsService.findDefault();
    if (!prof) throw new NotFoundException('No doctor configured');
    return this.professionalsService.getQrCodeDataUrl(prof.bookingLink);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateProfessionalDto,
  ) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin only');
    }
    return this.professionalsService.create(user, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional) {
      throw new NotFoundException('Professional profile not found');
    }
    return {
      id: professional.id,
      slug: professional.slug,
      bookingLink: professional.bookingLink,
      specialty: professional.specialty,
      bio: professional.bio,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: Partial<CreateProfessionalDto>,
  ) {
    const professional = await this.professionalsService.findByUserId(user.id);
    if (!professional) {
      throw new NotFoundException('Professional profile not found');
    }
    return this.professionalsService.update(professional.id, dto);
  }

  @Get(':slug/booking')
  @Public()
  async getBookingPageData(@Param('slug') slug: string) {
    const professional = await this.professionalsService.findBySlug(slug);
    return {
      id: professional.id,
      name: professional.user?.name || 'Docteur',
      specialty: professional.specialty,
      bio: professional.bio,
      slug: professional.slug,
      bookingLink: professional.bookingLink,
    };
  }

  @Get(':slug/qr')
  @Public()
  async getQrCode(@Param('slug') slug: string) {
    const professional = await this.professionalsService.findBySlug(slug);
    return this.professionalsService.getQrCodeDataUrl(professional.bookingLink);
  }
}
