import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@turbomonorepo/shared-data';

export interface JwtPayload {
  sub: string;       // user id
  role: Role;
  organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'dev-secret-change-in-production',
    });
  }

  /**
   * Called by Passport after the JWT is verified.
   * The returned object is attached to request.user.
   */
  validate(payload: JwtPayload): JwtPayload {
    return {
      sub: payload.sub,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
