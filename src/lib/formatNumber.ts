const numberFormatter = new Intl.NumberFormat();

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? numberFormatter.format(value) : '-';
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? numberFormatter.format(parsed) : '-';
  }

  return '-';
}

