import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Professional } from './entities/professional.entity';
import { User } from '../users/entities/user.entity';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(Professional)
    private readonly professionalRepository: Repository<Professional>,
  ) {}

  async create(user: User, dto: CreateProfessionalDto): Promise<Professional> {
    const slug = this.slugify(dto.slug || `${user.name || 'doc'}-${Date.now()}`);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const bookingLink = `${baseUrl}/booking/${slug}`;

    const professional = this.professionalRepository.create({
      userId: user.id,
      specialty: dto.specialty,
      bio: dto.bio,
      slug,
      bookingLink,
    });
    return this.professionalRepository.save(professional);
  }

  async update(
    id: string,
    dto: Partial<CreateProfessionalDto>,
  ): Promise<Professional> {
    const prof = await this.findById(id);
    if (dto.specialty) prof.specialty = dto.specialty;
    if (dto.bio !== undefined) prof.bio = dto.bio;
    return this.professionalRepository.save(prof);
  }

  async findDefault(): Promise<Professional | null> {
    return this.professionalRepository
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.user', 'u')
      .where('u.role = :role', { role: 'ADMIN' })
      .orderBy('p.createdAt', 'ASC')
      .getOne();
  }

  async findBySlug(slug: string): Promise<Professional> {
    const professional = await this.professionalRepository.findOne({
      where: { slug },
      relations: ['user'],
    });
    if (!professional) {
      throw new NotFoundException(`Professional with slug ${slug} not found`);
    }
    return professional;
  }

  async findById(id: string): Promise<Professional> {
    const professional = await this.professionalRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!professional) {
      throw new NotFoundException(`Professional with id ${id} not found`);
    }
    return professional;
  }

  async findByUserId(userId: string): Promise<Professional | null> {
    return this.professionalRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  getBookingUrl(slug: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/booking/${slug}`;
  }

  async getQrCodeDataUrl(bookingLink: string): Promise<{ dataUrl: string }> {
    const dataUrl = await QRCode.toDataURL(bookingLink, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0284c7', light: '#ffffff' },
    });
    return { dataUrl };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
