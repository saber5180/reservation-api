import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ProfessionalsService } from '../professionals/professionals.service';
import { UserRole } from '../users/entities/user.entity';

interface JwtPayload {
  sub: string;
  role: string;
}

/** CORS Socket.IO : en prod, définir FRONTEND_URL (ex. https://xxx.vercel.app). Plusieurs origines : virgule. */
function socketCorsOrigin(): boolean | string[] {
  const raw = process.env.FRONTEND_URL?.trim();
  if (!raw) return true;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : true;
}

@WebSocketGateway({
  cors: { origin: socketCorsOrigin(), credentials: true },
  transports: ['polling', 'websocket'],
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace(
          /^Bearer\s+/i,
          '',
        );
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const userId = payload.sub;
      const role = payload.role;

      if (role === UserRole.ADMIN) {
        const prof = await this.professionalsService.findByUserId(userId);
        if (prof) {
          await client.join(`prof:${prof.id}`);
          this.logger.debug(`Admin joined prof:${prof.id}`);
        }
      } else if (role === UserRole.CLIENT) {
        await client.join(`client:${userId}`);
        this.logger.debug(`Client joined client:${userId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  emitToProfessional(professionalId: string, event: string, data: unknown) {
    this.server.to(`prof:${professionalId}`).emit(event, data);
  }

  emitToClient(clientId: string, event: string, data: unknown) {
    this.server.to(`client:${clientId}`).emit(event, data);
  }
}
