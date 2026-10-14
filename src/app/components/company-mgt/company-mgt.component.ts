import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CategoryAdddeptComponent, DepartmentRecord } from './category-adddept/category-adddept.component';
import { BrandRecord, CategoryAddbrandComponent } from './category-addbrand/category-addbrand.component';
import { RecordDialogComponent, RecordField } from '../../client/management/record-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { ToastService } from '../../core/toast.service';
// import { CommonModule } from '@angular/common';
// import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-company-mgt',
  // imports: [CommonModule,MatTabsModule],
  templateUrl: './company-mgt.component.html',
  styleUrl: './company-mgt.component.scss'
})
export class CompanyMgtComponent {
displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  displayedColumns2: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource2 = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  displayedColumns3: string[] = ['position', 'name', 'symbol'];
  dataSource3 = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
displayedColumns4: string[] = ['position', 'name','weight', 'symbol'];
  dataSource4 = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  displayedColumns5: string[] = ['position', 'name','weight', 'status','symbol'];
  dataSource5 = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
    constructor(private dialog: MatDialog, private confirm: ConfirmationDialogService, private toast: ToastService) { }
  private readonly dialogSize = { width: '600px', maxWidth: 'calc(100vw - 24px)' };
  private departments: string[] = [];

  dept() {
    this.dialog.open(CategoryAdddeptComponent, this.dialogSize).afterClosed().subscribe((value?: DepartmentRecord) => {
      if (!value) return;
      this.departments.push(value.name);
      this.dataSource.data = [{ position: value.name, name: value.code, weight: 'Active', symbol: '' }, ...this.dataSource.data];
    });
  }
  brand() {
    this.dialog.open(CategoryAddbrandComponent, { ...this.dialogSize, data: { departments: this.departments } }).afterClosed().subscribe((value?: BrandRecord) => {
      if (!value) return;
      this.dataSource2.data = [{ position: value.name, name: 'Active', weight: value.description || '—', symbol: '' }, ...this.dataSource2.data];
    });
  }
  /** Simple one-field add for the product type / capacity pack / vehicle type tabs. */
  addSimple(kind: 'Product type' | 'Capacity pack' | 'Vehicle type') {
    const fields: RecordField[] = kind === 'Product type' ? [{ key: 'name', label: 'Product type', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }]
      : kind === 'Capacity pack' ? [{ key: 'name', label: 'Unit name', required: true }, { key: 'measure', label: 'Measurement type', type: 'select', options: ['Weight', 'Volume', 'Count', 'Length'], required: true }]
      : [{ key: 'name', label: 'Vehicle type', required: true }, { key: 'capacity', label: 'Max capacity (kg)', type: 'number', required: true }];
    this.dialog.open(RecordDialogComponent, { ...this.dialogSize, data: { title: 'Add ' + kind.toLowerCase(), submitLabel: 'Add ' + kind.toLowerCase(), fields, record: { status: 'Active' }, successMessage: kind + ' added.' } }).afterClosed().subscribe(value => {
      if (!value) return;
      if (kind === 'Product type') this.dataSource3.data = [{ position: value.name, name: value.status, weight: 0, symbol: '' }, ...this.dataSource3.data];
      if (kind === 'Capacity pack') this.dataSource4.data = [{ position: value.name, name: value.measure, weight: 'Active', symbol: '' }, ...this.dataSource4.data];
      if (kind === 'Vehicle type') this.dataSource5.data = [...this.dataSource5.data, { position: this.dataSource5.data.length + 1, name: value.name, weight: Number(value.capacity), symbol: '' }];
    });
  }
  remove(source: MatTableDataSource<PeriodicElement>, row: PeriodicElement, kind: string) {
    this.confirm.confirm({ title: `Delete ${kind}?`, message: `This ${kind} will be removed from the list.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      source.data = source.data.filter(item => item !== row);
      this.toast.success(kind.charAt(0).toUpperCase() + kind.slice(1) + ' deleted.');
    });
  }
}

export interface PeriodicElement {
  name: string;
  position: number | string;
  weight: number | string;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
  {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
  {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
  {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
  {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
]
