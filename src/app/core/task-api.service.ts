import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient, ApiResponse } from './api-client';

export type ApiTaskKind = 'homework' | 'assignment';
export type ApiTaskStatus = 'assigned' | 'closed';

/** Homework or an assignment for one section / batch and subject. */
export interface ApiTask {
  _id: string; taskCode: string; kind: ApiTaskKind; title: string; subject: string; dueDate: string;
  description: string | null; attachment: { url: string; name: string } | null; status: ApiTaskStatus; overdue: boolean;
  batch: { batchCode: string; name: string; label: string } | null;
  course: { courseCode: string; name: string } | null;
  /** Name of the teacher (or owner) who gave it. */
  createdBy: string | null;
  canManage: boolean;
  /** Assignments: students who submitted, out of the section's / batch's students. */
  submitted: number;
  students: number;
}
export interface TaskPayload {
  kind: ApiTaskKind; title: string; batchCode: string; subject: string; dueDate: string;
  description: string | null; attachment: { url: string; name: string } | null; status: ApiTaskStatus;
}
/** One student of the assignment's section / batch and their submission (null until they submit). */
export interface ApiTaskSubmissionRow {
  studentCode: string; fullName: string | null; rollNo: string | null;
  submission: { file: { url: string; name: string }; submittedAt: string; late: boolean; status: 'submitted' | 'checked'; remark: string | null } | null;
}
export interface ApiTaskSubmissions { taskCode: string; title: string; kind: ApiTaskKind; dueDate: string; students: ApiTaskSubmissionRow[]; }

/** A section / batch the user may give work to, with the subjects allowed there. */
export interface ApiTaskOption { batchCode: string; label: string; subjects: string[]; }

/** Client for crm-backend /task (teachers manage their own; owners all). */
@Injectable({ providedIn: 'root' })
export class TaskApiService extends ApiClient<ApiTask, TaskPayload> {
  protected readonly path = 'task';
  constructor(http: HttpClient) { super(http); }
  options(accessToken: string): Observable<ApiTaskOption[]> { return this.get(accessToken, '/options'); }
  submissions(accessToken: string, taskCode: string): Observable<ApiTaskSubmissions> { return this.get(accessToken, `/${taskCode}/submissions`); }
  review(accessToken: string, taskCode: string, studentCode: string, body: { checked: boolean; remark?: string | null }): Observable<{ studentCode: string; status: string; remark: string | null }> {
    return this.request(this.http.patch<ApiResponse<{ studentCode: string; status: string; remark: string | null }>>(`${this.base}/${taskCode}/submissions/${studentCode}`, body, { headers: this.headers(accessToken) }));
  }
}
