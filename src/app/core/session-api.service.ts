import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiClient } from './api-client';

export type ApiSessionStatus = 'current' | 'upcoming' | 'completed';

/** An academic session as crm-backend returns it. `sessionCode` is the 6-digit ID. One session is current at a time. */
export interface ApiSession { _id: string; sessionCode: string; name: string; startDate: string; endDate: string; terms: string[]; status: ApiSessionStatus; }
export interface SessionPayload { name: string; startDate: string; endDate: string; terms: string[]; status: ApiSessionStatus; }

/** Client for crm-backend /session (owners change, staff read). */
@Injectable({ providedIn: 'root' })
export class SessionApiService extends ApiClient<ApiSession, SessionPayload> {
  protected readonly path = 'session';
  constructor(http: HttpClient) { super(http); }
}
