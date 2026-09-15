# Production Bug Report

## Report
**Issue:** "Some users appear to be able to modify tasks belonging to projects they are not members of."

## Root Cause
The root cause is an **authorization bypass** in the task status update endpoint (`PATCH /tasks/:taskId/status`).

In `apps/api/src/tasks/tasks.controller.ts`, the `updateStatus` route is defined as:
```typescript
@Patch('tasks/:taskId/status')
updateStatus(
  @Param('taskId') taskId: string,
  @Body() dto: UpdateTaskStatusDto,
): Promise<TaskDetail> {
  return this.tasksService.updateStatus(toObjectId(taskId, 'task id'), dto);
}
```
Notice that it does not extract or pass the `@CurrentUser('id') userId: string` to the service method, unlike the other endpoints in this controller.

In `apps/api/src/tasks/tasks.service.ts`, the `updateStatus` method looks like this:
```typescript
async updateStatus(taskId: Types.ObjectId, dto: UpdateTaskStatusDto): Promise<TaskDetail> {
  const task = await this.findTaskOrFail(taskId);

  task.status = dto.status;
  await task.save();

  return this.toDetail(task);
}
```
It looks up the task and immediately applies the status change without any authorization checks. It never calls `this.projectAccessService.assertCanView()` or `assertCanManage()`.

## Impact
Because the endpoint lacks both input validation (for the user) and authorization checks, **any authenticated user** (anyone with a valid JWT token) can modify the status of **any task in the system**, regardless of whether they belong to the project or the organization that owns the task. They simply need to know or guess a valid Task ID.

An unauthorized user could move a critical engineering task to `DONE` or an urgent customer portal task to `TODO`, causing severe disruption and violating tenant isolation.

## Reproduction
To verify the issue:
1. Log in as an `Outside User` (or any user who does not have access to the target project).
2. Fetch an existing valid `taskId` from the database.
3. Send a `PATCH /tasks/:taskId/status` request with a valid status payload.
4. The API returns a `200 OK` and updates the status, rather than returning a `403 Forbidden` response.

## Fix
1. **Controller Update**: Modified `tasks.controller.ts` to extract `@CurrentUser('id') userId: string` and pass it to the service.
2. **Service Update**: Modified `updateStatus` in `tasks.service.ts` to include the `userId` parameter.
3. **Authorization Check**: Added the exact same authorization logic used in the general `update` method. The user must either have `canManage` permissions on the project or be the creator of the task to update its status.

```typescript
// Updated tasks.service.ts method:
async updateStatus(
  taskId: Types.ObjectId,
  userId: Types.ObjectId,
  dto: UpdateTaskStatusDto,
): Promise<TaskDetail> {
  const task = await this.findTaskOrFail(taskId);
  const access = await this.projectAccessService.assertCanView(task.projectId, userId);

  const isCreator = task.createdBy.equals(userId);
  if (!canManage(access) && !isCreator) {
    throw new ForbiddenException('You do not have permission to edit this task');
  }

  task.status = dto.status;
  await task.save();

  return this.toDetail(task, access.project);
}
```

## Regression Prevention
A new automated E2E test block has been added to `apps/api/test/tasks.e2e.spec.ts` under `Task Status Authorization` to explicitly assert that non-members receive a `403 Forbidden` response when attempting to update a task's status.
