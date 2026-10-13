import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { OtpVerificationComponent } from './otp-verification/otp-verification.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { StudentSignupComponent } from './student-signup/student-signup.component';
import { TeacherSignupComponent } from './teacher-signup/teacher-signup.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: SignInComponent },
  { path: 'sign-in', redirectTo: 'login', pathMatch: 'full' },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'forgot', redirectTo: 'forgot-password', pathMatch: 'full' },
  { path: 'otp-verification', component: OtpVerificationComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'signup', redirectTo: 'signup/student', pathMatch: 'full' },
  { path: 'register', redirectTo: 'signup/student', pathMatch: 'full' },
  { path: 'signup/student', component: StudentSignupComponent },
  { path: 'signup/teacher', component: TeacherSignupComponent }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AuthRoutingModule {}
