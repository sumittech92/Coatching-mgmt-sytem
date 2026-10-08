import { Component } from '@angular/core';
import { ShopMockDataService } from '../core/shop-mock-data.service';
@Component({selector:'app-shop-dashboard',templateUrl:'./shop-dashboard.component.html',styleUrls:['./shop-dashboard.component.scss']})
export class ShopDashboardComponent {
  readonly today = new Date();
  readonly weekly = [{day:'Mon',sales:42,orders:32},{day:'Tue',sales:57,orders:43},{day:'Wed',sales:48,orders:35},{day:'Thu',sales:74,orders:51},{day:'Fri',sales:65,orders:46},{day:'Sat',sales:95,orders:75},{day:'Sun',sales:81,orders:64}];
  constructor(public data:ShopMockDataService){}
  get lowStock(): number {return this.data.products.filter(product=>product.stock<8).length;}
  get pendingOrders(): number {return this.data.orders.filter(order=>['Pending','Confirmed','Packed'].includes(order.status)).length;}
}
