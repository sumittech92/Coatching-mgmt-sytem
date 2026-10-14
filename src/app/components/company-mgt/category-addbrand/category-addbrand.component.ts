import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppValidators, validationMessage } from '../../../core/app-validators';
import { ToastService } from '../../../core/toast.service';

export interface BrandRecord { name: string; department: string; description: string; image: string | null; }

@Component({
  selector: 'app-category-addbrand',
  templateUrl: './category-addbrand.component.html',
  styleUrl: './category-addbrand.component.scss'
})
export class CategoryAddbrandComponent {
  readonly maxImageMb = 2;
  readonly departments: string[] = this.data?.departments ?? [];
  readonly isEdit = !!this.data?.record;
  previewUrl: string | ArrayBuffer | null = this.data?.record?.image ?? null;
  form = this.fb.group({
    name: [this.data?.record?.name ?? '', [AppValidators.required, Validators.maxLength(60)]],
    department: [this.data?.record?.department ?? ''],
    description: [this.data?.record?.description ?? '', [Validators.maxLength(500)]]
  });

  constructor(private fb: FormBuilder, private ref: MatDialogRef<CategoryAddbrandComponent>, private toast: ToastService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { record?: BrandRecord; departments?: string[] } | null) {}

  errorFor(key: 'name' | 'description', label: string): string { return validationMessage(this.form.get(key), label); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.toast.error('Please choose an image file (PNG, JPG or SVG).'); return; }
    if (file.size > this.maxImageMb * 1024 * 1024) { this.toast.error(`Image must be smaller than ${this.maxImageMb} MB.`); return; }
    const reader = new FileReader();
    reader.onload = () => { this.previewUrl = reader.result; };
    reader.readAsDataURL(file);
  }

  removeImage(): void { this.previewUrl = null; this.toast.info('Image removed.'); }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const value = this.form.getRawValue();
    this.toast.success(this.isEdit ? 'Brand updated.' : 'Brand added.');
    this.ref.close({ name: String(value.name).trim(), department: value.department ?? '', description: String(value.description ?? '').trim(), image: typeof this.previewUrl === 'string' ? this.previewUrl : null } as BrandRecord);
  }
}
