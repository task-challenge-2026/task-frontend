import { formatDateTime, londonToUtcIso, parseDueDate } from '../../main/utils/dates';

describe('londonToUtcIso', () => {
  it('converts UK winter time (GMT) to the same UTC time', () => {
    expect(londonToUtcIso(2027, 1, 15, 9, 0)).toBe('2027-01-15T09:00:00.000Z');
  });

  it('converts UK summer time (BST) to one hour earlier in UTC', () => {
    expect(londonToUtcIso(2027, 7, 15, 9, 0)).toBe('2027-07-15T08:00:00.000Z');
  });

  it('handles the day the clocks go forward', () => {
    expect(londonToUtcIso(2027, 3, 28, 12, 0)).toBe('2027-03-28T11:00:00.000Z');
  });
});

describe('parseDueDate', () => {
  const valid = { day: '15', month: '1', year: '2027', hour: '14', minute: '30' };

  it('returns a UTC ISO string for a valid date and time', () => {
    expect(parseDueDate(valid)).toEqual({ ok: true, iso: '2027-01-15T14:30:00.000Z' });
  });

  it('returns REQUIRED when every part is empty', () => {
    expect(parseDueDate({})).toEqual({ ok: false, code: 'REQUIRED' });
  });

  it.each([
    ['a missing part', { ...valid, minute: '' }],
    ['letters', { ...valid, day: 'ab' }],
    ['a date that does not exist', { ...valid, day: '31', month: '2' }],
    ['a month over 12', { ...valid, month: '13' }],
    ['an hour over 23', { ...valid, hour: '24' }],
    ['a minute over 59', { ...valid, minute: '60' }],
    ['a two-digit year', { ...valid, year: '27' }],
  ])('returns INVALID_FORMAT for %s', (_name, parts) => {
    expect(parseDueDate(parts)).toEqual({ ok: false, code: 'INVALID_FORMAT' });
  });
});

describe('formatDateTime', () => {
  it('shows the time in UK time', () => {
    expect(formatDateTime('2027-07-15T08:00:00.000Z')).toBe('15 July 2027 at 09:00');
  });
});
