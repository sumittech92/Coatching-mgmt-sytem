import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import * as XLSX from 'xlsx';
import { ModuleRow } from '../modules/module-registry';
import type { ModuleApiAdapter } from '../modules/module-api.service';
import { RecordDialogComponent, RecordField } from '../management/record-dialog.component';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { WebsiteContentService } from '../../core/website-content.service';
import { ToastService } from '../../core/toast.service';
import { BatchApiService } from '../../core/batch-api.service';
import { ApiTeacher, TeacherApiService } from '../../core/teacher-api.service';
import { dayLabel, fromApiDay, isoDay } from '../../core/api-client';
import { ApiSalary, ApiSalaryMode, SALARY_MODE_LABELS, SalaryApiService, SalaryPayload } from '../../core/salary-api.service';
import { ApiEntrance, EntranceApiService, PRIMARY_CLASSES } from '../../core/entrance-api.service';
import { ApiLab, ApiLabEquipment, ApiLabType, ApiEquipmentCondition, EQUIPMENT_CONDITION_LABELS, LAB_TYPE_LABELS, LabApiService, LabEquipmentApiService } from '../../core/lab-api.service';
import { SalarySlipComponent, SalarySlipData } from './salary-slip.component';
import { EntranceCandidatesDialogComponent } from './entrance-candidates-dialog.component';

const text = (value: unknown): string | null => String(value ?? '').trim() || null;
const num = (value: unknown): number => Number(value) || 0;
const capital = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
const invert = <T extends string>(labels: Record<T, string>): Record<string, T> => Object.fromEntries(Object.entries(labels).map(([value, label]) => [label, value])) as Record<string, T>;
const MODE_VALUES = invert(SALARY_MODE_LABELS);
const LAB_TYPE_VALUES = invert(LAB_TYPE_LABELS);
const CONDITION_VALUES = invert(EQUIPMENT_CONDITION_LABELS);
/** Teacher option label, with the ID so two teachers with the same name stay apart. */
const teacherLabel = (teacher: ApiTeacher): string => `${teacher.fullName || 'Teacher'} · ${teacher.teacherCode}`;

/** "2026-11" for a Date. */
const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
/** Last 12 months, this month and next month (newest first) as "Nov 2026" labels. */
const monthChoices = (): { key: string; label: string }[] => {
  const now = new Date();
  return Array.from({ length: 14 }, (_, index) => monthKey(new Date(now.getFullYear(), now.getMonth() + 1 - index, 1)))
    .map(key => ({ key, label: SalaryApiService.monthLabel(key) }));
};

/** Owner operations pages (Teacher salary, Entrance tests, Labs, Lab equipment) on the generic module page. */
@Injectable({ providedIn: 'root' })
export class OperationsModuleApiService {
  constructor(private auth: MockAuthService, private dialog: MatDialog, private tenant: TenantContextService, private content: WebsiteContentService, private toast: ToastService,
    private teachers: TeacherApiService, private salaries: SalaryApiService, private entrances: EntranceApiService, private labs: LabApiService, private equipment: LabEquipmentApiService) {}

  private get token(): string { return this.auth.token!; }

  adapter(key: string, school: boolean): ModuleApiAdapter | undefined {
    switch (key) {
      case 'salary': return this.salaryAdapter();
      case 'entrance': return school ? this.entranceAdapter() : undefined;
      case 'labs': return this.labsAdapter();
      case 'lab-equipment': return this.equipmentAdapter();
      default: return undefined;
    }
  }

  // ---------------------------------------------------------------- Teacher salary

  private salaryAdapter(): ModuleApiAdapter {
    let teacherCodes = new Map<string, string>();
    let rows: ModuleRow[] = [];
    const toRow = (salary: ApiSalary): ModuleRow => ({
      id: Number(salary.salaryCode), code: salary.salaryCode, salary,
      teacher: [...teacherCodes.entries()].find(([, code]) => code === salary.teacherCode)?.[0] || `${salary.teacherName} · ${salary.teacherCode}`,
      teacherName: salary.teacherName, month: SalaryApiService.monthLabel(salary.month), monthKey: salary.month,
      basic: salary.basic, allowances: salary.allowances, bonus: salary.bonus, deductions: salary.deductions,
      gross: SalaryApiService.rupees(salary.basic + salary.allowances + salary.bonus), deductionLabel: SalaryApiService.rupees(salary.deductions),
      net: SalaryApiService.rupees(salary.netPay), netPay: salary.netPay,
      status: capital(salary.status), paidOn: salary.paidOn ? fromApiDay(salary.paidOn) : '', paidLabel: dayLabel(salary.paidOn),
      mode: salary.mode ? SALARY_MODE_LABELS[salary.mode] : '', reference: salary.reference || '', note: salary.note || ''
    });
    const payload = (value: Record<string, unknown>): SalaryPayload => {
      const paid = value['status'] === 'Paid';
      return {
        teacherCode: teacherCodes.get(String(value['teacher'])) || '', month: monthChoices().find(item => item.label === value['month'])?.key || String(value['month'] || ''),
        basic: num(value['basic']), allowances: num(value['allowances']), bonus: num(value['bonus']), deductions: num(value['deductions']),
        status: paid ? 'paid' : 'pending', paidOn: paid && value['paidOn'] ? isoDay(value['paidOn']) : null,
        mode: paid ? (MODE_VALUES[String(value['mode'])] || 'bank') as ApiSalaryMode : null, reference: paid ? text(value['reference']) : null, note: text(value['note'])
      };
    };
    const check = (value: SalaryPayload): string => {
      if (!value.teacherCode) return 'Choose the teacher.';
      if (value.deductions > value.basic + value.allowances + value.bonus) return 'Deductions cannot be more than the total pay.';
      return '';
    };
    const load = () => forkJoin({ salaries: this.salaries.list(this.token), teachers: this.teachers.list(this.token) }).pipe(
      tap(({ teachers }) => teacherCodes = new Map(teachers.filter(teacher => teacher.status !== 'inactive').map(teacher => [teacherLabel(teacher), teacher.teacherCode]))),
      map(({ salaries }) => rows = salaries.map(toRow))
    );
    const markPaid = (row: ModuleRow): Observable<ModuleRow | undefined> => this.dialog.open(RecordDialogComponent, {
      width: '520px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `Mark paid · ${row['teacherName']} · ${row['month']}`, submitLabel: 'Mark as paid', successMessage: '', record: { mode: 'Bank transfer', paidOn: new Date() },
        fields: [{ key: 'mode', label: 'Paid by', type: 'select', options: Object.values(SALARY_MODE_LABELS), required: true }, { key: 'paidOn', label: 'Paid on', type: 'date', required: true }, { key: 'reference', label: 'Reference / UTR no.', hint: 'Optional' }] }
    }).afterClosed().pipe(switchMap(value => !value ? of(undefined) : this.salaries.update(this.token, String(row['code']), {
      status: 'paid', paidOn: isoDay(value['paidOn']), mode: MODE_VALUES[String(value['mode'])] as ApiSalaryMode, reference: text(value['reference'])
    }).pipe(map(toRow))));
    const slip = (row: ModuleRow): Observable<undefined> => {
      const data: SalarySlipData = { salary: row['salary'] as ApiSalary, institution: this.content.profile.settings['name'] || this.auth.user?.instituteName || this.tenant.current.businessName, logo: this.content.customLogo };
      return this.dialog.open(SalarySlipComponent, { width: '520px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().pipe(map(() => undefined));
    };
    return {
      columns: [{ key: 'teacherName', label: 'Teacher' }, { key: 'month', label: 'Month' }, { key: 'gross', label: 'Gross' }, { key: 'deductionLabel', label: 'Deductions' }, { key: 'net', label: 'Net pay' }, { key: 'status', label: 'Status', badge: true }, { key: 'paidLabel', label: 'Paid on' }],
      load,
      blocker: () => teacherCodes.size ? '' : 'Add a teacher first, then set up their salary.',
      fields: () => [
        { key: 'teacher', label: 'Teacher', type: 'select', options: [...teacherCodes.keys()], required: true },
        { key: 'month', label: 'Month', type: 'select', options: monthChoices().map(item => item.label), required: true },
        { key: 'basic', label: 'Basic pay (₹)', type: 'number', required: true, hint: 'Monthly basic salary' },
        { key: 'allowances', label: 'Allowances (₹)', type: 'number', hint: 'Travel, house rent…' },
        { key: 'bonus', label: 'Bonus (₹)', type: 'number', hint: 'This month only' },
        { key: 'deductions', label: 'Deductions (₹)', type: 'number', hint: 'Leave, advance, PF…' },
        { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid'], required: true },
        { key: 'paidOn', label: 'Paid on', type: 'date', hint: 'When paid (today if left empty)' },
        { key: 'mode', label: 'Paid by', type: 'select', options: Object.values(SALARY_MODE_LABELS) },
        { key: 'reference', label: 'Reference / UTR no.' },
        { key: 'note', label: 'Note', type: 'textarea' }
      ],
      save: (value, row) => {
        const body = payload(value);
        const problem = check(body);
        if (problem) throw new Error(problem);
        return (row ? this.salaries.update(this.token, String(row['code']), body) : this.salaries.create(this.token, body)).pipe(map(toRow));
      },
      remove: row => this.salaries.remove(this.token, String(row['code'])),
      rowActions: row => [
        ...(row['status'] === 'Pending' ? [{ label: 'Mark as paid', icon: 'task_alt', run: () => markPaid(row), done: `Salary for ${row['teacherName']} marked as paid.` }] : []),
        { label: 'Salary slip', icon: 'receipt_long', run: () => slip(row) }
      ],
      pageActions: [
        { label: 'Generate month', icon: 'auto_awesome', run: () => this.dialog.open(RecordDialogComponent, {
          width: '480px', maxWidth: 'calc(100vw - 24px)',
          data: { title: 'Generate salaries', submitLabel: 'Generate', successMessage: '', record: { month: SalaryApiService.monthLabel(monthKey(new Date())) },
            fields: [{ key: 'month', label: 'Month', type: 'select', options: monthChoices().map(item => item.label), required: true, hint: 'Makes a pending salary for every active teacher, copying their last basic pay, allowances and deductions.' }] }
        }).afterClosed().pipe(switchMap(value => {
          if (!value) return of(undefined);
          const month = monthChoices().find(item => item.label === value['month'])?.key || monthKey(new Date());
          return this.salaries.generate(this.token, month).pipe(
            tap(result => {
              const made = result.created ? `${result.created} salar${result.created === 1 ? 'y' : 'ies'} created for ${value['month']}.` : `No new salaries for ${value['month']}.`;
              const skipped = result.skipped.length ? ` Add ${result.skipped.length === 1 ? result.skipped[0] : result.skipped.length + ' teachers'} once with “Add salary” (no earlier salary to copy).` : '';
              (result.created ? this.toast.success.bind(this.toast) : this.toast.info.bind(this.toast))(made + skipped);
            }),
            switchMap(() => load())
          );
        })) },
        { label: 'Export Excel', icon: 'download', run: () => {
          if (!rows.length) { this.toast.info('There are no salaries to export yet.'); return of(undefined); }
          const sheet = XLSX.utils.json_to_sheet(rows.map(row => ({
            Teacher: row['teacherName'], Month: row['month'], 'Basic (₹)': row['basic'], 'Allowances (₹)': row['allowances'], 'Bonus (₹)': row['bonus'],
            'Deductions (₹)': row['deductions'], 'Net pay (₹)': row['netPay'], Status: row['status'], 'Paid on': row['paidLabel'], 'Paid by': row['mode'], Reference: row['reference']
          })));
          const book = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(book, sheet, 'Salaries');
          XLSX.writeFile(book, `teacher-salaries-${isoDay(new Date())}.xlsx`);
          return of(undefined);
        } }
      ],
      summary: list => {
        const total = (status?: string) => list.filter(row => !status || row['status'] === status).reduce((sum, row) => sum + num(row['netPay']), 0);
        return [
          { label: 'Salaries', value: list.length },
          { label: 'Net payroll', value: SalaryApiService.rupees(total()) },
          { label: 'Paid', value: SalaryApiService.rupees(total('Paid')) },
          { label: 'Pending', value: SalaryApiService.rupees(total('Pending')) }
        ];
      }
    };
  }

  // ---------------------------------------------------------------- Entrance tests (school, primary classes)

  private entranceAdapter(): ModuleApiAdapter {
    const toRow = (test: ApiEntrance): ModuleRow => ({
      id: Number(test.entranceCode), code: test.entranceCode, test, name: test.name, className: test.className,
      date: fromApiDay(test.date), dateLabel: test.startTime ? `${dayLabel(test.date)} · ${BatchApiService.clock(test.startTime)}${test.endTime ? ' – ' + BatchApiService.clock(test.endTime) : ''}` : dayLabel(test.date),
      startTime: test.startTime || '', endTime: test.endTime || '', venue: test.venue || '', venueLabel: test.venue || '—',
      maxMarks: test.maxMarks, passMarks: test.passMarks, marksLabel: `${test.passMarks} / ${test.maxMarks}`, instructions: test.instructions || '',
      candidatesLabel: test.candidates.length ? `${test.candidates.length} · ${test.qualified} qualified` : 'None yet',
      state: test.cancelled ? 'Cancelled' : 'Scheduled', status: capital(test.status)
    });
    return {
      columns: [{ key: 'name', label: 'Test' }, { key: 'className', label: 'Class' }, { key: 'dateLabel', label: 'Date' }, { key: 'venueLabel', label: 'Venue' }, { key: 'marksLabel', label: 'Pass / max' }, { key: 'candidatesLabel', label: 'Candidates' }, { key: 'status', label: 'Status', badge: true }],
      load: () => this.entrances.list(this.token).pipe(map(rows => rows.map(toRow))),
      fields: () => [
        { key: 'name', label: 'Test name', required: true, hint: 'e.g. Admission test 2027–28' },
        { key: 'className', label: 'Class', type: 'select', options: PRIMARY_CLASSES, required: true, hint: 'Nursery to Class 5 only' },
        { key: 'date', label: 'Date', type: 'date', required: true, future: true },
        { key: 'venue', label: 'Venue', hint: 'e.g. Primary block, Room 3' },
        { key: 'startTime', label: 'Starts at', type: 'time' },
        { key: 'endTime', label: 'Ends at', type: 'time' },
        { key: 'maxMarks', label: 'Max marks', type: 'number', required: true },
        { key: 'passMarks', label: 'Pass marks', type: 'number', required: true },
        { key: 'state', label: 'Status', type: 'select', options: ['Scheduled', 'Cancelled'], required: true, hint: 'Past tests show as Completed.' },
        { key: 'instructions', label: 'Instructions for parents', type: 'textarea' }
      ],
      save: (value, row) => {
        const maxMarks = num(value['maxMarks']), passMarks = num(value['passMarks']);
        if (maxMarks < 1) throw new Error('Max marks must be at least 1.');
        if (passMarks > maxMarks) throw new Error('Pass marks cannot be more than max marks.');
        if (value['startTime'] && value['endTime'] && String(value['endTime']) <= String(value['startTime'])) throw new Error('End time must be after the start time.');
        const body = {
          name: String(value['name']), className: String(value['className']), date: isoDay(value['date']), startTime: text(value['startTime']), endTime: text(value['endTime']),
          venue: text(value['venue']), maxMarks, passMarks, instructions: text(value['instructions']), cancelled: value['state'] === 'Cancelled'
        };
        return (row ? this.entrances.update(this.token, String(row['code']), body) : this.entrances.create(this.token, body)).pipe(map(toRow));
      },
      remove: row => this.entrances.remove(this.token, String(row['code'])),
      rowActions: row => [{
        label: 'Candidates & marks', icon: 'how_to_reg', done: 'Candidates and marks saved.',
        run: () => this.dialog.open(EntranceCandidatesDialogComponent, { width: '900px', maxWidth: 'calc(100vw - 24px)', data: row['test'] as ApiEntrance })
          .afterClosed().pipe(map((saved?: ApiEntrance) => saved ? toRow(saved) : undefined))
      }]
    };
  }

  // ---------------------------------------------------------------- Labs and equipment

  private labsAdapter(): ModuleApiAdapter {
    let teacherCodes = new Map<string, string>();
    const toRow = (lab: ApiLab): ModuleRow => ({
      id: Number(lab.labCode), code: lab.labCode, name: lab.name, type: LAB_TYPE_LABELS[lab.type], room: lab.room || '', roomLabel: lab.room || '—',
      inCharge: [...teacherCodes.entries()].find(([, code]) => code === lab.inChargeCode)?.[0] || 'None', inChargeLabel: lab.inChargeName || '—',
      capacity: lab.capacity ?? '', description: lab.description || '',
      equipmentLabel: lab.equipmentCount ? `${lab.equipmentCount} item${lab.equipmentCount === 1 ? '' : 's'}${lab.needsAttention ? ` · ${lab.needsAttention} need${lab.needsAttention === 1 ? 's' : ''} attention` : ''}` : 'None yet',
      status: capital(lab.status)
    });
    return {
      columns: [{ key: 'name', label: 'Lab' }, { key: 'type', label: 'Type' }, { key: 'roomLabel', label: 'Room' }, { key: 'inChargeLabel', label: 'In-charge' }, { key: 'equipmentLabel', label: 'Equipment' }, { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ labs: this.labs.list(this.token), teachers: this.auth.role === 'Owner' ? this.teachers.list(this.token) : of([] as ApiTeacher[]) }).pipe(
        tap(({ teachers }) => teacherCodes = new Map(teachers.filter(teacher => teacher.status !== 'inactive').map(teacher => [teacherLabel(teacher), teacher.teacherCode]))),
        map(({ labs }) => labs.map(toRow))
      ),
      fields: () => [
        { key: 'name', label: 'Lab name', required: true, hint: 'e.g. Physics lab' },
        { key: 'type', label: 'Type', type: 'select', options: Object.values(LAB_TYPE_LABELS), required: true },
        { key: 'room', label: 'Room / location', hint: 'e.g. Block B, 1st floor' },
        { key: 'inCharge', label: 'In-charge teacher', type: 'select', options: ['None', ...teacherCodes.keys()] },
        { key: 'capacity', label: 'Capacity (students)', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
        { key: 'description', label: 'Description', type: 'textarea' }
      ],
      save: (value, row) => {
        const capacity = value['capacity'] === '' || value['capacity'] === null || value['capacity'] === undefined ? null : Math.round(num(value['capacity']));
        if (capacity !== null && capacity < 1) throw new Error('Capacity must be at least 1.');
        const body = {
          name: String(value['name']), type: (LAB_TYPE_VALUES[String(value['type'])] || 'other') as ApiLabType, room: text(value['room']),
          inChargeCode: teacherCodes.get(String(value['inCharge'])) || null, capacity, description: text(value['description']),
          status: (value['status'] === 'Inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
        };
        return (row ? this.labs.update(this.token, String(row['code']), body) : this.labs.create(this.token, body)).pipe(map(toRow));
      },
      remove: row => this.labs.remove(this.token, String(row['code']))
    };
  }

  private equipmentAdapter(): ModuleApiAdapter {
    let labCodes = new Map<string, string>();
    const toRow = (item: ApiLabEquipment): ModuleRow => ({
      id: Number(item.equipmentCode), code: item.equipmentCode, name: item.name, lab: item.labName, quantity: item.quantity,
      condition: EQUIPMENT_CONDITION_LABELS[item.condition], status: EQUIPMENT_CONDITION_LABELS[item.condition],
      purchaseDate: item.purchaseDate ? fromApiDay(item.purchaseDate) : '', purchaseLabel: dayLabel(item.purchaseDate), note: item.note || ''
    });
    return {
      columns: [{ key: 'name', label: 'Equipment' }, { key: 'lab', label: 'Lab' }, { key: 'quantity', label: 'Quantity' }, { key: 'purchaseLabel', label: 'Purchased' }, { key: 'status', label: 'Condition', badge: true }],
      load: () => forkJoin({ items: this.equipment.list(this.token), labs: this.labs.list(this.token) }).pipe(
        tap(({ labs }) => labCodes = new Map(labs.map(lab => [lab.name, lab.labCode]))),
        map(({ items }) => items.map(toRow))
      ),
      blocker: () => labCodes.size ? '' : 'Add a lab on the Labs page first.',
      fields: () => [
        { key: 'lab', label: 'Lab', type: 'select', options: [...labCodes.keys()], required: true },
        { key: 'name', label: 'Equipment', required: true, hint: 'e.g. Compound microscope' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true },
        { key: 'condition', label: 'Condition', type: 'select', options: Object.values(EQUIPMENT_CONDITION_LABELS), required: true },
        { key: 'purchaseDate', label: 'Purchase date', type: 'date' },
        { key: 'note', label: 'Note', type: 'textarea', hint: 'Supplier, warranty, repair details…' }
      ],
      save: (value, row) => {
        const quantity = Math.round(num(value['quantity']));
        const purchase = value['purchaseDate'] ? isoDay(value['purchaseDate']) : null;
        if (purchase && purchase > isoDay(new Date())) throw new Error('Purchase date cannot be in the future.');
        const body = {
          labCode: labCodes.get(String(value['lab'])) || '', name: String(value['name']), quantity,
          condition: (CONDITION_VALUES[String(value['condition'])] || 'working') as ApiEquipmentCondition, purchaseDate: purchase, note: text(value['note']), status: 'active' as const
        };
        if (!body.labCode) throw new Error('Choose the lab.');
        return (row ? this.equipment.update(this.token, String(row['code']), body) : this.equipment.create(this.token, body)).pipe(map(toRow));
      },
      remove: row => this.equipment.remove(this.token, String(row['code']))
    };
  }
}
