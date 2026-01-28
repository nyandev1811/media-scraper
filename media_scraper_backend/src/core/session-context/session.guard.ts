import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.headers['x-session-id'];

    if (!sessionId) {
      throw new BadRequestException('Missing x-session-id header');
    }

    request['sessionId'] = sessionId.toString();

    return true;
  }
}
