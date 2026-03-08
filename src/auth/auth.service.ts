import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string; otp?: string }> {
    const code = await this.otpService.sendOtp(phone);
    return {
      message: 'OTP sent',
      otp: code,
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{
    access_token: string;
    user: Omit<User, 'password'>;
    isNew: boolean;
  }> {
    const valid = await this.otpService.verifyOtp(phone, code);
    if (!valid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const { user, isNew } = await this.usersService.findOrCreateByPhone(phone);
    const token = this.generateToken(user);
    const { password: _, ...safe } = user;
    return { access_token: token, user: safe, isNew };
  }

  async adminLogin(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.usersService.validatePassword(
      password,
      user.password,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.generateToken(user);
    const { password: _, ...safe } = user;
    return { access_token: token, user: safe };
  }

  async getMe(user: User): Promise<Omit<User, 'password'>> {
    const fullUser = await this.usersService.findById(user.id);
    const { password: _, ...safe } = fullUser;
    return safe;
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}
