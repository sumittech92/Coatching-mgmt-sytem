import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiClient } from './api-client';

export type ApiEventAudience = 'all' | 'students' | 'parents' | 'staff';
export const EVENT_AUDIENCE_LABELS: Record<ApiEventAudience, string> = { all: 'All', students: 'Students', parents: 'Parents', staff: 'Staff' };

/** A school event. Status comes from the date: upcoming → completed, or cancelled. */
export interface ApiEvent {
  _id: string; eventCode: string; name: string; date: string; startTime: string | null; venue: string | null;
  audience: ApiEventAudience; description: string | null; cancelled: boolean; status: 'upcoming' | 'completed' | 'cancelled';
}
export interface EventPayload { name: string; date: string; startTime: string | null; venue: string | null; audience: ApiEventAudience; description: string | null; cancelled: boolean; }

/** Client for crm-backend /event (owners change, staff read). */
@Injectable({ providedIn: 'root' })
export class EventApiService extends ApiClient<ApiEvent, EventPayload> {
  protected readonly path = 'event';
  constructor(http: HttpClient) { super(http); }
}
