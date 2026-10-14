import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppValidators, validationMessage } from '../../../core/app-validators';
import { ToastService } from '../../../core/toast.service';

export interface DepartmentRecord { name: string; code: string; }

@Component({
  selector: 'app-category-adddept',
  templateUrl: './category-adddept.component.html',
  styleUrl: './category-adddept.component.scss'
})
export class CategoryAdddeptComponent {
  readonly isEdit = !!this.data?.record;
  form = this.fb.group({
    name: [this.data?.record?.name ?? '', [AppValidators.required, Validators.maxLength(60)]],
    code: [this.data?.record?.code ?? '', [AppValidators.required, Validators.pattern(/^\s*[A-Za-z0-9-]{2,10}\s*$/)]]
  });

  constructor(private fb: FormBuilder, private ref: MatDialogRef<CategoryAdddeptComponent>, private toast: ToastService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { record?: DepartmentRecord } | null) {}

  errorFor(key: 'name' | 'code', label: string): string {
    const control = this.form.get(key);
    return control?.hasError('pattern') ? 'Code must be 2–10 letters, numbers or hyphens.' : validationMessage(control, label);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const { name, code } = this.form.getRawValue();
    this.toast.success(this.isEdit ? 'Department updated.' : 'Department added.');
    this.ref.close({ name: String(name).trim(), code: String(code).trim().toUpperCase() } as DepartmentRecord);
  }
}
