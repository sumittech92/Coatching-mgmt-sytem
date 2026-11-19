import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient, ApiResponse } from './api-client';

/** Entrance tests are only for primary classes. */
export const PRIMARY_CLASSES = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];

export type ApiCandidateResult = 'pending' | 'qualified' | 'notQualified';
export const CANDIDATE_RESULT_LABELS: Record<ApiCandidateResult, string> = { pending: 'Pending', qualified: 'Qualified', notQualified: 'Not qualified' };

export interface ApiEntranceCandidate {
  _id?: string; enquiryCode: string | null; studentName: string; parentName: string | null; phoneNumber: string | null;
  marks: number | null; remarks: string | null; result?: ApiCandidateResult;
}
/** A school admission entrance test. Status comes from the date: scheduled → completed, or cancelled. */
export interface ApiEntrance {
  _id: string; entranceCode: string; name: string; className: string; date: string; startTime: string | null; endTime: string | null;
  venue: string | null; maxMarks: number; passMarks: number; instructions: string | null; cancelled: boolean;
  candidates: ApiEntranceCandidate[]; qualified: number; status: 'scheduled' | 'completed' | 'cancelled';
}
export interface EntrancePayload {
  name: string; className: string; date: string; startTime: string | null; endTime: string | null; venue: string | null;
  maxMarks: number; passMarks: number; instructions: string | null; cancelled: boolean;
}
/** An open admission enquiry that can be added as a candidate. */
export interface ApiApplicant { enquiryCode: string; studentName: string; parentName: string | null; phoneNumber: string; className: string | null; }

/** Client for crm-backend /entrance (school owners only). */
@Injectable({ providedIn: 'root' })
export class EntranceApiService extends ApiClient<ApiEntrance, EntrancePayload> {
  protected readonly path = 'entrance';
  constructor(http: HttpClient) { super(http); }

  applicants(accessToken: string, className: string): Observable<ApiApplicant[]> { return this.get<ApiApplicant[]>(accessToken, '/applicants', { className }); }
  saveCandidates(accessToken: string, code: string, candidates: ApiEntranceCandidate[]): Observable<ApiEntrance> {
    return this.request(this.http.put<ApiResponse<ApiEntrance>>(`${this.base}/${code}/candidates`, { candidates }, { headers: this.headers(accessToken) }));
  }
}
