import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/types/token-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const payload = (request as Request & { user?: TokenPayload }).user;

    // 🔒 Rolsiz payload — optom mijoz tokeni (B-017). Mijozda xodim roli
    // yo'q, shuning uchun rol talab qiladigan endpoint unga YOPIQ.
    if (!payload?.role) return false;

    return requiredRoles.includes(payload.role);
  }
}
