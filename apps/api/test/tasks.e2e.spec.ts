import type { INestApplication } from '@nestjs/common';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { OrganizationRole, ProjectRole, TaskPriority, TaskStatus } from '@projectflow/shared';
import { createTestApp, resetDatabase } from './utils/test-app';
import {
  addOrganizationMember,
  addProjectMember,
  authHeader,
  createOrganization,
  createProject,
  registerUser,
  type TestUser,
} from './utils/fixtures';

describe('Tasks', () => {
  let app: INestApplication;
  let connection: Connection;

  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let projectId: string;

  beforeAll(async () => {
    ({ app, connection } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(connection);

    owner = await registerUser(app, 'Ammar Yaser', 'ammar@example.com');
    member = await registerUser(app, 'Magd Ali', 'magd@example.com');
    outsider = await registerUser(app, 'Outside User', 'outside@example.com');

    const organizationId = await createOrganization(
      connection,
      'Acme Software',
      'acme-software',
      owner.id,
    );
    await addOrganizationMember(connection, organizationId, owner.id, OrganizationRole.OWNER);
    await addOrganizationMember(connection, organizationId, member.id, OrganizationRole.MEMBER);

    projectId = await createProject(
      connection,
      organizationId,
      'Internal Platform',
      'ENG',
      owner.id,
    );
    await addProjectMember(connection, projectId, member.id, ProjectRole.MEMBER);
  });

  it('lets a project member create a task', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({
        title: 'Improve API error handling',
        description: 'Normalise validation and permission errors.',
        priority: TaskPriority.HIGH,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      key: 'ENG-1',
      number: 1,
      title: 'Improve API error handling',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
    });
    expect(response.body.createdBy).toMatchObject({ email: 'magd@example.com' });
  });

  it('numbers tasks sequentially within a project', async () => {
    for (const title of ['First task', 'Second task', 'Third task']) {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', authHeader(member))
        .send({ title })
        .expect(201);
    }

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.items.map((task: { key: string }) => task.key)).toEqual([
      'ENG-1',
      'ENG-2',
      'ENG-3',
    ]);
  });

  it('refuses to create a task for someone outside the project', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(outsider))
      .send({ title: 'Should not be created' })
      .expect(403);
  });

  it('refuses to list tasks for someone outside the project', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(outsider))
      .expect(403);
  });

  it('rejects a task without a usable title', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'ab' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('filters the task list by status', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Work in flight', status: TaskStatus.IN_PROGRESS })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Not started yet' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .query({ status: TaskStatus.IN_PROGRESS })
      .set('Authorization', authHeader(member))
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({ title: 'Work in flight' });
  });

  it('assigns a task to a project member and records activity', async () => {
    // Create a task
    const createRes = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Task to be assigned' })
      .expect(201);

    const taskId = createRes.body.id;

    // Assign the task to the owner
    const patchRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', authHeader(member))
      .send({ assigneeId: owner.id })
      .expect(200);

    expect(patchRes.body.assignee.id).toBe(owner.id);

    // Fetch task activity
    const activityRes = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/activity`)
      .set('Authorization', authHeader(member))
      .expect(200);

    expect(activityRes.body).toHaveLength(1);
    expect(activityRes.body[0]).toMatchObject({
      type: 'ASSIGNEE_CHANGED',
      to: owner.id,
      actor: { id: member.id }
    });
  });

  it('refuses to assign a task to a non-project member', async () => {
    // Create a task
    const createRes = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Task for assignment fail' })
      .expect(201);

    const taskId = createRes.body.id;

    // Attempt to assign to outsider
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', authHeader(member))
      .send({ assigneeId: outsider.id })
      .expect(403);
  });

  it('prevents non-admin non-creator from updating task status', async () => {
    // Owner creates a task
    const createRes = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(owner))
      .send({ title: 'Task by owner' })
      .expect(201);

    const taskId = createRes.body.id;

    // Member tries to update status (member is not creator, and not admin)
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', authHeader(member))
      .send({ status: TaskStatus.IN_PROGRESS })
      .expect(403);
  });
});
