import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
export interface ConfirmationDialogData { title: string; message: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; }
@Component({ selector: 'app-confirmation-dialog', template: '<h2 mat-dialog-title>{{data.title}}</h2><mat-dialog-content>{{data.message}}</mat-dialog-content><mat-dialog-actions align="end"><button mat-button (click)="dialogRef.close(false)">{{data.cancelLabel || \'Cancel\'}}</button><button mat-flat-button [color]="data.destructive ? \'warn\' : \'primary\'" (click)="dialogRef.close(true)">{{data.confirmLabel || \'Confirm\'}}</button></mat-dialog-actions>' })
export class ConfirmationDialogComponent { constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData, public dialogRef: MatDialogRef<ConfirmationDialogComponent>) {} }
