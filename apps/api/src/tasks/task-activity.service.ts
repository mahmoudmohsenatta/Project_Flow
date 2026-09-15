import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaskActivityType, type TaskActivitySummary } from '@projectflow/shared';
import { TaskActivity, type TaskActivityDocument } from './schemas/task-activity.schema';
import { UsersService } from '../users/users.service';
import { toUserSummary } from '../common/utils/serialize';

@Injectable()
export class TaskActivityService {
  constructor(
    @InjectModel(TaskActivity.name) private readonly taskActivityModel: Model<TaskActivityDocument>,
    private readonly usersService: UsersService,
  ) {}

  async recordActivity(
    taskId: Types.ObjectId,
    actorId: Types.ObjectId,
    type: TaskActivityType,
    from?: string | null,
    to?: string | null,
  ): Promise<void> {
    await this.taskActivityModel.create({
      taskId,
      actorId,
      type,
      from,
      to,
    });
  }

  async getActivitiesForTask(taskId: Types.ObjectId): Promise<TaskActivitySummary[]> {
    const activities = await this.taskActivityModel
      .find({ taskId })
      .sort({ createdAt: -1 })
      .exec();

    if (activities.length === 0) {
      return [];
    }

    const actorIds = Array.from(new Set(activities.map((a) => a.actorId.toString()))).map(
      (id) => new Types.ObjectId(id),
    );
    const users = await this.usersService.findManyByIds(actorIds);
    const usersById = new Map(users.map((u) => [u._id.toString(), u]));

    const DELETED_USER = {
      id: '',
      name: 'Unknown user',
      email: '',
      avatarUrl: null,
    };

    return activities.map((activity) => {
      const user = usersById.get(activity.actorId.toString());
      return {
        id: activity._id.toString(),
        taskId: activity.taskId.toString(),
        type: activity.type,
        actor: user ? toUserSummary(user) : DELETED_USER,
        from: activity.from,
        to: activity.to,
        createdAt: activity.createdAt.toISOString(),
      };
    });
  }
}
