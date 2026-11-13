import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClient, ApiResponse } from './api-client';

export type SyllabusStatus = 'On track' | 'Behind' | 'No targets' | 'Not set';

/** % done (weighted by chapter weight), % expected by now (target months passed) and the status. */
export interface SyllabusProgress { percent: number; expected: number | null; status: SyllabusStatus; done: number; total: number; }

export interface SyllabusChapter { chapterId?: string; title: string; targetMonth: string | null; weight: number; /** Added by the signed-in user (teachers may edit only these). */ mine?: boolean; }

export interface ApiSyllabus {
  syllabusCode: string;
  subject: string;
  course: { courseCode: string; name: string } | null;
  chapters: SyllabusChapter[];
  /** Owner: may change every chapter and delete. */
  canEdit: boolean;
}

/** One syllabus with each section's / batch's progress and ticked chapters (chapterId → completed date). */
export interface ApiSyllabusDetail extends ApiSyllabus {
  batches: (SyllabusProgress & { batchCode: string; label: string; completed: Record<string, string> })[];
}

/** Grid cell: one subject in one section / batch. */
export interface SyllabusCell extends SyllabusProgress { subject: string; syllabusCode: string | null; canMark: boolean; }
export interface SyllabusGroup {
  course: { courseCode: string; name: string };
  subjects: string[];
  rows: { batchCode: string; label: string; cells: SyllabusCell[] }[];
}

export interface SyllabusPayload { courseCode: string; subject: string; chapters: SyllabusChapter[]; }

/** Client for crm-backend /syllabus. Owners manage every syllabus; teachers the subjects they teach. */
@Injectable({ providedIn: 'root' })
export class SyllabusApiService extends ApiClient<ApiSyllabus, SyllabusPayload> {
  protected readonly path = 'syllabus';
  constructor(http: HttpClient) { super(http); }

  overview(token: string): Observable<SyllabusGroup[]> { return this.get(token, '/overview'); }
  detail(token: string, code: string): Observable<ApiSyllabusDetail> { return this.get(token, `/${code}`); }
  saveChapters(token: string, code: string, chapters: SyllabusChapter[]): Observable<ApiSyllabus> { return this.update(token, code, { chapters }); }
  /** Tick (or untick) a chapter for one section / batch. */
  mark(token: string, code: string, body: { batchCode: string; chapterId: string; done: boolean; completedOn?: string | null }): Observable<SyllabusProgress & { batchCode: string; chapterId: string; ticked: boolean }> {
    return this.request(this.http.put<ApiResponse<SyllabusProgress & { batchCode: string; chapterId: string; ticked: boolean }>>(`${this.base}/${code}/progress`, body, { headers: this.headers(token) }));
  }
}
