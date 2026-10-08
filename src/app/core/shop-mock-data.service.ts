import { Injectable } from "@angular/core";
export interface ShopProduct {
  id: number;
  name: string;
  category: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  discount: number;
  stock: number;
  stockIn: number;
  stockOut: number;
  status: "Active" | "Inactive";
  image: string;
}
export interface ShopOrder {
  id: string;
  customer: string;
  date: string;
  items: number;
  total: number;
  status: "Pending" | "Confirmed" | "Packed" | "Delivered" | "Cancelled";
  payment: string;
}
@Injectable({ providedIn: "root" })
export class ShopMockDataService {
  store = {
    name: "Atelier & Co.",
    type: "Clothing & accessories",
    phone: "+91 98450 12345",
    email: "studio@atelier.co",
    address: "Koregaon Park, Pune",
    currency: "INR · Indian Rupee",
  };
  products: ShopProduct[] = [
    {
      id: 1,
      name: "Linen Everyday Shirt",
      category: "Tops",
      sku: "AT-TOP-001",
      size: "S · M · L · XL",
      color: "Sage green",
      price: 2490,
      discount: 10,
      stock: 28,
      stockIn: 36,
      stockOut: 8,
      status: "Active",
      image: "assets/images/top-products/01.png",
    },
    {
      id: 2,
      name: "Classic Tailored Trousers",
      category: "Bottoms",
      sku: "AT-BTM-014",
      size: "28 · 30 · 32 · 34",
      color: "Sand",
      price: 3290,
      discount: 0,
      stock: 16,
      stockIn: 22,
      stockOut: 6,
      status: "Active",
      image: "assets/images/top-products/02.png",
    },
    {
      id: 3,
      name: "Soft Cotton Knit",
      category: "Knitwear",
      sku: "AT-KNT-008",
      size: "S · M · L",
      color: "Oatmeal",
      price: 2890,
      discount: 15,
      stock: 7,
      stockIn: 18,
      stockOut: 11,
      status: "Active",
      image: "assets/images/top-products/03.png",
    },
    {
      id: 4,
      name: "Relaxed Weekend Dress",
      category: "Dresses",
      sku: "AT-DRS-021",
      size: "XS · S · M · L",
      color: "Terracotta",
      price: 4190,
      discount: 10,
      stock: 4,
      stockIn: 12,
      stockOut: 8,
      status: "Active",
      image: "assets/images/top-products/04.png",
    },
    {
      id: 5,
      name: "Canvas Market Tote",
      category: "Accessories",
      sku: "AT-ACC-002",
      size: "One size",
      color: "Natural",
      price: 990,
      discount: 0,
      stock: 42,
      stockIn: 48,
      stockOut: 6,
      status: "Active",
      image: "assets/images/top-products/05.png",
    },
    {
      id: 6,
      name: "Lightweight Summer Scarf",
      category: "Accessories",
      sku: "AT-ACC-019",
      size: "One size",
      color: "Indigo",
      price: 1290,
      discount: 0,
      stock: 0,
      stockIn: 8,
      stockOut: 8,
      status: "Inactive",
      image: "assets/images/top-products/06.png",
    },
  ];
  orders: ShopOrder[] = [
    {
      id: "AT-2084",
      customer: "Mira Shah",
      date: "Today · 11:24 am",
      items: 2,
      total: 5780,
      status: "Pending",
      payment: "UPI",
    },
    {
      id: "AT-2083",
      customer: "Ishaan Mehta",
      date: "Today · 10:16 am",
      items: 1,
      total: 2490,
      status: "Confirmed",
      payment: "Card",
    },
    {
      id: "AT-2082",
      customer: "Rhea Kapoor",
      date: "Today · 9:42 am",
      items: 3,
      total: 8370,
      status: "Packed",
      payment: "UPI",
    },
    {
      id: "AT-2081",
      customer: "Dev Malhotra",
      date: "Yesterday",
      items: 2,
      total: 4280,
      status: "Delivered",
      payment: "Cash",
    },
    {
      id: "AT-2080",
      customer: "Tara Nair",
      date: "Yesterday",
      items: 1,
      total: 3290,
      status: "Cancelled",
      payment: "Bank Transfer",
    },
  ];
  customers = [
    { id: 1, name: "Mira Shah", phone: "+91 98200 11001", orders: 8, spent: 28450, due: 0, lastPurchase: "Today" },
    {
      id: 2,
      name: "Ishaan Mehta",
      phone: "+91 98200 11002",
      orders: 5,
      spent: 16980,
      due: 1250,
      lastPurchase: "Today",
    },
    { id: 3, name: "Rhea Kapoor", phone: "+91 98200 11003", orders: 12, spent: 45200, due: 0, lastPurchase: "Today" },
    {
      id: 4,
      name: "Dev Malhotra",
      phone: "+91 98200 11004",
      orders: 3,
      spent: 11240,
      due: 0,
      lastPurchase: "Yesterday",
    },
    {
      id: 5,
      name: "Tara Nair",
      phone: "+91 98200 11005",
      orders: 6,
      spent: 20700,
      due: 850,
      lastPurchase: "Yesterday",
    },
  ];
  categories = [
    {
      id: 1,
      name: "Tops",
      description: "Shirts, tees and everyday layers",
      products: 18,
      status: "Active",
      color: "#e9f3ed",
    },
    {
      id: 2,
      name: "Bottoms",
      description: "Trousers, skirts and relaxed fits",
      products: 12,
      status: "Active",
      color: "#f1ece4",
    },
    {
      id: 3,
      name: "Dresses",
      description: "Easy dresses for every occasion",
      products: 9,
      status: "Active",
      color: "#f5e9e4",
    },
    {
      id: 4,
      name: "Knitwear",
      description: "Soft layers, made to last",
      products: 8,
      status: "Active",
      color: "#e9edf4",
    },
    {
      id: 5,
      name: "Accessories",
      description: "Finishing touches and useful things",
      products: 15,
      status: "Active",
      color: "#f2efe2",
    },
  ];
  offers = [
    { id: 1, name: "End of season edit", discount: "20%", start: "2026-09-20", end: "2026-10-05", status: "Active" },
    { id: 2, name: "First order thank you", discount: "10%", start: "2026-09-01", end: "2026-12-31", status: "Active" },
    { id: 3, name: "Monsoon essentials", discount: "15%", start: "2026-08-01", end: "2026-08-31", status: "Expired" },
  ];
  addProduct(product: Omit<ShopProduct, "id">): void {
    this.products.unshift({ ...product, id: Date.now() });
  }
}
