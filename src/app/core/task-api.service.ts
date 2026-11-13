import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';

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
}
export interface TaskPayload {
  kind: ApiTaskKind; title: string; batchCode: string; subject: string; dueDate: string;
  description: string | null; attachment: { url: string; name: string } | null; status: ApiTaskStatus;
}
/** A section / batch the user may give work to, with the subjects allowed there. */
export interface ApiTaskOption { batchCode: string; label: string; subjects: string[]; }

/** Client for crm-backend /task (teachers manage their own; owners all). */
@Injectable({ providedIn: 'root' })
export class TaskApiService extends ApiClient<ApiTask, TaskPayload> {
  protected readonly path = 'task';
  constructor(http: HttpClient) { super(http); }
  options(accessToken: string): Observable<ApiTaskOption[]> { return this.get(accessToken, '/options'); }
}
