import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationDialogService } from './confirmation-dialog.service';
import { MockAuthService } from './mock-auth.service';
import { ToastService } from './toast.service';

/** One log-out flow for every panel (header menu, sidebar, student portal): confirm, end session, back to /login. */
@Injectable({ providedIn: 'root' })
export class SignOutService {
  constructor(private confirm: ConfirmationDialogService, private auth: MockAuthService, private router: Router, private toast: ToastService) {}

  signOut(): void {
    this.confirm.confirm({ title: 'Log out?', message: 'You will need to sign in again to continue.', confirmLabel: 'Log out' }).subscribe(ok => {
      if (!ok) return;
      this.auth.logout();
      this.router.navigateByUrl('/login');
      this.toast.info('You have been signed out.');
    });
  }
}
