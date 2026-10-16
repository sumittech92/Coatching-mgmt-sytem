import { Injectable } from '@angular/core';
import { TenantContextService } from './tenant-context.service';
import { WebsiteContentService } from './website-content.service';

export type WhatsAppKind = 'reminder' | 'receipt';
export interface WhatsAppLogEntry { key: string; kind: WhatsAppKind; to: string; sentOn: string; }
/** Fields needed to write a fee message (matches the Fees page record). */
export interface FeeMessageData { studentId: string; student: string; month: string; total: number; discount: number; paid: number; due: number; date: string; mode: string; status: string; receiptNo?: string; }

const STORAGE_KEY = 'demo-whatsapp-log';

/**
 * Click-to-send WhatsApp (no backend): builds a wa.me link with the message filled in and opens it,
 * so the office sends it from the WhatsApp account signed in on that device. Keeps a log of what was sent.
 * Later, the backend (WhatsApp Business API) can replace open() with an automatic send.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private log: WhatsAppLogEntry[] = this.load();

  constructor(private tenant: TenantContextService, private content: WebsiteContentService) {}

  /** 10-digit Indian mobile, or '' when the number can't receive WhatsApp. */
  static mobile(phone: string | undefined): string {
    const digits = String(phone || '').replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
  }
  static link(mobile: string, text: string): string { return `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`; }

  get institute(): string { return this.tenant.current.businessName || this.content.profile.settings['name']; }
  get officePhone(): string { return this.content.phone; }

  reminderText(fee: FeeMessageData): string {
    const school = this.tenant.isSchool;
    return [
      `Dear ${fee.student},`,
      ``,
      `This is a ${fee.status === 'Overdue' ? 'final ' : ''}reminder from ${this.institute}. Your ${school ? 'term' : 'monthly'} fee for *${fee.month}* is ${fee.status === 'Overdue' ? '*overdue*' : 'pending'}.`,
      ``,
      `Total fee: ₹${this.money(fee.total - fee.discount)}`,
      `Paid so far: ₹${this.money(fee.paid)}`,
      `*Amount due: ₹${this.money(fee.due)}*`,
      ``,
      `Please pay from the Fees page in your student portal (UPI, card or bank transfer) or at the ${school ? 'school' : 'institute'} office.`,
      `If you have already paid, please ignore this message.`,
      ``,
      `${this.institute}`,
      `Call / WhatsApp: ${this.officePhone}`
    ].join('\n');
  }

  receiptText(fee: FeeMessageData): string {
    return [
      `Payment received ✅`,
      ``,
      `Dear ${fee.student}, thank you. We have received your fee payment.`,
      ``,
      ...(fee.receiptNo ? [`Receipt no.: ${fee.receiptNo}`] : []),
      `Student ID: ${fee.studentId}`,
      `${this.tenant.isSchool ? 'Term' : 'Fee month'}: ${fee.month}`,
      `*Amount paid: ₹${this.money(fee.paid)}*`,
      `Payment date: ${fee.date}`,
      `Payment method: ${fee.mode}`,
      fee.due > 0 ? `Balance due: ₹${this.money(fee.due)}` : `Balance due: Nil – fully paid`,
      ``,
      `You can view and print this receipt from the Fees page in your student portal.`,
      ``,
      `${this.institute}`,
      `Call / WhatsApp: ${this.officePhone}`
    ].join('\n');
  }

  /** Opens WhatsApp with the message ready and records it. Returns false when the number is not a valid mobile. */
  send(kind: WhatsAppKind, key: string, phone: string | undefined, text: string): boolean {
    const mobile = WhatsAppService.mobile(phone);
    if (!mobile) return false;
    window.open(WhatsAppService.link(mobile, text), '_blank', 'noopener');
    this.log = this.log.filter(entry => !(entry.key === key && entry.kind === kind));
    this.log.unshift({ key, kind, to: mobile, sentOn: new Date().toISOString() });
    this.save();
    return true;
  }

  lastSent(kind: WhatsAppKind, key: string): WhatsAppLogEntry | undefined { return this.log.find(entry => entry.kind === kind && entry.key === key); }
  sentToday(kind: WhatsAppKind, key: string): boolean { const entry = this.lastSent(kind, key); return !!entry && new Date(entry.sentOn).toDateString() === new Date().toDateString(); }
  /** e.g. "Today, 10:42 am" or "14 Oct 2026". */
  static when(entry: WhatsAppLogEntry): string {
    const date = new Date(entry.sentOn);
    return date.toDateString() === new Date().toDateString()
      ? `Today, ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private money(value: number): string { return Math.max(0, value).toLocaleString('en-IN'); }
  private load(): WhatsAppLogEntry[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
  private save(): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.log.slice(0, 500))); } catch { /* storage unavailable: keep in memory */ } }
}
