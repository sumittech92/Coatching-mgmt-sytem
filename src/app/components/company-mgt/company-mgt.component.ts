import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CategoryAdddeptComponent } from './category-adddept/category-adddept.component';
import { CategoryAddbrandComponent } from './category-addbrand/category-addbrand.component';
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
    constructor(private dialog: MatDialog) { }
  
  dept() {
      this.dialog.open(CategoryAdddeptComponent, {
        height: '600px',
        width: '600px',
      })
    }
    brand() {
      this.dialog.open(CategoryAddbrandComponent, {
        height: '600px',
        width: '600px',
      })
    }
}

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
  {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
  {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
  {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
  {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
]
