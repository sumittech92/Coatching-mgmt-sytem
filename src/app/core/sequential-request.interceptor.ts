import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, Subscription, finalize } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Sends crm-backend calls one at a time: each request starts only after the previous one has finished
 * (success, error or cancel), so a page that needs several lists never fires them all at the same moment.
 * Callers keep using forkJoin / subscribe as before; only the timing changes.
 */
@Injectable()
export class SequentialRequestInterceptor implements HttpInterceptor {
  /** Resolves when the last queued request has finished. */
  private tail: Promise<void> = Promise.resolve();

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Writing a mock paper takes a minute or more; it runs alongside so the page doesn't freeze waiting behind it.
    if (!request.url.startsWith(environment.apiUrl) || /\/mock-paper(s)?\/generate$/.test(request.url)) return next.handle(request);
    return new Observable<HttpEvent<unknown>>(subscriber => {
      let release!: () => void;
      const done = new Promise<void>(resolve => release = resolve);
      const previous = this.tail;
      this.tail = previous.then(() => done);
      let cancelled = false;
      let inner: Subscription | undefined;
      previous.then(() => {
        // Cancelled while waiting its turn (e.g. the page was left): skip it and let the next one go.
        if (cancelled) { release(); return; }
        inner = next.handle(request).pipe(finalize(release)).subscribe(subscriber);
      });
      return () => { cancelled = true; inner?.unsubscribe(); };
    });
  }
}
