import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
export interface RecordField { key: string; label: string; type?: 'text'|'email'|'number'|'date'|'select'|'textarea'|'file'|'tags'; options?: string[]; required?: boolean; hint?: string; }
export interface RecordDialogData { title: string; submitLabel: string; fields: RecordField[]; record?: Record<string, unknown>; readonly?: boolean; }
@Component({ selector: 'app-record-dialog', templateUrl: './record-dialog.component.html', styles: [':host{display:block}.dialog-content{min-width:min(560px,80vw);max-height:68vh;overflow:auto;padding:4px 24px 12px}.dialog-title{font-size:20px;font-weight:700;color:#263447;margin:0;padding:23px 24px 6px}.dialog-subtitle{font-size:12px;color:#8290a0;margin:0;padding:0 24px 16px}.dialog-actions{padding:14px 24px 22px;gap:8px}.field-label{font-size:11px;font-weight:650;color:#536176;display:block;margin-bottom:5px}.field-help{font-size:10px;color:#8c98a5}.file-input{font-size:11px;padding:9px;border:1px dashed #cfd7df;border-radius:8px;width:100%}@media(max-width:600px){.dialog-content{min-width:0;padding:4px 18px 10px}.dialog-title{padding-left:18px}.dialog-subtitle{padding-left:18px}.dialog-actions{padding-left:18px;padding-right:18px}}'] })
export class RecordDialogComponent {
  form;
  constructor(@Inject(MAT_DIALOG_DATA) public data: RecordDialogData, private fb: FormBuilder, private ref: MatDialogRef<RecordDialogComponent>) {
    const controls: Record<string, unknown> = {};
    data.fields.forEach(field => controls[field.key] = [{ value: data.record?.[field.key] ?? '', disabled: !!data.readonly }, field.required && !data.readonly ? Validators.required : []]);
    this.form = this.fb.group(controls);
  }
  fileChange(field: RecordField, event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; if (file.type.startsWith('image/') || file.type.startsWith('video/')) this.form.get(field.key)?.setValue(URL.createObjectURL(file)); else this.form.get(field.key)?.setValue(file.name); }
  save(): void { this.form.markAllAsTouched(); if (this.form.valid) this.ref.close(this.form.getRawValue()); }
}
