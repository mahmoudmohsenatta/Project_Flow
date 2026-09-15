import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { TaskActivity, TaskActivitySchema } from './schemas/task-activity.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import { TaskActivityService } from './task-activity.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: TaskActivity.name, schema: TaskActivitySchema },
    ]),
    ProjectsModule,
    UsersModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskActivityService],
  exports: [TasksService, MongooseModule],
})
export class TasksModule {}

