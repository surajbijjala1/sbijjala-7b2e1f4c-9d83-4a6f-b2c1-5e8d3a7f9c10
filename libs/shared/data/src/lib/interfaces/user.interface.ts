import { Role } from '../role.enum.js';

export interface IUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
}

export interface ICreateUser {
  email: string;
  password: string;
  role: Role;
  organizationId: string;
}
