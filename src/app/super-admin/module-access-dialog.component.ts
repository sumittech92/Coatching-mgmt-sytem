import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MODULES, ModuleInfo } from '../core/module-access';

export interface ModuleAccessDialogData { name: string; school: boolean; disabledModules: string[]; }

/** Super Admin: switch modules on / off for one institute. Closes with the list of turned-off module keys. */
@Component({ selector: 'app-module-access-dialog', templateUrl: './module-access-dialog.component.html', styleUrls: ['./module-access-dialog.component.scss'] })
export class ModuleAccessDialogComponent {
  /** Coaching institutes don't see school-only modules (they stay as they are). */
  readonly modules: ModuleInfo[];
  readonly enabled: Record<string, boolean> = {};

  constructor(@Inject(MAT_DIALOG_DATA) public data: ModuleAccessDialogData, private ref: MatDialogRef<ModuleAccessDialogComponent>) {
    this.modules = MODULES.filter(module => data.school || !module.schoolOnly);
    MODULES.forEach(module => this.enabled[module.key] = !data.disabledModules.includes(module.key));
  }

  get onCount(): number { return this.modules.filter(module => this.enabled[module.key]).length; }
  setAll(value: boolean): void { this.modules.forEach(module => this.enabled[module.key] = value); }
  save(): void { this.ref.close(MODULES.filter(module => !this.enabled[module.key]).map(module => module.key)); }
}
