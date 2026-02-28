import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TaskService } from './task.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '@turbomonorepo/shared-auth';
import { Role } from '@turbomonorepo/shared-data';
import type { ICreateTask, IUpdateTask } from '@turbomonorepo/shared-data';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() dto: ICreateTask, @Request() req: { user: JwtPayload }) {
    return this.taskService.createTask(dto, req.user);
  }

  @Get()
  findAll(@Request() req: { user: JwtPayload }) {
    return this.taskService.getTasks(req.user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: IUpdateTask,
    @Request() req: { user: JwtPayload },
  ) {
    return this.taskService.updateTask(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.Owner, Role.Admin)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.taskService.deleteTask(id, req.user);
  }
}
