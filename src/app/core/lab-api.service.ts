import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiClient } from './api-client';

export type ApiLabType = 'science' | 'physics' | 'chemistry' | 'biology' | 'computer' | 'language' | 'other';
export const LAB_TYPE_LABELS: Record<ApiLabType, string> = { science: 'Science', physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', computer: 'Computer', language: 'Language', other: 'Other' };
export type ApiEquipmentCondition = 'working' | 'damaged' | 'underRepair';
export const EQUIPMENT_CONDITION_LABELS: Record<ApiEquipmentCondition, string> = { working: 'Working', damaged: 'Damaged', underRepair: 'Under repair' };

export interface ApiLab {
  _id: string; labCode: string; name: string; type: ApiLabType; room: string | null; inChargeCode: string | null; inChargeName: string | null;
  capacity: number | null; description: string | null; status: 'active' | 'inactive'; equipmentCount: number; needsAttention: number;
}
export interface LabPayload { name: string; type: ApiLabType; room: string | null; inChargeCode: string | null; capacity: number | null; description: string | null; status: 'active' | 'inactive'; }

export interface ApiLabEquipment {
  _id: string; equipmentCode: string; labCode: string | null; labName: string; name: string; quantity: number;
  condition: ApiEquipmentCondition; purchaseDate: string | null; note: string | null; status: 'active' | 'inactive';
}
export interface EquipmentPayload { labCode: string; name: string; quantity: number; condition: ApiEquipmentCondition; purchaseDate: string | null; note: string | null; status: 'active' | 'inactive'; }

/** Client for crm-backend /lab (owners change, teachers read). */
@Injectable({ providedIn: 'root' })
export class LabApiService extends ApiClient<ApiLab, LabPayload> {
  protected readonly path = 'lab';
  constructor(http: HttpClient) { super(http); }
}

/** Client for crm-backend /lab/equipment. */
@Injectable({ providedIn: 'root' })
export class LabEquipmentApiService extends ApiClient<ApiLabEquipment, EquipmentPayload> {
  protected readonly path = 'lab/equipment';
  constructor(http: HttpClient) { super(http); }
}
