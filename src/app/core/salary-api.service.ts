import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient, ApiResponse } from './api-client';

export type ApiSalaryMode = 'cash' | 'upi' | 'bank' | 'cheque';
export const SALARY_MODE_LABELS: Record<ApiSalaryMode, string> = { cash: 'Cash', upi: 'UPI', bank: 'Bank transfer', cheque: 'Cheque' };

/** One teacher's salary for one month. netPay = basic + allowances + bonus − deductions. */
export interface ApiSalary {
  _id: string; salaryCode: string; teacherCode: string; teacherName: string; month: string;
  basic: number; allowances: number; bonus: number; deductions: number; netPay: number;
  status: 'pending' | 'paid'; paidOn: string | null; mode: ApiSalaryMode | null; reference: string | null; note: string | null;
}
export interface SalaryPayload {
  teacherCode: string; month: string; basic: number; allowances: number; bonus: number; deductions: number;
  status: 'pending' | 'paid'; paidOn: string | null; mode: ApiSalaryMode | null; reference: string | null; note: string | null;
}
export interface SalaryGenerateResult { month: string; created: number; skipped: string[]; }

/** Client for crm-backend /salary (owner only). */
@Injectable({ providedIn: 'root' })
export class SalaryApiService extends ApiClient<ApiSalary, SalaryPayload> {
  protected readonly path = 'salary';
  constructor(http: HttpClient) { super(http); }

  /** Pending salaries for the month for every active teacher paid before (copies their last basic pay). */
  generate(accessToken: string, month: string): Observable<SalaryGenerateResult> {
    return this.request(this.http.post<ApiResponse<SalaryGenerateResult>>(`${this.base}/generate`, { month }, { headers: this.headers(accessToken) }));
  }

  /** "2026-11" -> "Nov 2026" */
  static monthLabel(month: string): string {
    const [year, value] = month.split('-').map(Number);
    return new Date(year, value - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  static rupees(value: number): string { return `₹${(value || 0).toLocaleString('en-IN')}`; }
}
