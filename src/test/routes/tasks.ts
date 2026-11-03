import request from 'supertest';

import { ApiError, Task, tasksApi } from '../../main/api/tasks-client';
import { app } from '../../main/app';

jest.mock('../../main/api/tasks-client', () => {
  const actual = jest.requireActual('../../main/api/tasks-client');
  return {
    ...actual,
    tasksApi: {
      list: jest.fn(),
      get: jest.fn(),
      history: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    },
  };
});

const api = jest.mocked(tasksApi);

const task: Task = {
  id: '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90',
  title: 'Review case bundle',
  description: '',
  status: 'TODO',
  dueAt: '2027-01-15T14:30:00.000Z',
  createdAt: '2026-11-03T09:00:00.000Z',
  updatedAt: '2026-11-03T09:00:00.000Z',
  isOverdue: false,
};

const validForm = {
  title: 'Review case bundle',
  description: '',
  status: 'TODO',
  'dueAt-day': '15',
  'dueAt-month': '1',
  'dueAt-year': '2027',
  'dueAt-hour': '14',
  'dueAt-minute': '30',
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /', () => {
  it('lists tasks with their status and due date', async () => {
    api.list.mockResolvedValue([{ ...task, isOverdue: true }]);

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Review case bundle');
    expect(res.text).toContain('To do');
    expect(res.text).toContain('Overdue');
    expect(res.text).toContain('15 January 2027 at 14:30');
  });

  it('passes sort, order and status filters to the API', async () => {
    api.list.mockResolvedValue([]);

    await request(app).get('/?sort=status&order=desc&status=DONE');

    expect(api.list).toHaveBeenCalledWith({ sort: 'status', order: 'desc', status: 'DONE' });
  });

  it('shows a message when there are no tasks', async () => {
    api.list.mockResolvedValue([]);

    const res = await request(app).get('/');

    expect(res.text).toContain('There are no tasks to show.');
  });

  it('shows a success banner after an action', async () => {
    api.list.mockResolvedValue([]);

    const res = await request(app).get('/?success=deleted');

    expect(res.text).toContain('Task deleted');
  });

  it('redirects to the default list when the filters are invalid', async () => {
    api.list.mockRejectedValue(new ApiError(422, 'VALIDATION_ERROR'));

    const res = await request(app).get('/?sort=title');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('shows the service error page when the API is down', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    api.list.mockRejectedValue(new ApiError(503, 'SERVICE_UNAVAILABLE'));

    const res = await request(app).get('/');

    expect(res.status).toBe(500);
    expect(res.text).toContain('Sorry, there is a problem with the service');
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});

describe('POST /tasks', () => {
  it('creates the task in UTC and redirects to it with a success message', async () => {
    api.create.mockResolvedValue(task);

    const res = await request(app).post('/tasks').type('form').send(validForm);

    expect(api.create).toHaveBeenCalledWith({
      title: 'Review case bundle',
      description: '',
      status: 'TODO',
      dueAt: '2027-01-15T14:30:00.000Z',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/tasks/${task.id}?success=created`);
  });

  it('shows GOV.UK error messages from the API and keeps what was entered', async () => {
    api.create.mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', [{ field: 'title', code: 'REQUIRED', message: '' }])
    );

    const res = await request(app)
      .post('/tasks')
      .type('form')
      .send({ ...validForm, title: '', description: 'Keep this' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('There is a problem');
    expect(res.text).toContain('Enter a title');
    expect(res.text).toContain('Keep this');
  });

  it('checks the date locally and does not send an invalid one to the API', async () => {
    api.create.mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', [{ field: 'dueAt', code: 'REQUIRED', message: '' }])
    );

    const res = await request(app)
      .post('/tasks')
      .type('form')
      .send({ ...validForm, 'dueAt-day': '31', 'dueAt-month': '2' });

    expect(api.create.mock.calls[0][0].dueAt).toBeUndefined();
    expect(res.text).toContain('Due date and time must be real');
    expect(res.text).not.toContain('Enter a due date and time');
  });
});

describe('GET /tasks/:id', () => {
  it('shows the task, a status form and its history', async () => {
    api.get.mockResolvedValue(task);
    api.history.mockResolvedValue([{ fromStatus: null, toStatus: 'TODO', changedAt: task.createdAt }]);

    const res = await request(app).get(`/tasks/${task.id}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Review case bundle');
    expect(res.text).toContain('No description');
    expect(res.text).toContain('Update status');
    expect(res.text).toContain('Status history');
    expect(res.text).toContain('Created');
  });

  it('shows the not found page for a task that does not exist', async () => {
    api.get.mockRejectedValue(new ApiError(404, 'NOT_FOUND'));
    api.history.mockRejectedValue(new ApiError(404, 'NOT_FOUND'));

    const res = await request(app).get('/tasks/missing');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Page not found');
  });
});

describe('POST /tasks/:id/status', () => {
  it('updates the status and redirects with a success message', async () => {
    api.updateStatus.mockResolvedValue({ ...task, status: 'DONE' });

    const res = await request(app).post(`/tasks/${task.id}/status`).type('form').send({ status: 'DONE' });

    expect(api.updateStatus).toHaveBeenCalledWith(task.id, 'DONE');
    expect(res.headers.location).toBe(`/tasks/${task.id}?success=updated`);
  });

  it('shows an error when the status is not valid', async () => {
    api.updateStatus.mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', [{ field: 'status', code: 'INVALID_VALUE', message: '' }])
    );
    api.get.mockResolvedValue(task);
    api.history.mockResolvedValue([]);

    const res = await request(app).post(`/tasks/${task.id}/status`).type('form').send({ status: 'CLOSED' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Select a status from the list');
  });
});

describe('deleting a task', () => {
  it('asks for confirmation before deleting', async () => {
    api.get.mockResolvedValue(task);

    const res = await request(app).get(`/tasks/${task.id}/delete`);

    expect(res.text).toContain('Are you sure you want to delete');
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes the task and returns to the list with a success message', async () => {
    api.delete.mockResolvedValue();

    const res = await request(app).post(`/tasks/${task.id}/delete`);

    expect(api.delete).toHaveBeenCalledWith(task.id);
    expect(res.headers.location).toBe('/?success=deleted');
  });
});

describe('unknown pages', () => {
  it('shows the not found page', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Page not found');
  });

  it('does not reveal the framework in response headers', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
