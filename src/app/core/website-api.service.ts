import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';
import type { WebsiteProfile } from './website-content.service';

type WorkType = 'school' | 'coaching';

/** An owner's saved website as crm-backend returns it. */
export type ApiWebsite = WebsiteProfile & { _id: string; workType: WorkType; isPublished: boolean; publishedAt: string | null; updatedAt?: string };
export interface MyWebsite { website: ApiWebsite | null; siteSlug: string | null; customDomain: string | null; }
/** A published website as visitors see it (draft items already removed). */
export interface PublicWebsite { siteSlug: string; instituteName: string; workType: WorkType; profile: WebsiteProfile; }
export interface DirectoryEntry { siteSlug: string; name: string; logo: string; primary: string; address: string; workType: WorkType; }

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /website and /upload routes. Owner token for editing; /public routes need no sign-in. */
@Injectable({ providedIn: 'root' })
export class WebsiteApiService {
  private readonly base = `${environment.apiUrl}/website`;

  constructor(private http: HttpClient) {}

  mine(accessToken: string): Observable<MyWebsite> {
    return this.request(this.http.get<ApiResponse<MyWebsite>>(this.base, { headers: this.headers(accessToken) }));
  }

  save(accessToken: string, profile: WebsiteProfile): Observable<ApiWebsite> {
    return this.request(this.http.put<ApiResponse<ApiWebsite>>(this.base, profile, { headers: this.headers(accessToken) }));
  }

  setPublished(accessToken: string, isPublished: boolean): Observable<ApiWebsite> {
    return this.request(this.http.patch<ApiResponse<ApiWebsite>>(`${this.base}/publish`, { isPublished }, { headers: this.headers(accessToken) }));
  }

  /** Image (2 MB) or MP4 / WebM video (20 MB); returns the public URL to save in the website. */
  upload(accessToken: string, file: Blob, name = 'upload'): Observable<{ url: string; type: 'image' | 'video' }> {
    const form = new FormData();
    form.append('file', file, name);
    return this.request(this.http.post<ApiResponse<{ url: string; type: 'image' | 'video' }>>(`${environment.apiUrl}/upload/website`, form, { headers: this.headers(accessToken) }));
  }

  publicSite(siteSlug: string): Observable<PublicWebsite> {
    return this.request(this.http.get<ApiResponse<PublicWebsite>>(`${this.base}/public/${encodeURIComponent(siteSlug)}`));
  }

  /** Teacher / student: the website of the institute they belong to. */
  institute(accessToken: string): Observable<{ website: ApiWebsite | null; instituteName: string; workType: WorkType }> {
    return this.request(this.http.get<ApiResponse<{ website: ApiWebsite | null; instituteName: string; workType: WorkType }>>(`${this.base}/institute`, { headers: this.headers(accessToken) }));
  }

  /** All published coaching centres and schools, for the platform landing page. */
  directory(): Observable<DirectoryEntry[]> {
    return this.request(this.http.get<ApiResponse<DirectoryEntry[]>>(`${this.base}/public`));
  }

  /** The website whose custom domain is `host` (set by the Super Admin). */
  byDomain(host: string): Observable<{ siteSlug: string }> {
    return this.request(this.http.get<ApiResponse<{ siteSlug: string }>>(`${this.base}/public/domain`, { params: { host } }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}
