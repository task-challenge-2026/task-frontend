import { toFormErrors } from '../../main/utils/messages';

describe('toFormErrors', () => {
  it('maps API error codes to GOV.UK error messages linked to each field', () => {
    expect(
      toFormErrors([
        { field: 'title', code: 'REQUIRED', message: 'Field is required' },
        { field: 'dueAt', code: 'DATE_IN_PAST', message: 'Must be a future date and time' },
      ])
    ).toEqual([
      { field: 'title', text: 'Enter a title', href: '#title' },
      { field: 'dueAt', text: 'Due date and time must be in the future', href: '#dueAt-day' },
    ]);
  });

  it('returns undefined for a code the frontend does not expect', () => {
    expect(toFormErrors([{ field: 'priority', code: 'UNKNOWN_FIELD', message: '' }])).toBeUndefined();
  });
});
