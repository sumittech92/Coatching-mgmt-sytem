import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Shared patterns so every form in every panel accepts and rejects the same input. */
export const PATTERNS = {
  /** Indian mobile, no country code: 10 digits starting 6–9. Spaces are ignored. */
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i,
  /** Letters, spaces and . ' - (e.g. "Dr. Neha D'Souza"). */
  name: /^[\p{L}][\p{L} .'-]*$/u,
  pincode: /^[1-9]\d{5}$/,
  otp: /^\d{4}$/
};

const digitsOnly = (value: unknown): string => String(value ?? '').replace(/[\s-]/g, '');
const isEmpty = (value: unknown): boolean => value === null || value === undefined || String(value).trim() === '';

export class AppValidators {
  /** Required that also rejects whitespace-only input. */
  static required: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    Array.isArray(control.value) ? Validators.required(control) : isEmpty(control.value) ? { required: true } : null;

  static mobile: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || PATTERNS.mobile.test(digitsOnly(control.value)) ? null : { mobile: true };

  static email: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || PATTERNS.email.test(String(control.value).trim()) ? null : { email: true };

  static personName: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || PATTERNS.name.test(String(control.value).trim()) ? null : { personName: true };

  static pincode: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || PATTERNS.pincode.test(digitsOnly(control.value)) ? null : { pincode: true };

  static password: ValidatorFn = Validators.minLength(8);

  /** Accepts an email address or a 10-digit mobile number (sign-in identifier). */
  static emailOrMobile: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (isEmpty(control.value)) return null;
    const value = String(control.value).trim();
    return PATTERNS.email.test(value) || PATTERNS.mobile.test(digitsOnly(value)) ? null : { emailOrMobile: true };
  };

  static positive: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || Number(control.value) > 0 ? null : { positive: true };

  static nonNegative: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || Number(control.value) >= 0 ? null : { nonNegative: true };

  static url: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
    isEmpty(control.value) || /^(https?:\/\/|\/)\S+$/i.test(String(control.value).trim()) ? null : { url: true };
}

export const isMobile = (value: string): boolean => PATTERNS.mobile.test(digitsOnly(value));
export const normalizeMobile = (value: string): string => digitsOnly(value);

/** One message per control, in priority order. Use in <mat-error>{{ errorFor(control, 'Label') }}</mat-error>. */
export function validationMessage(control: AbstractControl | null | undefined, label: string): string {
  const errors = control?.errors;
  if (!errors) return '';
  if (errors['required']) return `${label} is required.`;
  if (errors['mobile']) return 'Enter a valid 10-digit mobile number.';
  if (errors['email']) return 'Enter a valid email address.';
  if (errors['emailOrMobile']) return 'Enter a valid email address or 10-digit mobile number.';
  if (errors['personName']) return `${label} can only contain letters, spaces, dots and hyphens.`;
  if (errors['pincode']) return 'Enter a valid 6-digit pincode.';
  if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
  if (errors['maxlength']) return `${label} must be at most ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min}.`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max}.`;
  if (errors['positive']) return `${label} must be greater than 0.`;
  if (errors['nonNegative']) return `${label} cannot be negative.`;
  if (errors['url']) return 'Enter a valid link starting with https:// or /.';
  if (errors['pattern']) return `Enter a valid ${label.toLowerCase()}.`;
  return `Check ${label.toLowerCase()}.`;
}
