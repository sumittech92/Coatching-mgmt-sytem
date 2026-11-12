import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';
import { resizeImageFile } from './image-file';

export type ApiPostType = 'image' | 'video' | 'text' | 'announcement';
export const POST_TYPE_LABELS: Record<ApiPostType, string> = { image: 'Image', video: 'Video', text: 'Text', announcement: 'Announcement' };
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';

/** A post as crm-backend returns it. `state` is draft / scheduled (future publish date) / live. */
export interface ApiPost {
  _id: string; postCode: string; workType: 'school' | 'coaching'; authorName: string | null;
  title: string; description: string; type: ApiPostType; imageUrl: string | null; videoLink: string | null;
  publishDate: string; pinned: boolean; showOnWebsite: boolean; status: 'published' | 'draft';
  state: 'draft' | 'scheduled' | 'live'; canManage: boolean;
}
export interface PostPayload {
  title: string; description: string; type: ApiPostType; imageUrl?: string | null; videoLink?: string | null;
  publishDate?: string | null; pinned: boolean; showOnWebsite?: boolean; status: 'published' | 'draft';
}

export interface ApiAlbumItem { _id: string; kind: 'image' | 'video'; url: string; caption: string | null; size: number | null; }
/** A gallery album: photos (uploaded) and video links, one photo as the cover. */
export interface ApiAlbum {
  _id: string; albumCode: string; workType: 'school' | 'coaching'; name: string; description: string | null; date: string;
  items: ApiAlbumItem[]; coverItemId: string | null; coverUrl: string | null; showOnWebsite: boolean; status: 'published' | 'draft'; canManage: boolean;
}
export interface AlbumPayload { name: string; description?: string | null; date?: string | null; coverItemId?: string | null; showOnWebsite?: boolean; status: 'published' | 'draft'; }
export interface AlbumItemInput { kind: 'image' | 'video'; url: string; caption?: string | null; size?: number | null; }

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /post, /gallery and /upload/media. */
@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  posts(token: string): Observable<ApiPost[]> { return this.request(this.http.get<ApiResponse<ApiPost[]>>(`${this.api}/post`, { headers: this.headers(token) })); }
  createPost(token: string, payload: PostPayload): Observable<ApiPost> { return this.request(this.http.post<ApiResponse<ApiPost>>(`${this.api}/post/create`, payload, { headers: this.headers(token) })); }
  updatePost(token: string, postCode: string, payload: Partial<PostPayload>): Observable<ApiPost> { return this.request(this.http.patch<ApiResponse<ApiPost>>(`${this.api}/post/${postCode}`, payload, { headers: this.headers(token) })); }
  removePost(token: string, postCode: string): Observable<unknown> { return this.request(this.http.delete<ApiResponse<unknown>>(`${this.api}/post/${postCode}`, { headers: this.headers(token) })); }

  albums(token: string): Observable<ApiAlbum[]> { return this.request(this.http.get<ApiResponse<ApiAlbum[]>>(`${this.api}/gallery`, { headers: this.headers(token) })); }
  createAlbum(token: string, payload: AlbumPayload): Observable<ApiAlbum> { return this.request(this.http.post<ApiResponse<ApiAlbum>>(`${this.api}/gallery/create`, payload, { headers: this.headers(token) })); }
  updateAlbum(token: string, albumCode: string, payload: Partial<AlbumPayload>): Observable<ApiAlbum> { return this.request(this.http.patch<ApiResponse<ApiAlbum>>(`${this.api}/gallery/${albumCode}`, payload, { headers: this.headers(token) })); }
  removeAlbum(token: string, albumCode: string): Observable<unknown> { return this.request(this.http.delete<ApiResponse<unknown>>(`${this.api}/gallery/${albumCode}`, { headers: this.headers(token) })); }
  addItems(token: string, albumCode: string, items: AlbumItemInput[]): Observable<ApiAlbum> { return this.request(this.http.post<ApiResponse<ApiAlbum>>(`${this.api}/gallery/${albumCode}/items`, { items }, { headers: this.headers(token) })); }
  removeItem(token: string, albumCode: string, itemId: string): Observable<ApiAlbum> { return this.request(this.http.delete<ApiResponse<ApiAlbum>>(`${this.api}/gallery/${albumCode}/items/${itemId}`, { headers: this.headers(token) })); }

  /** Resizes the photo in the browser (max 1600 px) and uploads it; returns its public URL. */
  uploadPhoto(token: string, file: File): Observable<{ url: string; size: number }> {
    return from(resizeImageFile(file)).pipe(switchMap(resized => {
      if (resized.size > MAX_PHOTO_BYTES) return throwError(() => new Error(`“${file.name}” is larger than 5 MB.`));
      const form = new FormData();
      form.append('file', resized, resized.name);
      return this.request(this.http.post<ApiResponse<{ url: string; size: number }>>(`${this.api}/upload/media`, form, { headers: this.headers(token) }));
    }));
  }

  private headers(token: string): HttpHeaders { return new HttpHeaders({ accesstoken: token }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse | Error) => throwError(() => error instanceof HttpErrorResponse ? new Error(AuthApiService.messageFor(error)) : error))
    );
  }
}
