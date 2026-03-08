import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Otp } from './otp.entity';
import { Vonage } from '@vonage/server-sdk';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private vonage: Vonage | null = null;
  private vonageFrom: string;

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
  ) {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;

    if (apiKey && apiSecret) {
      this.vonage = new Vonage({ apiKey, apiSecret });
      this.vonageFrom = process.env.VONAGE_FROM || 'ResaPro';
      this.logger.log('Vonage SMS enabled');
    } else {
      this.logger.warn('Vonage not configured — OTP codes logged to console only');
    }
  }

  async sendOtp(phone: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({ phone, code, expiresAt }),
    );

    if (this.vonage) {
      try {
        const to = phone.replace(/[^0-9+]/g, '');
        await this.vonage.sms.send({
          to,
          from: this.vonageFrom,
          text: `Votre code DentaRDV : ${code}`,
        });
        this.logger.log(`SMS sent to ${to}`);
      } catch (err) {
        this.logger.error(`SMS failed for ${phone}: ${err.message}`);
      }
    } else {
      this.logger.log(`[DEV OTP] ${phone} => ${code}`);
    }

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
