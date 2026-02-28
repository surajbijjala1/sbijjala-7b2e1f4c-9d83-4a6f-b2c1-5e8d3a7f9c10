import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Role } from '@turbomonorepo/shared-data';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let mockUserRepo: {
    findOne: jest.Mock;
  };

  const testSecret = 'test-jwt-secret';

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: testSecret,
            signOptions: { expiresIn: '1h' },
          }),
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return an access_token for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      const mockUser: Partial<User> = {
        id: 'user-uuid-1',
        email: 'admin@acme.com',
        password: hashedPassword,
        role: Role.Admin,
        organizationId: 'org-uuid-1',
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await authService.login('admin@acme.com', 'correct-password');

      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');

      // Verify the token payload
      const decoded = jwtService.verify(result.access_token, { secret: testSecret });
      expect(decoded.sub).toBe('user-uuid-1');
      expect(decoded.role).toBe(Role.Admin);
      expect(decoded.organizationId).toBe('org-uuid-1');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        authService.login('nobody@acme.com', 'any-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      const mockUser: Partial<User> = {
        id: 'user-uuid-1',
        email: 'admin@acme.com',
        password: hashedPassword,
        role: Role.Admin,
        organizationId: 'org-uuid-1',
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.login('admin@acme.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should query the user repo with the correct email', async () => {
      const hashedPassword = await bcrypt.hash('pass', 10);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'test@acme.com',
        password: hashedPassword,
        role: Role.Viewer,
        organizationId: 'o1',
      });

      await authService.login('test@acme.com', 'pass');

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@acme.com' },
      });
    });

    it('should include sub, role, and organizationId in the JWT payload', async () => {
      const hashedPassword = await bcrypt.hash('pass', 10);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'owner-id',
        email: 'owner@acme.com',
        password: hashedPassword,
        role: Role.Owner,
        organizationId: 'org-root',
      });

      const result = await authService.login('owner@acme.com', 'pass');
      const decoded = jwtService.verify(result.access_token, { secret: testSecret });

      expect(decoded).toMatchObject({
        sub: 'owner-id',
        role: Role.Owner,
        organizationId: 'org-root',
      });
      // JWT should have standard claims
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('hashPassword', () => {
    it('should return a bcrypt hash that validates against the original', async () => {
      const plain = 'my-secure-password';
      const hashed = await authService.hashPassword(plain);

      expect(hashed).not.toBe(plain);
      expect(await bcrypt.compare(plain, hashed)).toBe(true);
    });

    it('should produce different hashes for the same input (unique salt)', async () => {
      const plain = 'same-password';
      const hash1 = await authService.hashPassword(plain);
      const hash2 = await authService.hashPassword(plain);

      expect(hash1).not.toBe(hash2);
    });
  });
});
