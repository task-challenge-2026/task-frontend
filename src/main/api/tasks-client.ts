import axios from 'axios';

export const STATUSES = ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE'] as const;
export type Status = (typeof STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface StatusChange {
  fromStatus: Status | null;
  toStatus: Status | null;
  changedAt: string;
}

export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  dueAt?: string;
}

export interface ListQuery {
  sort?: string;
  order?: string;
  status?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details: ApiFieldError[] = []
  ) {
    super(`API error ${status} ${code}`);
    this.name = 'ApiError';
  }
}

const client = axios.create({
  baseURL: `${process.env.API_URL ?? 'http://localhost:4000'}/api/v1`,
  timeout: 5000,
});

async function call<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await request();
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const body = err.response.data?.error;
      throw new ApiError(err.response.status, body?.code ?? 'INTERNAL_ERROR', body?.details ?? []);
    }
    throw new ApiError(503, 'SERVICE_UNAVAILABLE');
  }
}

export const tasksApi = {
  list: async (query: ListQuery): Promise<Task[]> =>
    (await call(() => client.get<{ tasks: Task[] }>('/tasks', { params: query }))).tasks,

  get: (id: string): Promise<Task> => call(() => client.get<Task>(`/tasks/${encodeURIComponent(id)}`)),

  history: async (id: string): Promise<StatusChange[]> =>
    (await call(() => client.get<{ history: StatusChange[] }>(`/tasks/${encodeURIComponent(id)}/history`))).history,

  create: (input: CreateTaskInput): Promise<Task> => call(() => client.post<Task>('/tasks', input)),

  updateStatus: (id: string, status: string): Promise<Task> =>
    call(() => client.patch<Task>(`/tasks/${encodeURIComponent(id)}/status`, { status })),

  delete: async (id: string): Promise<void> => {
    await call(() => client.delete(`/tasks/${encodeURIComponent(id)}`));
  },
};
