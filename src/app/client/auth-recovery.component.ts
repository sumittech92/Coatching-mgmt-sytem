import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-auth-recovery',
  templateUrl: './auth-recovery.component.html',
  styles: [`
    :host{display:block;min-height:100vh;background:#f5f7f8}
    .auth-recovery{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:24px}
    .recovery-brand{position:absolute;top:32px;left:40px;color:#19303a;font-weight:750;font-size:22px;text-decoration:none}
    .recovery-brand span:first-child{display:inline-grid;place-items:center;width:29px;height:29px;border-radius:9px;background:#0b947d;color:#fff;font:700 21px Georgia;margin-right:8px}
    .recovery-brand span:last-child{color:#0b947d}
    .auth-recovery mat-card{max-width:425px;width:100%;border-radius:16px;border:1px solid #e8edf0;box-shadow:0 12px 35px #25384b0d}
    .auth-recovery mat-card-content{padding:32px}
    .recovery-icon{height:48px;width:48px;border-radius:15px;background:#e6f5f0;color:#0d9079;display:grid;place-items:center;margin-bottom:20px}
    .auth-recovery h1{font-size:22px;color:#263547;font-weight:700}
    .auth-recovery p{font-size:12px;color:#8491a0;line-height:1.6;margin-bottom:22px}
    .auth-recovery label{display:block;font-size:10px;font-weight:650;color:#465468;margin-bottom:5px}
    .auth-recovery button{height:42px;border-radius:8px;font-size:11px}
    .back-login{display:flex;justify-content:center;align-items:center;gap:5px;color:#0b8d77;text-decoration:none;font-size:10px;font-weight:650;margin-top:20px}
    .back-login mat-icon{font-size:15px;width:15px;height:15px}
    .recovery-footer{margin-top:25px;color:#a3adb6;font-size:9px}
    .success-message{display:flex;align-items:center;gap:5px;background:#eaf7f1;border-radius:7px;padding:9px;color:#148064;font-size:10px;margin-bottom:12px}
    .success-message mat-icon{font-size:15px;width:15px;height:15px}
    @media(max-width:500px){.recovery-brand{left:22px;top:22px}.auth-recovery mat-card-content{padding:24px}}
  `]
})
export class AuthRecoveryComponent {
  @Input() reset = false;
  identity = '';
  password = '';
  confirmPassword = '';
  submitted = false;
  saved = false;
  hide = true;
}
