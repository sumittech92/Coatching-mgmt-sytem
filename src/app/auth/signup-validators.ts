import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
}

export function passwordStrength(value: string): { score: number; label: string; color: string } {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const levels = [
    { label: 'Too short', color: '#d23b5a' },
    { label: 'Weak', color: '#ff6a3d' },
    { label: 'Fair', color: '#ffb020' },
    { label: 'Good', color: '#3d63f0' },
    { label: 'Strong', color: '#14b88a' }
  ];
  return { score, ...levels[value ? score : 0] };
}
