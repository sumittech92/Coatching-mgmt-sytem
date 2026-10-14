import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';
import { SignInComponent } from './sign-in/sign-in.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { MatModule } from '../appModules/mat.module';
import { OtpVerificationComponent } from './otp-verification/otp-verification.component';
import { NgOtpInputModule } from 'ng-otp-input';
@NgModule({ declarations: [SignInComponent, ResetPasswordComponent, ForgotPasswordComponent, OtpVerificationComponent], imports: [CommonModule, FormsModule, ReactiveFormsModule, AuthRoutingModule, MatModule, NgOtpInputModule] })
export class AuthModule {}
