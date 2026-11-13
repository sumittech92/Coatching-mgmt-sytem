import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { ApiBatchDay } from './batch-api.service';
import { ApiTeacherRef } from './subject-api.service';

/** One weekly period. The teacher is the subject's teacher for that section. */
export interface ApiPeriod {
  _id: string;
  periodCode: string;
  day: ApiBatchDay;
  startTime: string;
  endTime: string;
  room: string | null;
  /** Own room, or the section's room. */
  effectiveRoom: string | null;
  section: { batchCode: string; name: string; course: { courseCode: string; name: string } | null } | null;
  subject: { subjectCode: string; name: string; code: string | null } | null;
  teacher: ApiTeacherRef | null;
}
export interface PeriodPayload { batchCode: string; subjectCode: string; day: ApiBatchDay; startTime: string; endTime: string; room: string | null; }

/** Today's school period or coaching batch. */
export interface ApiTodayClass { key: string; startTime: string; endTime: string; group: string; batchCode: string | null; subject: string; room: string | null; teacher: ApiTeacherRef | null; }

/** A section / batch the signed-in teacher teaches. School rows carry subjects and periods; coaching rows carry days and times. */
export interface ApiMyClass {
  batchCode: string; group: string; course: { courseCode: string; name: string } | null;
  subjects: string[]; classTeacher: boolean;
  days: ApiBatchDay[]; startTime: string | null; endTime: string | null;
  periodsPerWeek: number | null; scheduled: number | null;
  students: number; capacity: number | null; room: string | null; status: 'active' | 'inactive';
}

/** Client for crm-backend /timetable (owners change, staff read). */
@Injectable({ providedIn: 'root' })
export class TimetableApiService extends ApiClient<ApiPeriod, PeriodPayload> {
  protected readonly path = 'timetable';
  constructor(http: HttpClient) { super(http); }
  today(accessToken: string): Observable<ApiTodayClass[]> { return this.get(accessToken, '/today'); }
  myClasses(accessToken: string): Observable<ApiMyClass[]> { return this.get(accessToken, '/my-classes'); }
}
