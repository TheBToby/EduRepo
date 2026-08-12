import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

const ROLE_RANK: Record<string, number> = { USER: 1, MODERATOR: 2, ADMIN: 3 };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;
    const userRank = ROLE_RANK[user.role] ?? 0;
    // Nutzer erfüllt Anforderung, wenn seine Rolle mindestens so hoch ist
    // wie die minimal geforderte Rolle.
    const minRequired = Math.min(...required.map((r) => ROLE_RANK[r] ?? 99));
    return userRank >= minRequired;
  }
}