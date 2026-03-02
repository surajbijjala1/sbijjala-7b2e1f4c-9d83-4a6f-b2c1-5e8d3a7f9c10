import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController, LoginDto } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: { login: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('should return an access_token for valid credentials', async () => {
      const expectedResponse = { access_token: 'jwt-token-abc' };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      const dto: LoginDto = { email: 'admin@acme.com', password: 'pass123' };
      const result = await controller.login(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith('admin@acme.com', 'pass123');
    });

    it('should propagate UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      const dto: LoginDto = { email: 'bad@acme.com', password: 'wrong' };

      await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should pass dto.email and dto.password to AuthService.login', async () => {
      mockAuthService.login.mockResolvedValue({ access_token: 'token' });

      const dto: LoginDto = { email: 'owner@acme.com', password: 'secret' };
      await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
      expect(mockAuthService.login).toHaveBeenCalledWith('owner@acme.com', 'secret');
    });
  });
});
