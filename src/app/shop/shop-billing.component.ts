import { Component } from '@angular/core';
import { ShopMockDataService, ShopProduct } from '../core/shop-mock-data.service';
import { ToastService } from '../core/toast.service';
interface BillLine { product: ShopProduct; quantity: number; }
@Component({selector:'app-shop-billing',templateUrl:'./shop-billing.component.html',styleUrls:['./shop-billing.component.scss']})
export class ShopBillingComponent {
  customer=''; selectedId=''; quantity=1; discount=0; paymentMode='UPI'; note=''; lines:BillLine[]=[]; today=new Date(); feedback='';
  constructor(public data:ShopMockDataService,private toast:ToastService) {}
  get subtotal():number{return this.lines.reduce((sum,line)=>sum+line.product.price*line.quantity,0);}
  get total():number{return Math.max(0,this.subtotal-(Number(this.discount)||0));}
  get availableProducts():ShopProduct[]{return this.data.products.filter(p=>p.status==='Active'&&p.stock>0);}
  get selectedProduct():ShopProduct|undefined{return this.data.products.find(p=>String(p.id)===this.selectedId);}
  /** Shows the problem inline and as an error toast. */
  private fail(message:string):void{this.feedback=message;this.toast.error(message);}
  addLine():void{const product=this.selectedProduct;if(!product){this.fail('Choose a product to add to the bill.');return;}const qty=Number(this.quantity);if(!Number.isInteger(qty)||qty<1){this.fail('Quantity must be a whole number of at least 1.');return;}const existing=this.lines.find(line=>line.product.id===product.id);if((existing?.quantity||0)+qty>product.stock){this.fail('Only '+product.stock+' piece'+(product.stock===1?' is':'s are')+' available for '+product.name+(existing?' ('+existing.quantity+' already on the bill)':'')+'.');return;}if(existing)existing.quantity+=qty;else this.lines.push({product,quantity:qty});this.toast.success(product.name+' × '+qty+' added to the bill.');this.feedback='';this.selectedId='';this.quantity=1;}
  removeLine(line:BillLine):void{this.lines=this.lines.filter(item=>item!==line);this.toast.info(line.product.name+' removed from the bill.');}
  private discountError():string{const d=Number(this.discount)||0;return d<0?'Discount cannot be negative.':d>this.subtotal?'Discount cannot be more than the subtotal (₹'+this.subtotal.toLocaleString('en-IN')+').':'';}
  printBill():void{if(!this.lines.length){this.fail('Add at least one item to the bill.');return;}const error=this.discountError();if(error){this.fail(error);return;}window.print();}
  finishSale():void{if(!this.lines.length){this.fail('Your cart is empty — add at least one item to complete the sale.');return;}const error=this.discountError();if(error){this.fail(error);return;}const short=this.lines.find(line=>line.quantity>line.product.stock);if(short){this.fail('Only '+short.product.stock+' pieces of '+short.product.name+' are left. Update the quantity.');return;}const total=this.total;for(const line of this.lines)line.product.stock=Math.max(0,line.product.stock-line.quantity);this.data.orders.unshift({id:'AT-'+Date.now().toString().slice(-5),customer:this.customer||'Walk-in customer',date:new Date().toLocaleDateString('en-IN'),items:this.lines.reduce((sum,l)=>sum+l.quantity,0),total,payment:this.paymentMode,status:'Delivered'});this.feedback='';this.toast.success('Sale completed · ₹'+total.toLocaleString('en-IN')+' via '+this.paymentMode+'.');this.lines=[];this.customer='';this.discount=0;this.note='';}
}
