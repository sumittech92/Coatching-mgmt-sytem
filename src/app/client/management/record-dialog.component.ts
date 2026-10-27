import { Component, Inject } from '@angular/core';
import { FormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppValidators, validationMessage } from '../../core/app-validators';
import { ToastService } from '../../core/toast.service';
export interface RecordField { key: string; label: string; type?: 'text'|'email'|'phone'|'number'|'date'|'select'|'multiselect'|'textarea'|'file'|'tags'; options?: string[]; required?: boolean; hint?: string; }
export interface RecordDialogData { title: string; submitLabel: string; fields: RecordField[]; record?: Record<string, unknown>; readonly?: boolean;
  /** Toast shown after a valid save. Defaults to "Saved successfully."; pass '' when the caller shows its own. */
  successMessage?: string; }
@Component({ selector: 'app-record-dialog', templateUrl: './record-dialog.component.html', styles: [':host{display:block}.dialog-content{min-width:min(560px,80vw);max-height:68vh;overflow:auto;padding:4px 24px 12px}.dialog-title{font-size:clamp(18px, 17.296px + 0.1878vw, 20px);font-weight:700;color:#263447;margin:0;padding:23px 24px 6px}.dialog-subtitle{font-size:clamp(12px, 11.648px + 0.0939vw, 13px);color:#8290a0;margin:0;padding:0 24px 16px}.dialog-actions{padding:14px 24px 22px;gap:8px}.field-label{font-size:12px;font-weight:650;color:#536176;display:block;margin-bottom:5px}.field-help{font-size:12px;color:#8c98a5}.file-input{font-size:12px;padding:9px;border:1px dashed #cfd7df;border-radius:8px;width:100%}@media(max-width:600px){.dialog-content{min-width:0;padding:4px 18px 10px}.dialog-title{padding-left:18px}.dialog-subtitle{padding-left:18px}.dialog-actions{padding-left:18px;padding-right:18px}}'] })
export class RecordDialogComponent {
  form;
  constructor(@Inject(MAT_DIALOG_DATA) public data: RecordDialogData, private fb: FormBuilder, private ref: MatDialogRef<RecordDialogComponent>, private toast: ToastService) {
    const controls: Record<string, unknown> = {};
    data.fields.forEach(field => controls[field.key] = [{ value: data.record?.[field.key] ?? '', disabled: !!data.readonly }, data.readonly ? [] : RecordDialogComponent.validatorsFor(field)]);
    this.form = this.fb.group(controls);
  }
  isPhone(field: RecordField): boolean { return RecordDialogComponent.phoneField(field); }
  inputType(field: RecordField): string { return this.isPhone(field) ? 'tel' : field.type === 'email' || field.type === 'number' ? field.type : 'text'; }
  /** Example text for every field type, so empty fields show what to enter. */
  placeholderFor(field: RecordField): string {
    const label = field.label.replace(/\s*\(.*\)$/, '').toLowerCase();
    if (this.isPhone(field)) return '9876543210';
    if (field.type === 'email' || field.key.toLowerCase().includes('email')) return 'name@example.com';
    if (field.type === 'select') return `Select ${label}`;
    if (field.type === 'multiselect') return `Select one or more ${label}`;
    if (field.type === 'tags') return 'Separate items with commas';
    if (field.type === 'date') return 'DD/MM/YYYY';
    if (field.type === 'number') return 'e.g. 100';
    if (field.type === 'textarea') return `Add ${label}`;
    return `Enter ${label}`;
  }
  errorFor(field: RecordField): string { return validationMessage(this.form.get(field.key), field.label); }
  private static phoneField(field: RecordField): boolean { return field.type === 'phone' || (!field.type || field.type === 'text') && /(phone|mobile|whatsapp)/i.test(field.key); }
  /** Validators follow the field's type and key, so every dialog in every panel validates the same way. */
  private static validatorsFor(field: RecordField): ValidatorFn[] {
    const list: ValidatorFn[] = field.required ? [AppValidators.required] : [];
    const key = field.key.toLowerCase();
    if (field.type === 'email' || key.includes('email')) list.push(AppValidators.email);
    if (RecordDialogComponent.phoneField(field)) list.push(AppValidators.mobile);
    if (key.includes('pincode')) list.push(AppValidators.pincode);
    if (/(full name|parent|guardian|father|mother|owner)/i.test(field.label) && !/(email|phone|mobile|contact)/i.test(field.label)) list.push(AppValidators.personName);
    if (field.type === 'number') list.push(/(amount|price|rent|fee|mrp)/.test(key) ? AppValidators.positive : AppValidators.nonNegative);
    if (/(url|link)$/.test(key)) list.push(AppValidators.url);
    if (!field.type || field.type === 'text' || field.type === 'email' || field.type === 'phone') list.push(Validators.maxLength(120));
    if (field.type === 'textarea') list.push(Validators.maxLength(1000));
    return list;
  }
  fileChange(field: RecordField, event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; if (file.type.startsWith('image/') || file.type.startsWith('video/')) this.form.get(field.key)?.setValue(URL.createObjectURL(file)); else this.form.get(field.key)?.setValue(file.name); }
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const value = this.form.getRawValue() as Record<string, unknown>;
    // Trim text so "  Ravi " is saved as "Ravi".
    Object.keys(value).forEach(key => { if (typeof value[key] === 'string') value[key] = (value[key] as string).trim(); });
    // Multi-selects are saved as "A, B" so tables, search and detail views keep showing plain text.
    this.data.fields.forEach(field => { if (field.type === 'multiselect' && Array.isArray(value[field.key])) value[field.key] = (value[field.key] as string[]).join(', '); });
    const message = this.data.successMessage ?? 'Saved successfully.';
    if (message) this.toast.success(message);
    this.ref.close(value);
  }
}
