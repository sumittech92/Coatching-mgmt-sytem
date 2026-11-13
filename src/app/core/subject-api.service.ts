import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';

export type ApiSubjectStatus = 'active' | 'inactive';
export interface ApiTeacherRef { teacherCode: string; fullName: string | null; }

/** A school subject of one class, with the teacher of each section and how many periods are on the timetable. */
export interface ApiSubject {
  _id: string;
  subjectCode: string;
  name: string;
  code: string | null;
  periodsPerWeek: number | null;
  /** Elective: only students who choose it sit its exam paper. */
  optional: boolean;
  status: ApiSubjectStatus;
  course: { courseCode: string; name: string } | null;
  sections: { batchCode: string; name: string; teacher: ApiTeacherRef | null; scheduled: number }[];
  scheduled: number;
}
export interface SubjectPayload {
  courseCode: string;
  name: string;
  code: string | null;
  periodsPerWeek: number | null;
  optional: boolean;
  sections: { batchCode: string; teacherCode: string | null }[];
  status: ApiSubjectStatus;
}
/** One subject in one section that the signed-in teacher teaches. */
export interface ApiMySubject {
  subjectCode: string; name: string; code: string | null; status: ApiSubjectStatus;
  course: { courseCode: string; name: string } | null;
  section: { batchCode: string; name: string; room: string | null; students: number };
  periodsPerWeek: number | null; scheduled: number;
}

/** Client for crm-backend /subject (owners change, staff read; teachers also read their own). */
@Injectable({ providedIn: 'root' })
export class SubjectApiService extends ApiClient<ApiSubject, SubjectPayload> {
  protected readonly path = 'subject';
  constructor(http: HttpClient) { super(http); }
  mine(accessToken: string): Observable<ApiMySubject[]> { return this.get(accessToken, '/mine'); }
}
