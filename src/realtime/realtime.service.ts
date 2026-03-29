import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyNewReservation(
    professionalId: string,
    data: { id: string; status: string; slotStart: Date; slotEnd: Date },
  ) {
    this.gateway.emitToProfessional(professionalId, 'reservation:new', data);
  }

  notifyProfessionalRefresh(professionalId: string, data: unknown) {
    this.gateway.emitToProfessional(professionalId, 'reservation:changed', data);
  }

  notifyClientReservation(
    clientId: string,
    data: {
      id: string;
      status: string;
      slotStart?: Date;
      slotEnd?: Date;
      proposedSlotStart?: Date;
      proposedSlotEnd?: Date;
    },
  ) {
    this.gateway.emitToClient(clientId, 'reservation:updated', data);
  }
}
