import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ApiAlbum, ApiAlbumItem, MediaApiService, PHOTO_ACCEPT } from '../../core/media-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';

export interface AlbumDialogData { album: ApiAlbum; }
const MAX_ITEMS = 50;

/** Photos and video links of one album: add many photos at once, add a video link, choose the cover, remove items. */
@Component({ selector: 'app-album-dialog', templateUrl: './album-dialog.component.html', styleUrls: ['./album-dialog.component.scss'] })
export class AlbumDialogComponent {
  readonly accept = PHOTO_ACCEPT;
  album: ApiAlbum;
  videoLink = '';
  uploading = 0;
  uploaded = 0;
  busy = false;

  constructor(@Inject(MAT_DIALOG_DATA) data: AlbumDialogData, private media: MediaApiService, private auth: MockAuthService, private toast: ToastService, private confirm: ConfirmationDialogService, private ref: MatDialogRef<AlbumDialogComponent, ApiAlbum>) {
    this.album = data.album;
  }

  get canManage(): boolean { return this.album.canManage; }
  get room(): number { return MAX_ITEMS - this.album.items.length; }
  isCover(item: ApiAlbumItem): boolean { return item._id === this.album.coverItemId; }

  /** Uploads the chosen photos one by one (resized in the browser), then adds them to the album together. */
  async addPhotos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    if (files.length > this.room) { this.toast.error(`This album has room for ${this.room} more photo${this.room === 1 ? '' : 's'}.`); return; }
    const token = this.auth.token!;
    this.uploading = files.length; this.uploaded = 0;
    const items: { kind: 'image'; url: string; size: number; caption: string }[] = [];
    const failed: string[] = [];
    for (const file of files) {
      try {
        if (!file.type.startsWith('image/')) throw new Error('not a photo');
        const result = await firstValueFrom(this.media.uploadPhoto(token, file));
        items.push({ kind: 'image', url: result.url, size: result.size, caption: '' });
      } catch {
        failed.push(file.name);
      }
      this.uploaded++;
    }
    this.uploading = 0;
    if (failed.length) this.toast.error(`Could not upload: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? ` and ${failed.length - 3} more` : ''}. Use JPG, PNG, WebP or GIF up to 5 MB.`);
    if (!items.length) return;
    try {
      this.album = await firstValueFrom(this.media.addItems(token, this.album.albumCode, items));
      this.toast.success(`${items.length} photo${items.length === 1 ? '' : 's'} added to “${this.album.name}”.`);
    } catch (error) { this.toast.error((error as Error).message); }
  }

  addVideo(): void {
    const link = this.videoLink.trim();
    if (!/^https?:\/\//i.test(link)) { this.toast.error('Paste a video link starting with https:// (YouTube, Google Drive, Vimeo).'); return; }
    this.busy = true;
    this.media.addItems(this.auth.token!, this.album.albumCode, [{ kind: 'video', url: link }]).subscribe({
      next: album => { this.busy = false; this.album = album; this.videoLink = ''; this.toast.success('Video link added.'); },
      error: (error: Error) => { this.busy = false; this.toast.error(error.message); }
    });
  }

  makeCover(item: ApiAlbumItem): void {
    this.media.updateAlbum(this.auth.token!, this.album.albumCode, { coverItemId: item._id }).subscribe({
      next: album => { this.album = album; this.toast.success('Cover photo updated.'); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }

  remove(item: ApiAlbumItem): void {
    this.confirm.confirm({ title: `Remove this ${item.kind === 'image' ? 'photo' : 'video'}?`, message: 'It is removed from the album and cannot be restored.', confirmLabel: 'Remove', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.media.removeItem(this.auth.token!, this.album.albumCode, item._id).subscribe({
        next: album => { this.album = album; this.toast.success('Removed from the album.'); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  open(item: ApiAlbumItem): void { window.open(item.url, '_blank', 'noopener'); }
  close(): void { this.ref.close(this.album); }
}
