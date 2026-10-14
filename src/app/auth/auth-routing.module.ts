import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { OtpVerificationComponent } from './otp-verification/otp-verification.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: SignInComponent },
  { path: 'sign-in', redirectTo: 'login', pathMatch: 'full' },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'forgot', redirectTo: 'forgot-password', pathMatch: 'full' },
  { path: 'otp-verification', component: OtpVerificationComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  // No self sign-up: Super Admin creates Owners, Owners create Teachers and Students.
  { path: 'signup', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'login', pathMatch: 'full' },
  { path: 'signup/student', redirectTo: 'login', pathMatch: 'full' },
  { path: 'signup/teacher', redirectTo: 'login', pathMatch: 'full' }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AuthRoutingModule {}
