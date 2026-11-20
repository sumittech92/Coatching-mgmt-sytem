import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './api-client';
import { AuthApiService } from './auth-api.service';

export type PaperKind = 'chapter' | 'full';
export type PaperLength = 'short' | 'standard' | 'board';
export type PaperDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type QuestionType = 'mcq' | 'assertionReason' | 'veryShort' | 'short' | 'long' | 'caseBased';

export interface PaperQuestion { number: number; type: QuestionType; text: string; options: string[]; marks: number; answer: string; explanation: string; }
export interface ApiMockPaper {
  _id: string; paperCode: string; createdByRole: 'student' | 'teacher' | 'admin'; createdByName: string;
  board: string; className: string; subject: string; kind: PaperKind; chapters: string[]; length: PaperLength; difficulty: PaperDifficulty;
  title: string; instructions: string[]; totalMarks: number; durationMinutes: number; downloads: number; createdAt: string;
  /** Only on a download. */ sections?: { name: string; description: string; questions: PaperQuestion[] }[];
  /** Students: the limit and what's left; null for staff. */ maxDownloads: number | null; downloadsLeft: number | null;
}
export interface PaperOptions {
  boards: string[]; maxDownloads: number;
  sizes: Record<PaperLength, { marks: number; minutes: number; label: string }>;
  classes: { className: string; subjects: { subject: string; chapters: string[] }[] }[];
}
export interface PaperRequest { board: string; className?: string; subject: string; kind: PaperKind; chapters: string[]; length: PaperLength; difficulty: PaperDifficulty; }

/**
 * Mock test papers written by Claude (school, Classes 9–12). Staff use /mock-paper; students use /portal/mock-papers.
 * Generating takes up to a minute or two, so that call skips the one-at-a-time queue (see SequentialRequestInterceptor).
 */
@Injectable({ providedIn: 'root' })
export class MockPaperApiService {
  constructor(private http: HttpClient) {}

  private base(portal: boolean): string { return portal ? `${environment.apiUrl}/portal/mock-papers` : `${environment.apiUrl}/mock-paper`; }

  options(token: string, portal: boolean): Observable<PaperOptions> { return this.call(this.http.get<ApiResponse<PaperOptions>>(`${this.base(portal)}/options`, this.opts(token))); }
  list(token: string, portal: boolean): Observable<ApiMockPaper[]> { return this.call(this.http.get<ApiResponse<ApiMockPaper[]>>(this.base(portal), this.opts(token))); }
  generate(token: string, portal: boolean, request: PaperRequest): Observable<ApiMockPaper> { return this.call(this.http.post<ApiResponse<ApiMockPaper>>(`${this.base(portal)}/generate`, request, this.opts(token))); }
  /** Returns the full paper and counts the download (students: max 3 per paper). */
  download(token: string, portal: boolean, code: string): Observable<ApiMockPaper> { return this.call(this.http.post<ApiResponse<ApiMockPaper>>(`${this.base(portal)}/${code}/download`, {}, this.opts(token))); }

  private opts(token: string) { return { headers: new HttpHeaders({ accesstoken: token }) }; }
  private call<T>(request: Observable<ApiResponse<T>>): Observable<T> {
    return request.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}
