import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('send-otp')
  @Public()
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  @Public()
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Post('pro/send-otp')
  @Public()
  async proSendOtp(@Body() dto: SendOtpDto) {
    return this.authService.proSendOtp(dto.phone);
  }

  @Post('pro/verify-otp')
  @Public()
  async proVerifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.proVerifyOtp(dto.phone, dto.code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    const updates: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } = {};
    if (dto.name !== undefined) {
      updates.name = dto.name.trim() ? dto.name.trim() : null;
    }
    if (dto.email !== undefined) {
      updates.email = dto.email.trim() ? dto.email.trim() : null;
    }
    if (user.role === UserRole.ADMIN && dto.phone !== undefined) {
      updates.phone = dto.phone.trim() ? dto.phone.trim() : null;
    }
    return this.usersService.updateProfile(user.id, updates);
  }
}
