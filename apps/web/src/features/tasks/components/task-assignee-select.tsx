'use client';

import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectMembers } from '@/features/projects/hooks';
import { useUpdateTask } from '../hooks';

interface TaskAssigneeSelectProps {
  taskId: string;
  projectId: string;
  assigneeId?: string | null;
}

export function TaskAssigneeSelect({ taskId, projectId, assigneeId }: TaskAssigneeSelectProps) {
  const { data: members, isPending } = useProjectMembers(projectId);
  const updateTask = useUpdateTask(taskId, projectId);

  const value = assigneeId ?? 'unassigned';

  return (
    <Select
      value={value}
      disabled={updateTask.isPending || isPending}
      onValueChange={(newValue) =>
        updateTask.mutate(
          { assigneeId: newValue === 'unassigned' ? null : newValue },
          { onError: (error) => toast.error(error.message) },
        )
      }
    >
      <SelectTrigger aria-label="Task assignee" className="h-9">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {members?.map((member) => (
          <SelectItem key={member.user.id} value={member.user.id}>
            <div className="flex items-center gap-2">
              <Avatar user={member.user} size="sm" />
              <span>{member.user.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
