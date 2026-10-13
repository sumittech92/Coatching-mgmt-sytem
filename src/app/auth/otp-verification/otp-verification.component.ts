import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { PasswordResetState } from '../password-reset-state';

// The backend issues a fixed 4-digit code until SMS sending is connected.
const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

@Component({ selector: 'app-otp-verification', templateUrl: './otp-verification.component.html' })
export class OtpVerificationComponent implements OnInit, OnDestroy {
  @ViewChild(NgOtpInputComponent) otpInput?: NgOtpInputComponent;
  readonly otpLength = OTP_LENGTH;
  readonly config = { length: OTP_LENGTH, allowNumbersOnly: true, inputClass: 'otp-box' };
  phone = '';
  otp = '';
  invalid = false;
  /** Message shown under the boxes after the server rejects the code. */
  serverError = '';
  loading = false;
  resending = false;
  secondsLeft = RESEND_SECONDS;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private router: Router, private api: AuthApiService, private resetState: PasswordResetState) {}

  ngOnInit(): void {
    const state = this.resetState.value;
    // Without a reset token from step 1 there is nothing to verify.
    if (!state?.resetToken) { this.router.navigateByUrl('/forgot-password'); return; }
    this.phone = state.phone;
    this.startTimer();
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  onOtpChange(value: string): void {
    this.otp = value;
    this.invalid = false;
    this.serverError = '';
  }

  verify(): void {
    const state = this.resetState.value;
    if (this.otp.length < this.otpLength) { this.invalid = true; this.serverError = ''; return; }
    if (!state?.resetToken) { this.router.navigateByUrl('/forgot-password'); return; }
    this.loading = true;
    this.api.verifyOtp(state.resetToken, this.otp).pipe(finalize(() => this.loading = false)).subscribe({
      next: ({ accessToken }) => {
        this.resetState.set({ ...state, verifiedToken: accessToken });
        this.router.navigateByUrl('/reset-password');
      },
      error: (error: Error) => {
        // Clearing the boxes fires onInputChange, so flag the error afterwards.
        this.otpInput?.setValue('');
        this.otp = '';
        this.invalid = true;
        this.serverError = OtpVerificationComponent.friendly(error.message);
      }
    });
  }

  resend(): void {
    const state = this.resetState.value;
    if (!state) { this.router.navigateByUrl('/forgot-password'); return; }
    this.otpInput?.setValue('');
    this.otp = '';
    this.invalid = false;
    this.serverError = '';
    this.resending = true;
    this.api.forgotPassword(state.phoneNumber).pipe(finalize(() => this.resending = false)).subscribe({
      next: ({ accessToken }) => { this.resetState.set({ ...state, resetToken: accessToken, verifiedToken: undefined }); this.startTimer(); },
      error: (error: Error) => { this.invalid = true; this.serverError = error.message; }
    });
  }

  private static friendly(message: string): string {
    if (message.startsWith('Cannot reach')) return message;
    if (/expired/i.test(message)) return 'This code has expired. Tap “Resend OTP” to get a new one.';
    return 'That code is not correct. Please try again.';
  }

  private startTimer(): void {
    clearInterval(this.timer);
    this.secondsLeft = RESEND_SECONDS;
    this.timer = setInterval(() => {
      this.secondsLeft--;
      if (this.secondsLeft <= 0) clearInterval(this.timer);
    }, 1000);
  }
}
