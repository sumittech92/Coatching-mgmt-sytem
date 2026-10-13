import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input';

// Matches the backend's verifyOtp schema, which currently accepts the fixed demo code.
const DEMO_OTP = '1234';
const RESEND_SECONDS = 30;

@Component({ selector: 'app-otp-verification', templateUrl: './otp-verification.component.html', styleUrls: ['../sign-in/sign-in.component.scss', '../recovery-shared.scss'] })
export class OtpVerificationComponent implements OnInit, OnDestroy {
  @ViewChild(NgOtpInputComponent) otpInput?: NgOtpInputComponent;
  readonly otpLength = DEMO_OTP.length;
  readonly config = { length: DEMO_OTP.length, allowNumbersOnly: true, inputClass: 'otp-box' };
  phone = '';
  otp = '';
  invalid = false;
  wrongCode = false;
  loading = false;
  secondsLeft = RESEND_SECONDS;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.phone = history.state?.phone || 'your registered number';
    this.startTimer();
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  onOtpChange(value: string): void {
    this.otp = value;
    this.invalid = false;
    this.wrongCode = false;
  }

  verify(): void {
    if (this.otp.length < this.otpLength) { this.invalid = true; this.wrongCode = false; return; }
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      if (this.otp !== DEMO_OTP) {
        // Clearing the boxes fires onInputChange, so flag the error afterwards.
        this.otpInput?.setValue('');
        this.otp = '';
        this.invalid = true;
        this.wrongCode = true;
        return;
      }
      this.router.navigate(['/reset-password'], { state: { verified: true } });
    }, 600);
  }

  resend(): void {
    this.otpInput?.setValue('');
    this.otp = '';
    this.invalid = false;
    this.wrongCode = false;
    this.startTimer();
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
