import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantContextService } from '../../core/tenant-context.service';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { RecordDialogComponent, RecordField } from '../management/record-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { ApiTeacher, TeacherApiService } from '../../core/teacher-api.service';
import { dayLabel, fromApiDay, isoDay } from '../../core/api-client';
import {
  ApiEquipmentCondition, ApiLab, ApiLabEquipment, ApiLabType, EQUIPMENT_CONDITION_LABELS, EquipmentPayload, LAB_TYPE_LABELS, LabApiService, LabEquipmentApiService, LabPayload
} from '../../core/lab-api.service';

type Status = '' | 'active' | 'inactive';
const invert = <T extends string>(labels: Record<T, string>): Record<string, T> => Object.fromEntries(Object.entries(labels).map(([value, label]) => [label, value])) as Record<string, T>;
const LAB_TYPE_VALUES = invert(LAB_TYPE_LABELS);
const CONDITION_VALUES = invert(EQUIPMENT_CONDITION_LABELS);
const text = (value: unknown): string | null => String(value ?? '').trim() || null;
const NO_TEACHER = 'Not assigned';

/** School Lab management: labs and their equipment in two tabs (owner edits, teachers view). */
@Component({ selector: 'app-labs-page', templateUrl: './labs-page.component.html', styleUrls: ['./labs-page.component.scss'] })
export class LabsPageComponent implements OnInit {
  tab = 0;
  loading = false;
  labs: ApiLab[] = [];
  equipment: ApiLabEquipment[] = [];
  teachers: ApiTeacher[] = [];
  // Filters (date range and status apply to the open tab).
  from: Date | null = null; to: Date | null = null; status: Status = '';
  labSearch = ''; equipmentSearch = ''; labFilter = ''; conditionFilter = '';
  labPage = { index: 0, size: 10 }; equipmentPage = { index: 0, size: 10 };
  readonly labColumns = ['position', 'name', 'room', 'inCharge', 'equipment', 'added', 'status', 'action'];
  readonly equipmentColumns = ['position', 'code', 'name', 'department', 'lab', 'quantity', 'condition', 'added', 'status', 'action'];
  readonly typeLabels = LAB_TYPE_LABELS;
  readonly conditionLabels = EQUIPMENT_CONDITION_LABELS;
  readonly conditions = Object.entries(EQUIPMENT_CONDITION_LABELS) as [ApiEquipmentCondition, string][];

  constructor(private route: ActivatedRoute, private router: Router, private tenant: TenantContextService, private dialog: MatDialog, private confirm: ConfirmationDialogService, public auth: MockAuthService, private toast: ToastService,
    private labApi: LabApiService, private equipmentApi: LabEquipmentApiService, private teacherApi: TeacherApiService) {}

  get canEdit(): boolean { return this.auth.role === 'Owner'; }
  private get token(): string | null { return this.auth.token; }

  ngOnInit(): void {
    // Labs are a school module.
    if (!this.tenant.isSchool) { this.router.navigateByUrl('/client/dashboard'); return; }
    this.route.queryParamMap.subscribe(params => this.tab = params.get('tab') === 'equipment' ? 1 : 0);
    this.load();
  }

  load(): void {
    const token = this.token;
    if (!token) return;
    this.loading = true;
    forkJoin({
      labs: this.labApi.list(token), equipment: this.equipmentApi.list(token),
      teachers: this.canEdit ? this.teacherApi.list(token) : of([] as ApiTeacher[])
    }).subscribe({
      next: result => { this.loading = false; this.labs = result.labs; this.equipment = result.equipment; this.teachers = result.teachers.filter(teacher => teacher.status !== 'inactive'); },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  // ---------------------------------------------------------------- Filters

  private inRange(createdAt: string): boolean {
    const day = isoDay(new Date(createdAt));
    return (!this.from || day >= isoDay(this.from)) && (!this.to || day <= isoDay(this.to));
  }
  get filteredLabs(): ApiLab[] {
    const q = this.labSearch.trim().toLowerCase();
    return this.labs.filter(lab => (!this.status || lab.status === this.status) && this.inRange(lab.createdAt)
      && (!q || `${lab.name} ${lab.room || ''} ${lab.inChargeName || ''} ${LAB_TYPE_LABELS[lab.type]}`.toLowerCase().includes(q)));
  }
  get filteredEquipment(): ApiLabEquipment[] {
    const q = this.equipmentSearch.trim().toLowerCase();
    return this.equipment.filter(item => (!this.status || item.status === this.status) && this.inRange(item.createdAt)
      && (!this.labFilter || item.labCode === this.labFilter) && (!this.conditionFilter || item.condition === this.conditionFilter)
      && (!q || `${item.equipmentCode} ${item.name} ${item.labName}`.toLowerCase().includes(q)));
  }
  get labRows(): ApiLab[] { return this.filteredLabs.slice(this.labPage.index * this.labPage.size, (this.labPage.index + 1) * this.labPage.size); }
  get equipmentRows(): ApiLabEquipment[] { return this.filteredEquipment.slice(this.equipmentPage.index * this.equipmentPage.size, (this.equipmentPage.index + 1) * this.equipmentPage.size); }
  resetPages(): void { this.labPage.index = 0; this.equipmentPage.index = 0; }
  clearFilters(): void { this.from = this.to = null; this.status = ''; this.labSearch = this.equipmentSearch = this.labFilter = this.conditionFilter = ''; this.resetPages(); }
  get hasFilters(): boolean { return !!(this.from || this.to || this.status || this.labSearch || this.equipmentSearch || this.labFilter || this.conditionFilter); }

  // Summary
  get activeLabs(): number { return this.labs.filter(lab => lab.status === 'active').length; }
  get totalItems(): number { return this.equipment.reduce((sum, item) => sum + item.quantity, 0); }
  get attention(): number { return this.equipment.filter(item => item.condition !== 'working').length; }

  // Helpers
  added(value: string): string { return dayLabel(value); }
  department(item: ApiLabEquipment): string { const lab = this.labs.find(entry => entry.labCode === item.labCode); return lab ? LAB_TYPE_LABELS[lab.type] : '—'; }
  conditionTone(condition: ApiEquipmentCondition): string { return condition === 'working' ? 'success' : condition === 'damaged' ? 'danger' : 'warning'; }
  private teacherLabel(teacher: ApiTeacher): string { return `${teacher.fullName || 'Teacher'} · ${teacher.teacherCode}`; }

  // ---------------------------------------------------------------- Labs

  private labFields(): RecordField[] {
    return [
      { key: 'name', label: 'Lab name', required: true, hint: 'e.g. Physics lab' },
      { key: 'type', label: 'Department', type: 'select', options: Object.values(LAB_TYPE_LABELS), required: true },
      { key: 'room', label: 'Location', hint: 'e.g. Block B, 1st floor' },
      { key: 'inCharge', label: 'Assigned to (in-charge)', type: 'select', options: [NO_TEACHER, ...this.teachers.map(teacher => this.teacherLabel(teacher))] },
      { key: 'capacity', label: 'Capacity (students)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
      { key: 'description', label: 'Description', type: 'textarea' }
    ];
  }
  private labRecord(lab: ApiLab): Record<string, unknown> {
    const teacher = this.teachers.find(item => item.teacherCode === lab.inChargeCode);
    return { name: lab.name, type: LAB_TYPE_LABELS[lab.type], room: lab.room || '', inCharge: teacher ? this.teacherLabel(teacher) : lab.inChargeName || NO_TEACHER, capacity: lab.capacity ?? '', status: lab.status === 'inactive' ? 'Inactive' : 'Active', description: lab.description || '', added: dayLabel(lab.createdAt) };
  }
  viewLab(lab: ApiLab): void {
    this.dialog.open(RecordDialogComponent, { width: '620px', maxWidth: 'calc(100vw - 24px)', data: { title: lab.name, submitLabel: 'Done', readonly: true, record: { ...this.labRecord(lab), equipment: `${lab.equipmentCount} items${lab.needsAttention ? ` · ${lab.needsAttention} need attention` : ''}` },
      fields: [...this.labFields(), { key: 'equipment', label: 'Equipment' }, { key: 'added', label: 'Added on' }] } });
  }
  openLab(lab?: ApiLab, draft?: Record<string, unknown>): void {
    const token = this.token;
    if (!token || !this.canEdit) return;
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: lab ? `Edit ${lab.name}` : 'Add new lab', submitLabel: lab ? 'Save changes' : 'Add lab', successMessage: '', fields: this.labFields(), record: draft || (lab ? this.labRecord(lab) : undefined) } })
      .afterClosed().subscribe((value?: Record<string, unknown>) => {
        if (!value) return;
        const capacity = value['capacity'] === '' || value['capacity'] == null ? null : Math.round(Number(value['capacity']));
        if (capacity !== null && !(capacity >= 1)) { this.toast.error('Capacity must be at least 1.'); this.openLab(lab, value); return; }
        const teacher = this.teachers.find(item => this.teacherLabel(item) === value['inCharge']);
        const payload: LabPayload = {
          name: String(value['name']), type: (LAB_TYPE_VALUES[String(value['type'])] || 'other') as ApiLabType, room: text(value['room']),
          inChargeCode: teacher?.teacherCode ?? (value['inCharge'] === NO_TEACHER ? null : lab?.inChargeCode ?? null), capacity, description: text(value['description']),
          status: value['status'] === 'Inactive' ? 'inactive' : 'active'
        };
        (lab ? this.labApi.update(token, lab.labCode, payload) : this.labApi.create(token, payload)).subscribe({
          next: saved => { this.labs = lab ? this.labs.map(item => item.labCode === saved.labCode ? saved : item) : [saved, ...this.labs]; this.toast.success(`Lab “${saved.name}” ${lab ? 'updated' : 'added'}.`); },
          error: (error: Error) => { this.toast.error(error.message); this.openLab(lab, value); }
        });
      });
  }
  toggleLab(lab: ApiLab): void {
    const token = this.token;
    if (!token || !this.canEdit) return;
    const next = lab.status === 'active' ? 'inactive' : 'active';
    this.labApi.update(token, lab.labCode, { status: next }).subscribe({
      next: saved => { Object.assign(lab, saved); this.toast.success(`${lab.name} is now ${next}.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  removeLab(lab: ApiLab): void {
    const token = this.token;
    if (!token || !this.canEdit) return;
    if (lab.equipmentCount) { this.toast.warning(`Remove or move the ${lab.equipmentCount} equipment item${lab.equipmentCount === 1 ? '' : 's'} in ${lab.name} first.`); return; }
    this.confirm.confirm({ title: 'Delete lab?', message: `Delete “${lab.name}”? This cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.labApi.remove(token, lab.labCode).subscribe({
        next: () => { this.labs = this.labs.filter(item => item !== lab); this.toast.success(`Lab “${lab.name}” deleted.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  showEquipment(lab: ApiLab): void { this.labFilter = lab.labCode; this.equipmentPage.index = 0; this.tab = 1; }

  // ---------------------------------------------------------------- Equipment

  private equipmentFields(): RecordField[] {
    return [
      { key: 'lab', label: 'Assigned lab', type: 'select', options: this.labs.map(lab => lab.name), required: true },
      { key: 'name', label: 'Equipment', required: true, hint: 'e.g. Compound microscope' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'condition', label: 'Condition', type: 'select', options: Object.values(EQUIPMENT_CONDITION_LABELS), required: true },
      { key: 'purchaseDate', label: 'Purchase date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
      { key: 'note', label: 'Note', type: 'textarea', hint: 'Supplier, warranty, repair details…' }
    ];
  }
  private equipmentRecord(item: ApiLabEquipment): Record<string, unknown> {
    return { lab: item.labName, name: item.name, quantity: item.quantity, condition: EQUIPMENT_CONDITION_LABELS[item.condition], purchaseDate: item.purchaseDate ? fromApiDay(item.purchaseDate) : '', status: item.status === 'inactive' ? 'Inactive' : 'Active', note: item.note || '', code: item.equipmentCode, added: dayLabel(item.createdAt) };
  }
  viewEquipment(item: ApiLabEquipment): void {
    this.dialog.open(RecordDialogComponent, { width: '620px', maxWidth: 'calc(100vw - 24px)', data: { title: item.name, submitLabel: 'Done', readonly: true, record: this.equipmentRecord(item),
      fields: [{ key: 'code', label: 'Equipment ID' }, ...this.equipmentFields(), { key: 'added', label: 'Added on' }] } });
  }
  openEquipment(item?: ApiLabEquipment, draft?: Record<string, unknown>): void {
    const token = this.token;
    if (!token || !this.canEdit) return;
    if (!this.labs.length) { this.toast.warning('Add a lab first, then add its equipment.'); this.tab = 0; return; }
    const preset = !item && this.labFilter ? { lab: this.labs.find(lab => lab.labCode === this.labFilter)?.name, condition: 'Working', status: 'Active' } : undefined;
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: item ? `Edit ${item.name}` : 'Add new equipment', submitLabel: item ? 'Save changes' : 'Add equipment', successMessage: '', fields: this.equipmentFields(), record: draft || (item ? this.equipmentRecord(item) : preset) } })
      .afterClosed().subscribe((value?: Record<string, unknown>) => {
        if (!value) return;
        const quantity = Math.round(Number(value['quantity']));
        const purchase = value['purchaseDate'] ? isoDay(value['purchaseDate']) : null;
        if (!(quantity >= 0)) { this.toast.error('Quantity cannot be negative.'); this.openEquipment(item, value); return; }
        if (purchase && purchase > isoDay(new Date())) { this.toast.error('Purchase date cannot be in the future.'); this.openEquipment(item, value); return; }
        const payload: EquipmentPayload = {
          labCode: this.labs.find(lab => lab.name === value['lab'])?.labCode || '', name: String(value['name']), quantity,
          condition: (CONDITION_VALUES[String(value['condition'])] || 'working') as ApiEquipmentCondition, purchaseDate: purchase, note: text(value['note']),
          status: value['status'] === 'Inactive' ? 'inactive' : 'active'
        };
        (item ? this.equipmentApi.update(token, item.equipmentCode, payload) : this.equipmentApi.create(token, payload)).subscribe({
          next: saved => { this.equipment = item ? this.equipment.map(entry => entry.equipmentCode === saved.equipmentCode ? saved : entry) : [saved, ...this.equipment]; this.refreshLabCounts(); this.toast.success(`“${saved.name}” ${item ? 'updated' : 'added'}.`); },
          error: (error: Error) => { this.toast.error(error.message); this.openEquipment(item, value); }
        });
      });
  }
  toggleEquipment(item: ApiLabEquipment): void {
    const token = this.token;
    if (!token || !this.canEdit) return;
    const next = item.status === 'active' ? 'inactive' : 'active';
    this.equipmentApi.update(token, item.equipmentCode, { status: next }).subscribe({
      next: saved => { Object.assign(item, saved); this.toast.success(`${item.name} is now ${next}.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  removeEquipment(item: ApiLabEquipment): void {
    const token = this.token;
    if (!token || !this.canEdit) return;
    this.confirm.confirm({ title: 'Delete equipment?', message: `Delete “${item.name}” (${item.equipmentCode}) from ${item.labName}? This cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.equipmentApi.remove(token, item.equipmentCode).subscribe({
        next: () => { this.equipment = this.equipment.filter(entry => entry !== item); this.refreshLabCounts(); this.toast.success(`“${item.name}” deleted.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  /** Equipment counts on the Labs tab follow adds and deletes without reloading. */
  private refreshLabCounts(): void {
    this.labs = this.labs.map(lab => {
      const items = this.equipment.filter(item => item.labCode === lab.labCode);
      return { ...lab, equipmentCount: items.length, needsAttention: items.filter(item => item.condition !== 'working').length };
    });
  }

  // ---------------------------------------------------------------- Export

  export(): void {
    const labs = this.tab === 0;
    const rows = labs
      ? this.filteredLabs.map((lab, index) => ({ 'S.No.': index + 1, 'Lab name': lab.name, Department: LAB_TYPE_LABELS[lab.type], Location: lab.room || '', 'Assigned to': lab.inChargeName || '', Capacity: lab.capacity ?? '', Equipment: lab.equipmentCount, 'Added date': dayLabel(lab.createdAt), Status: lab.status === 'active' ? 'Active' : 'Inactive' }))
      : this.filteredEquipment.map((item, index) => ({ 'S.No.': index + 1, 'Eq ID': item.equipmentCode, Equipment: item.name, Department: this.department(item), 'Assigned lab': item.labName, Quantity: item.quantity, Condition: EQUIPMENT_CONDITION_LABELS[item.condition], 'Purchase date': dayLabel(item.purchaseDate), 'Added date': dayLabel(item.createdAt), Status: item.status === 'active' ? 'Active' : 'Inactive' }));
    if (!rows.length) { this.toast.info('Nothing to export with these filters.'); return; }
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), labs ? 'Labs' : 'Equipment');
    XLSX.writeFile(book, `${labs ? 'labs' : 'lab-equipment'}-${isoDay(new Date())}.xlsx`);
  }
}
