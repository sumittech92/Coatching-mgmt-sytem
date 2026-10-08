import { Component } from '@angular/core';
import { ShopMockDataService, ShopProduct } from '../core/shop-mock-data.service';
interface BillLine { product: ShopProduct; quantity: number; }
@Component({selector:'app-shop-billing',templateUrl:'./shop-billing.component.html',styleUrls:['./shop-billing.component.scss']})
export class ShopBillingComponent {
  customer=''; selectedId=''; quantity=1; discount=0; paymentMode='UPI'; note=''; lines:BillLine[]=[]; today=new Date(); feedback='';
  constructor(public data:ShopMockDataService) {}
  get subtotal():number{return this.lines.reduce((sum,line)=>sum+line.product.price*line.quantity,0);}
  get total():number{return Math.max(0,this.subtotal-(Number(this.discount)||0));}
  get availableProducts():ShopProduct[]{return this.data.products.filter(p=>p.status==='Active'&&p.stock>0);}
  addLine():void{const product=this.data.products.find(p=>String(p.id)===this.selectedId);if(!product)return;const qty=Math.max(1,Number(this.quantity)||1);const existing=this.lines.find(line=>line.product.id===product.id);if((existing?.quantity||0)+qty>product.stock){this.feedback='Only '+product.stock+' pieces are available for '+product.name+'.';return;}if(existing)existing.quantity+=qty;else this.lines.push({product,quantity:qty});this.feedback='';this.selectedId='';this.quantity=1;}
  removeLine(line:BillLine):void{this.lines=this.lines.filter(item=>item!==line);}
  printBill():void{if(!this.lines.length){this.feedback='Add at least one item to the bill.';return;}window.print();}
  finishSale():void{if(!this.lines.length){this.feedback='Add at least one item to complete the sale.';return;}for(const line of this.lines)line.product.stock=Math.max(0,line.product.stock-line.quantity);this.data.orders.unshift({id:'AT-'+Date.now().toString().slice(-5),customer:this.customer||'Walk-in customer',date:new Date().toLocaleDateString('en-IN'),items:this.lines.reduce((sum,l)=>sum+l.quantity,0),total:this.total,payment:this.paymentMode,status:'Delivered'});this.feedback='Sale saved to the demo order list.';this.lines=[];this.customer='';this.discount=0;}
}
