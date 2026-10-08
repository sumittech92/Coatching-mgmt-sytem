import { Component, EventEmitter, Input, Output } from '@angular/core';
export interface TableColumn { key: string; label: string; }
@Component({ selector: 'app-data-table', template: '<div class="table-responsive"><table mat-table [dataSource]="rows" class="w-100"><ng-container *ngFor="let column of columns" [matColumnDef]="column.key"><th mat-header-cell *matHeaderCellDef>{{column.label}}</th><td mat-cell *matCellDef="let row">{{valueFor(row, column.key)}}</td></ng-container><tr mat-header-row *matHeaderRowDef="columnKeys"></tr><tr mat-row *matRowDef="let row; columns: columnKeys"></tr><tr class="mat-row" *matNoDataRow><td class="mat-cell empty-cell" [attr.colspan]="columns.length">{{emptyMessage}}</td></tr></table></div><mat-paginator *ngIf="paginate" [length]="total" [pageSize]="pageSize" [pageSizeOptions]="pageSizeOptions" (page)="pageChange.emit($event)" aria-label="Table pages"></mat-paginator>', styles: [':host{display:block}th{font-size:.68rem;font-weight:700;color:#8c98a7}td{font-size:.8rem;color:#435166}.empty-cell{text-align:center;padding:30px;color:#8995a3}'] })
export class DataTableComponent {
  @Input() rows: Record<string, unknown>[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() paginate = true;
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions = [10, 25, 50];
  @Input() emptyMessage = 'No records to display.';
  @Output() pageChange = new EventEmitter<unknown>();
  get columnKeys(): string[] { return this.columns.map(column => column.key); }
  valueFor(row: Record<string, unknown>, path: string): unknown { return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, row) ?? '—'; }
}
