import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiMaterialType = 'pdf' | 'notes' | 'assignment' | 'video' | 'questionPaper';
export type ApiMaterialStatus = 'published' | 'draft';
export const MATERIAL_TYPE_LABELS: Record<ApiMaterialType, string> = { pdf: 'PDF', notes: 'Notes', assignment: 'Assignment', video: 'Video', questionPaper: 'Question Paper' };
/** File types the upload accepts (videos are added as links). */
export const MATERIAL_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.gif';
export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;

export interface ApiMaterialFile { url: string; name: string; size: number; mimeType: string; }

/** A study material as crm-backend returns it. `materialCode` is the 6-digit ID; it carries either a file or a link. */
export interface ApiMaterial {
  _id: string;
  materialCode: string;
  workType: 'school' | 'coaching';
  title: string;
  description: string | null;
  course: { courseCode: string; name: string } | null;
  batches: { batchCode: string; name: string }[];
  subject: string | null;
  type: ApiMaterialType;
  file: ApiMaterialFile | null;
  link: string | null;
  status: ApiMaterialStatus;
  publishedAt: string | null;
  createdAt: string;
  canManage: boolean;
}

export interface MaterialPayload {
  title: string;
  description?: string | null;
  courseCode: string;
  batchCodes: string[];
  subject?: string | null;
  type: ApiMaterialType;
  file?: ApiMaterialFile | null;
  link?: string | null;
  status: ApiMaterialStatus;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /material routes and the material file upload. */
@Injectable({ providedIn: 'root' })
export class MaterialApiService {
  private readonly base = `${environment.apiUrl}/material`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiMaterial[]> {
    return this.request(this.http.get<ApiResponse<ApiMaterial[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: MaterialPayload): Observable<ApiMaterial> {
    return this.request(this.http.post<ApiResponse<ApiMaterial>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) }));
  }

  update(accessToken: string, materialCode: string, payload: Partial<MaterialPayload>): Observable<ApiMaterial> {
    return this.request(this.http.patch<ApiResponse<ApiMaterial>>(`${this.base}/${materialCode}`, payload, { headers: this.headers(accessToken) }));
  }

  remove(accessToken: string, materialCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${materialCode}`, { headers: this.headers(accessToken) }));
  }

  /** Uploads the file first; the result goes into the create / update payload as `file`. */
  upload(accessToken: string, file: File): Observable<ApiMaterialFile> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.request(this.http.post<ApiResponse<ApiMaterialFile>>(`${environment.apiUrl}/upload/material`, form, { headers: this.headers(accessToken) }));
  }

  /** "2.4 MB", "840 KB" */
  static sizeLabel(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}
