import { Application, Request, Response } from 'express';

import { ApiError, ApiFieldError, STATUSES, Task, tasksApi } from '../api/tasks-client';
import { formatDateTime, parseDueDate } from '../utils/dates';
import { FormError, STATUS_LABELS, STATUS_TAG_CLASSES, SUCCESS_MESSAGES, toFormErrors } from '../utils/messages';

const SORT_OPTIONS = [
  { value: 'dueAt', text: 'Due date' },
  { value: 'status', text: 'Status' },
  { value: 'createdAt', text: 'Date created' },
];

const ORDER_OPTIONS = [
  { value: 'asc', text: 'Ascending' },
  { value: 'desc', text: 'Descending' },
];

const statusOptions = (selected?: string) =>
  STATUSES.map(value => ({ value, text: STATUS_LABELS[value], checked: value === selected }));

function toView(task: Task) {
  return {
    ...task,
    statusLabel: STATUS_LABELS[task.status],
    statusClass: STATUS_TAG_CLASSES[task.status],
    dueAtText: formatDateTime(task.dueAt),
    createdAtText: formatDateTime(task.createdAt),
    updatedAtText: formatDateTime(task.updatedAt),
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function banner(req: Request): string | undefined {
  return SUCCESS_MESSAGES[text(req.query.success)];
}

function validationErrors(err: unknown): FormError[] {
  if (err instanceof ApiError && err.status === 422) {
    const errors = toFormErrors(err.details);
    if (errors) {
      return errors;
    }
  }
  throw err;
}

async function renderTask(res: Response, id: string, extra: Record<string, unknown> = {}): Promise<void> {
  const [task, history] = await Promise.all([tasksApi.get(id), tasksApi.history(id)]);
  res.render('tasks/view', {
    task: toView(task),
    statusOptions: statusOptions(task.status),
    history: history.map(change => ({
      from: change.fromStatus ? STATUS_LABELS[change.fromStatus] : 'Created',
      to: change.toStatus ? STATUS_LABELS[change.toStatus] : 'Deleted',
      changedAtText: formatDateTime(change.changedAt),
    })),
    ...extra,
  });
}

export default function (app: Application): void {
  app.get('/', async (req, res) => {
    const query = {
      sort: text(req.query.sort) || undefined,
      order: text(req.query.order) || undefined,
      status: text(req.query.status) || undefined,
    };

    let tasks: Task[];
    try {
      tasks = await tasksApi.list(query);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        return res.redirect('/');
      }
      throw err;
    }

    res.render('tasks/list', {
      tasks: tasks.map(toView),
      query,
      sortOptions: SORT_OPTIONS.map(o => ({ ...o, selected: o.value === (query.sort ?? 'dueAt') })),
      orderOptions: ORDER_OPTIONS.map(o => ({ ...o, selected: o.value === (query.order ?? 'asc') })),
      statusFilterOptions: [
        { value: '', text: 'All statuses' },
        ...STATUSES.map(value => ({ value, text: STATUS_LABELS[value], selected: value === query.status })),
      ],
      banner: banner(req),
    });
  });

  app.get('/tasks/new', (req, res) => {
    res.render('tasks/new', { values: {}, statusOptions: statusOptions() });
  });

  app.post('/tasks', async (req, res) => {
    const values = {
      title: text(req.body.title),
      description: text(req.body.description),
      status: text(req.body.status),
      day: text(req.body['dueAt-day']),
      month: text(req.body['dueAt-month']),
      year: text(req.body['dueAt-year']),
      hour: text(req.body['dueAt-hour']),
      minute: text(req.body['dueAt-minute']),
    };
    const dueAt = parseDueDate(values);

    let errors: FormError[];
    try {
      const task = await tasksApi.create({
        title: values.title,
        description: values.description,
        status: values.status || undefined,
        dueAt: dueAt.ok ? dueAt.iso : undefined,
      });
      return res.redirect(`/tasks/${task.id}?success=created`);
    } catch (err) {
      errors = validationErrors(err);
    }

    if (!dueAt.ok) {
      const localError: ApiFieldError = { field: 'dueAt', code: dueAt.code, message: '' };
      errors = [...errors.filter(e => e.field !== 'dueAt'), ...(toFormErrors([localError]) ?? [])];
    }

    res.status(422).render('tasks/new', {
      values,
      statusOptions: statusOptions(values.status),
      errors,
      errorFor: Object.fromEntries(errors.map(e => [e.field, { text: e.text }])),
    });
  });

  app.get('/tasks/:id', async (req, res) => {
    await renderTask(res, req.params.id, { banner: banner(req) });
  });

  app.post('/tasks/:id/status', async (req, res) => {
    const { id } = req.params;
    try {
      await tasksApi.updateStatus(id, text(req.body.status));
      return res.redirect(`/tasks/${id}?success=updated`);
    } catch (err) {
      const errors = validationErrors(err);
      res.status(422);
      await renderTask(res, id, {
        errors,
        errorFor: Object.fromEntries(errors.map(e => [e.field, { text: e.text }])),
      });
    }
  });

  app.get('/tasks/:id/delete', async (req, res) => {
    const task = await tasksApi.get(req.params.id);
    res.render('tasks/delete', { task: toView(task) });
  });

  app.post('/tasks/:id/delete', async (req, res) => {
    await tasksApi.delete(req.params.id);
    res.redirect('/?success=deleted');
  });
}
