import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Otp } from './otp.entity';
import * as Twilio from 'twilio';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private twilioClient: Twilio.Twilio | null = null;
  private twilioFrom: string | null = null;

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
  ) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (sid && token && from) {
      this.twilioClient = Twilio.default(sid, token);
      this.twilioFrom = from;
      this.logger.log('Twilio SMS enabled');
    } else {
      this.logger.warn('Twilio not configured — OTP codes will be logged to console only');
    }
  }

  async sendOtp(phone: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({ phone, code, expiresAt }),
    );

    if (this.twilioClient && this.twilioFrom) {
      try {
        await this.twilioClient.messages.create({
          body: `Votre code RésaPro : ${code}`,
          from: this.twilioFrom,
          to: phone,
        });
        this.logger.log(`SMS sent to ${phone}`);
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
