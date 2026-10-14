import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input';
import { PasswordResetState } from '../password-reset-state';
import { ToastService } from '../../core/toast.service';

// The backend issues a fixed 4-digit code until SMS sending is connected.
const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;
const DEMO_OTP = '1234';

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

  constructor(private router: Router, private resetState: PasswordResetState, private toast: ToastService) {}

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
    if (this.otp.length < this.otpLength) { this.invalid = true; this.serverError = ''; this.toast.error(`Please enter all ${this.otpLength} digits.`); return; }
    if (!state?.resetToken) { this.router.navigateByUrl('/forgot-password'); return; }
    // UI-testing mode: the auth API is disconnected; the demo OTP is 1234.
    if (this.otp !== DEMO_OTP) {
      this.otpInput?.setValue('');
      this.otp = '';
      this.invalid = true;
      this.serverError = 'That code is not correct. Please try again.';
      this.toast.error(this.serverError);
      return;
    }
    this.resetState.set({ ...state, verifiedToken: 'demo-verified' });
    this.toast.success('OTP verified. Set your new password.');
    this.router.navigateByUrl('/reset-password');
  }

  resend(): void {
    const state = this.resetState.value;
    if (!state) { this.router.navigateByUrl('/forgot-password'); return; }
    this.otpInput?.setValue('');
    this.otp = '';
    this.invalid = false;
    this.serverError = '';
    this.resetState.set({ ...state, resetToken: 'demo-reset', verifiedToken: undefined });
    this.startTimer();
    this.toast.success('A new OTP has been sent. Demo code: 1234');
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
