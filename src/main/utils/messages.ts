import { ApiFieldError, Status } from '../api/tasks-client';

export const STATUS_LABELS: Record<Status, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  DONE: 'Done',
};

export const STATUS_TAG_CLASSES: Record<Status, string> = {
  TODO: 'govuk-tag--grey',
  IN_PROGRESS: 'govuk-tag--blue',
  ON_HOLD: 'govuk-tag--yellow',
  DONE: 'govuk-tag--green',
};

const FIELD_MESSAGES: Record<string, Record<string, string>> = {
  title: {
    REQUIRED: 'Enter a title',
    TOO_LONG: 'Title must be 200 characters or fewer',
  },
  description: {
    TOO_LONG: 'Description must be 2000 characters or fewer',
  },
  status: {
    REQUIRED: 'Select a status',
    INVALID_VALUE: 'Select a status from the list',
  },
  dueAt: {
    REQUIRED: 'Enter a due date and time',
    INVALID_FORMAT: 'Due date and time must be real, for example 27 3 2027 and 14 30',
    DATE_IN_PAST: 'Due date and time must be in the future',
  },
};

const FIELD_ANCHORS: Record<string, string> = {
  title: '#title',
  description: '#description',
  status: '#status',
  dueAt: '#dueAt-day',
};

export interface FormError {
  field: string;
  text: string;
  href: string;
}

export function toFormErrors(details: ApiFieldError[]): FormError[] | undefined {
  const errors: FormError[] = [];
  for (const { field, code } of details) {
    const text = FIELD_MESSAGES[field]?.[code];
    if (!text) {
      return undefined;
    }
    errors.push({ field, text, href: FIELD_ANCHORS[field] });
  }
  return errors;
}

export const SUCCESS_MESSAGES: Record<string, string> = {
  created: 'Task created',
  updated: 'Task status updated',
  deleted: 'Task deleted',
};
