import { Component, Input } from '@angular/core';

@Component({ selector: 'app-breadcrumbs', template: '<nav aria-label="breadcrumb"><ol class="breadcrumb mb-0"><li class="breadcrumb-item" *ngFor="let item of items; let last = last" [class.active]="last" [attr.aria-current]="last ? \'page\' : null">{{ item }}</li></ol></nav>', styles: [':host{display:block}.breadcrumb{font-size:.82rem;color:#7a8798}.active{color:#202b3c;font-weight:600}'] })
export class BreadcrumbsComponent { @Input() items: string[] = ['Home']; }
