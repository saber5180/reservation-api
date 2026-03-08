import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    role?: UserRole;
  }): Promise<User> {
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : null;
    const user = this.userRepository.create({
      ...data,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findOrCreateByPhone(
    phone: string,
  ): Promise<{ user: User; isNew: boolean }> {
    const existing = await this.userRepository.findOne({ where: { phone } });
    if (existing) return { user: existing, isNew: false };

    const user = this.userRepository.create({
      phone,
      role: UserRole.CLIENT,
    });
    const saved = await this.userRepository.save(user);
    return { user: saved, isNew: true };
  }

  async createAdmin(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      ...data,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['professional'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<User> {
    const user = await this.findById(id);

    if (data.email) {
      const existing = await this.userRepository.findOne({
        where: { email: data.email, id: Not(id) },
      });
      if (existing) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    return this.userRepository.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
