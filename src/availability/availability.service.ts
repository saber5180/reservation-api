import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalsService } from '../professionals/professionals.service';
import { Availability } from './entities/availability.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

export interface TimeSlot {
  start: string;
  end: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async setAvailability(
    professionalId: string,
    slots: CreateAvailabilityDto[],
  ): Promise<Availability[]> {
    await this.availabilityRepository.delete({ professionalId });
    const entities = slots.map((s) =>
      this.availabilityRepository.create({
        professionalId,
        dayOfWeek: s.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startTime: s.startTime,
        endTime: s.endTime,
      }),
    );
    return this.availabilityRepository.save(entities);
  }

  async getAvailability(professionalId: string): Promise<Availability[]> {
    return this.availabilityRepository.find({
      where: { professionalId },
      order: { dayOfWeek: 'ASC' },
    });
  }

  async getAvailableSlotsForDate(
    slug: string,
    dateStr: string,
    slotDurationMinutes = 30,
  ): Promise<TimeSlot[]> {
    const professional = await this.professionalsService.findBySlug(slug);
    const availability = await this.getAvailability(professional.id);

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayOfWeek = date.getDay();

    const dayAvailability = availability.filter(
      (a) => Number(a.dayOfWeek) === dayOfWeek,
    );
    if (dayAvailability.length === 0) {
      return [];
    }

    const slots: TimeSlot[] = [];

    for (const av of dayAvailability) {
      const [startH, startM] = av.startTime.split(':').map(Number);
      const [endH, endM] = av.endTime.split(':').map(Number);

      const current = new Date(year, month - 1, day, startH, startM, 0, 0);
      const end = new Date(year, month - 1, day, endH, endM, 0, 0);

      while (
        current.getTime() + slotDurationMinutes * 60 * 1000 <=
        end.getTime()
      ) {
        const slotEnd = new Date(
          current.getTime() + slotDurationMinutes * 60 * 1000,
        );
        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
        });
        current.setTime(slotEnd.getTime());
      }
    }

    return slots;
  }
}
