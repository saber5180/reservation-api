import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Otp } from './otp.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
  ) {}

  async sendOtp(phone: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({ phone, code, expiresAt }),
    );

    // TODO: integrate real SMS provider (Twilio, etc.)
    console.log(`[DEV OTP] ${phone} => ${code}`);
    return code;
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        phone,
        code,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) return false;

    otp.used = true;
    await this.otpRepository.save(otp);
    return true;
  }
}
