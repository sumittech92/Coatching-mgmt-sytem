import { Component, Input } from '@angular/core';
@Component({ selector: 'app-loading-state', template: '<div class="loading-state" role="status"><mat-spinner [diameter]="diameter"></mat-spinner><span>{{ label }}</span></div>', styles: [':host{display:block}.loading-state{min-height:160px;display:flex;align-items:center;justify-content:center;gap:.8rem;color:#718096;font-size:.9rem}'] })
export class LoadingStateComponent { @Input() label = 'Loading your workspace…'; @Input() diameter = 30; }
