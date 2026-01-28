export function getStartDate(date: string | Date, isUtc = true): Date {
  if (typeof date === 'string' && (date.includes('T') || date.includes(':'))) {
    return new Date(date);
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return d;

  if (isUtc) {
    d.setUTCHours(0, 0, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

export function getEndDate(date: string | Date, isUtc = true): Date {
  if (typeof date === 'string' && (date.includes('T') || date.includes(':'))) {
    return new Date(date);
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return d;

  if (isUtc) {
    d.setUTCHours(23, 59, 59, 999);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}
