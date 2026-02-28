import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity.js';
import type { Task } from './task.entity.js';
import { Role } from '@turbomonorepo/shared-data';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', default: Role.Viewer })
  role!: Role;

  @Column({ type: 'varchar' })
  organizationId!: string;

  @ManyToOne(() => Organization, (org) => org.users, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @OneToMany('Task', 'user')
  tasks!: Task[];
}
