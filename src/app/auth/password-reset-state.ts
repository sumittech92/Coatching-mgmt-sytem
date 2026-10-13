import { Injectable } from '@angular/core';

interface ResetState { phone: string; phoneNumber: string; resetToken?: string; verifiedToken?: string; }
const KEY = 'password-reset';

/** Carries the backend's short-lived reset tokens across forgot-password → OTP → reset-password, surviving a refresh. */
@Injectable({ providedIn: 'root' })
export class PasswordResetState {
  private memory: ResetState | null = null;

  get value(): ResetState | null {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return this.memory; }
  }

  set(state: ResetState): void {
    this.memory = state;
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* memory copy is enough */ }
  }

  clear(): void {
    this.memory = null;
    try { sessionStorage.removeItem(KEY); } catch { /* nothing stored */ }
  }
}
