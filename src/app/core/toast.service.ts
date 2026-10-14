import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

/** App-wide toasts (top-right). Styles live in styles.scss under .app-toast. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 5000); }
  info(message: string): void { this.show(message, 'info'); }
  warning(message: string): void { this.show(message, 'warning', 4500); }

  /** Standard message when a submit is blocked by invalid fields. */
  invalidForm(): void { this.error('Please fix the highlighted fields and try again.'); }

  private show(message: string, kind: ToastKind, duration = 3200): void {
    this.snackBar.open(message, '✕', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['app-toast', `app-toast-${kind}`],
      politeness: kind === 'error' ? 'assertive' : 'polite'
    });
  }
}
