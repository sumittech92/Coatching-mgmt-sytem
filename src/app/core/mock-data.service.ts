import { Injectable } from '@angular/core';
import { MOCK_CLIENTS, MOCK_STUDENTS, MockClient, MockStudent } from './mock-data/management-data';
import { TenantContextService } from './tenant-context.service';
@Injectable({ providedIn: 'root' })
export class MockDataService {
  constructor(private tenant: TenantContextService) {}
  clients = MOCK_CLIENTS.map(item => ({ ...item, modules: [...item.modules] }));
  private coachingStudents = MOCK_STUDENTS.map(item => ({ ...item }));
  private collegeStudents: MockStudent[] = [
    { id: 101, studentId: 'GC-2601', name: 'Ishita Rao', father: 'Arun Rao', mother: 'Meera Rao', phone: '+91 98765 20001', email: 'ishita.r@email.com', course: 'B.Sc Computer Science', batch: 'Year 2 · Section A', admission: '14 Jun 2025', feeStatus: 'Paid', attendance: 94, status: 'Active', photo: 'IR', dob: '2006-05-12', gender: 'Female', address: '18 Residency Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', monthlyFee: 28000, discount: 0 },
    { id: 102, studentId: 'GC-2602', name: 'Aditya Menon', father: 'Vijay Menon', mother: 'Latha Menon', phone: '+91 98765 20002', email: 'aditya.m@email.com', course: 'B.Com', batch: 'Year 1 · Section B', admission: '18 Jun 2026', feeStatus: 'Pending', attendance: 88, status: 'Active', photo: 'AM', dob: '2007-01-28', gender: 'Male', address: '42 5th Main', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', monthlyFee: 24000, discount: 2000 },
    { id: 103, studentId: 'GC-2603', name: 'Sana Ahmed', father: 'Farooq Ahmed', mother: 'Nazia Ahmed', phone: '+91 98765 20003', email: 'sana.a@email.com', course: 'BA Psychology', batch: 'Year 3 · Section A', admission: '12 Jun 2024', feeStatus: 'Overdue', attendance: 91, status: 'Active', photo: 'SA', dob: '2005-09-02', gender: 'Female', address: '7 Museum Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', monthlyFee: 26000, discount: 0 },
    { id: 104, studentId: 'GC-2604', name: 'Rohan Das', father: 'Suman Das', mother: 'Ritu Das', phone: '+91 98765 20004', email: 'rohan.d@email.com', course: 'BBA', batch: 'Year 2 · Section C', admission: '20 Jun 2025', feeStatus: 'Paid', attendance: 96, status: 'Active', photo: 'RD', dob: '2006-03-15', gender: 'Male', address: '28 Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', monthlyFee: 30000, discount: 0 }
  ];
  get students(): MockStudent[] { return this.tenant.current.businessType === 'college' ? this.collegeStudents : this.coachingStudents; }
  set students(value: MockStudent[]) { if (this.tenant.current.businessType === 'college') this.collegeStudents = value; else this.coachingStudents = value; }
  addClient(value: Omit<MockClient, 'id' | 'created' | 'status'>): MockClient {
    const record: MockClient = { ...value, id: Date.now(), created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), status: 'Active' };
    this.clients.unshift(record); return record;
  }
  addStudent(value: Omit<MockStudent, 'id' | 'studentId' | 'attendance' | 'status' | 'photo'> & { photo?: string }): MockStudent {
    const prefix = this.tenant.current.businessType === 'college' ? 'GC' : 'NS';
    const record: MockStudent = { ...value, id: Date.now(), studentId: `${prefix}-${String(this.students.length + (prefix === 'GC' ? 2601 : 2401)).padStart(4, '0')}`, attendance: 100, status: 'Active', photo: value.photo || value.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() };
    this.students.unshift(record); return record;
  }
}
