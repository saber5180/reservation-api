import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  /** Numéro réservé accès praticien (ex. 123456), aligné sur le user ADMIN en base. */
  private cabinetAccessDigits(): string {
    return (this.config.get<string>('CABINET_ACCESS_PHONE') ?? '123456').replace(
      /\D/g,
      '',
    );
  }

  private isReservedCabinetPhone(phone: string): boolean {
    const d = phone.replace(/\D/g, '');
    const exp = this.cabinetAccessDigits();
    return exp.length > 0 && d === exp;
  }

  async sendOtp(phone: string): Promise<{ message: string; otp?: string }> {
    if (this.isReservedCabinetPhone(phone)) {
      throw new BadRequestException(
        'Ce numéro est réservé au praticien : utilisez la page Connexion (menu), pas la réservation.',
      );
    }
    const code = await this.otpService.sendOtp(phone);
    return { message: 'OTP sent', otp: code };
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{
    access_token: string;
    user: Omit<User, 'password'>;
    isNew: boolean;
  }> {
    if (this.isReservedCabinetPhone(phone)) {
      throw new BadRequestException('Ce numéro est réservé au praticien.');
    }
    const valid = await this.otpService.verifyOtp(phone, code);
    if (!valid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const { user, isNew } = await this.usersService.findOrCreateByPhone(phone);
    const token = this.generateToken(user);
    const { password: _, ...safe } = user;
    return { access_token: token, user: safe, isNew };
  }

  private phoneVariants(raw: string): string[] {
    const t = raw.trim().replace(/[\s.-]/g, '');
    const v = new Set<string>();
    if (t) v.add(t);
    if (/^0[67]\d{8}$/.test(t)) v.add('+33' + t.slice(1));
    if (/^33[67]\d{8}$/.test(t)) v.add('+' + t);
    return [...v];
  }

  /**
   * Résout le praticien et la clé OTP (même chaîne à l’envoi et à la vérif).
   * Si le numéro saisi = numéro cabinet (ex. 123456) mais l’ADMIN en base a encore un autre téléphone,
   * on utilise quand même le premier ADMIN + OTP sur la clé cabinet.
   */
  private async resolveProOtp(
    phone: string,
  ): Promise<{ admin: User; otpPhone: string }> {
    const variants = this.phoneVariants(phone);
    const inputDigits = phone.replace(/\D/g, '');
    const cabinetDigits = this.cabinetAccessDigits();

    const byList = await this.usersService.findAdminByPhoneInList(variants);
    if (byList?.phone) {
      return { admin: byList, otpPhone: byList.phone };
    }

    if (cabinetDigits && inputDigits === cabinetDigits) {
      const admin = await this.usersService.findFirstAdmin();
      if (!admin) {
        throw new UnauthorizedException(
          'Aucun compte praticien en base. Dans le dossier reservation-system : node scripts/fix-and-seed.js',
        );
      }
      return { admin, otpPhone: cabinetDigits };
    }

    throw new UnauthorizedException(
      'Ce numéro ne correspond à aucun praticien. Vérifiez le numéro enregistré dans Mon cabinet, ou utilisez le numéro d’accès cabinet (ex. 123456).',
    );
  }

  async proSendOtp(phone: string): Promise<{ message: string; otp?: string }> {
    const { otpPhone } = await this.resolveProOtp(phone);
    const code = await this.otpService.sendOtp(otpPhone);
    return { message: 'OTP sent', otp: code };
  }

  async proVerifyOtp(
    phone: string,
    code: string,
  ): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const { admin, otpPhone } = await this.resolveProOtp(phone);
    const valid = await this.otpService.verifyOtp(otpPhone, code);
    if (!valid) {
      throw new BadRequestException('Code invalide ou expiré');
    }
    const token = this.generateToken(admin);
    const { password: _, ...safe } = admin;
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
