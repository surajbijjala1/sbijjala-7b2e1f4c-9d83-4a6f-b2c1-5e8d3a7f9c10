import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Organization } from './entities/organization.entity.js';
import { User } from './entities/user.entity.js';
import { Task } from './entities/task.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db/taskmanager.db',
      entities: [Organization, User, Task],
      synchronize: true, // Auto-sync schema in development only
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
