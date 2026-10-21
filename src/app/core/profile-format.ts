/** Display helpers for registered account details on the profile pages. */
export function formatPhone(countryCode: string | null | undefined, phoneNumber: string | null | undefined): string {
  return phoneNumber ? `${countryCode ? countryCode + ' ' : ''}${phoneNumber}` : '—';
}

export function formatDate(value: string | number | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
