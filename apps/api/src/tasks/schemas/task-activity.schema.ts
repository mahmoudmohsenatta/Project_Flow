import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import { TaskActivityType } from '@projectflow/shared';

export type TaskActivityDocument = HydratedDocument<TaskActivity>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'task_activities' })
export class TaskActivity {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(TaskActivityType), required: true })
  type: TaskActivityType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, default: null })
  from?: string | null;

  @Prop({ type: String, default: null })
  to?: string | null;

  createdAt: Date;
}

export const TaskActivitySchema = SchemaFactory.createForClass(TaskActivity);

TaskActivitySchema.index({ taskId: 1, createdAt: -1 });
