'use client';

import { TaskActivityType } from '@projectflow/shared';
import type { ProjectMemberEntry } from '@projectflow/shared';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { useTaskActivity } from '../hooks';
import { useProjectMembers } from '@/features/projects/hooks';

interface TaskActivityTimelineProps {
  taskId: string;
  projectId: string;
}

export function TaskActivityTimeline({ taskId, projectId }: TaskActivityTimelineProps) {
  const { data: activities, isPending, isError } = useTaskActivity(taskId);
  const { data: members } = useProjectMembers(projectId);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-danger">Failed to load activity.</p>;
  }

  if (activities.length === 0) {
    return <p className="text-[13px] italic text-subtle-foreground">No recent activity.</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 text-[13px]">
          <Avatar user={activity.actor} size="sm" />
          <div className="flex-1 space-y-0.5">
            <p className="text-foreground">
              <span className="font-medium">{activity.actor.name}</span>{' '}
              <span className="text-muted-foreground">{formatActivityType(activity.type)}</span>{' '}
              <span className="font-medium">{formatValue(activity.type, activity.to, members)}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">{formatDate(activity.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatActivityType(type: TaskActivityType): string {
  switch (type) {
    case TaskActivityType.STATUS_CHANGED:
      return 'changed status to';
    case TaskActivityType.ASSIGNEE_CHANGED:
      return 'assigned to';
    default:
      return 'performed an action';
  }
}

function formatValue(type: TaskActivityType, value: string | null | undefined, members: ProjectMemberEntry[] | undefined): string {
  if (type === TaskActivityType.STATUS_CHANGED) {
    return (value || '').replace('_', ' ').toLowerCase();
  }
  if (type === TaskActivityType.ASSIGNEE_CHANGED) {
    if (!value) return 'unassigned';
    const member = members?.find((m) => m.user.id === value);
    return member ? member.user.name : 'Unknown User';
  }
  return value || '';
}
