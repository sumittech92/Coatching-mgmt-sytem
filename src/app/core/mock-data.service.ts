import { Injectable } from '@angular/core';
import { MOCK_CLIENTS, MOCK_STUDENTS, MockClient, MockStudent } from './mock-data/management-data';
import { TenantContextService } from './tenant-context.service';
@Injectable({ providedIn: 'root' })
export class MockDataService {
  constructor(private tenant: TenantContextService) {}
  clients = MOCK_CLIENTS.map(item => ({ ...item, modules: [...item.modules] }));
  private coachingStudents = MOCK_STUDENTS.map(item => ({ ...item }));
  private schoolStudents: MockStudent[] = [
    { id: 101, studentId: 'GPS-2601', name: 'Ishita Rao', father: 'Arun Rao', mother: 'Meera Rao', phone: '98765 20001', email: 'arun.rao@email.com', course: 'Class 9', batch: 'Section A', admission: '04 Apr 2022', feeStatus: 'Paid', attendance: 94, status: 'Active', photo: 'IR', dob: '2012-05-12', gender: 'Female', address: '18 Residency Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', monthlyFee: 18500, discount: 0, rollNo: '12', semester: 'Term 1', quota: 'General' },
    { id: 102, studentId: 'GPS-2602', name: 'Aditya Menon', father: 'Vijay Menon', mother: 'Latha Menon', phone: '98765 20002', email: 'vijay.menon@email.com', course: 'Class 10', batch: 'Section B', admission: '03 Apr 2019', feeStatus: 'Pending', attendance: 88, status: 'Active', photo: 'AM', dob: '2011-01-28', gender: 'Male', address: '42 5th Main, HAL 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', monthlyFee: 19500, discount: 1500, rollNo: '04', semester: 'Term 1', quota: 'Sibling' },
    { id: 103, studentId: 'GPS-2603', name: 'Sana Ahmed', father: 'Farooq Ahmed', mother: 'Nazia Ahmed', phone: '98765 20003', email: 'farooq.ahmed@email.com', course: 'Class 6', batch: 'Section A', admission: '01 Apr 2024', feeStatus: 'Overdue', attendance: 91, status: 'Active', photo: 'SA', dob: '2015-09-02', gender: 'Female', address: '7 Museum Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', monthlyFee: 15000, discount: 0, rollNo: '27', semester: 'Term 1', quota: 'General' },
    { id: 104, studentId: 'GPS-2604', name: 'Rohan Das', father: 'Suman Das', mother: 'Ritu Das', phone: '98765 20004', email: 'suman.das@email.com', course: 'Class 12', batch: 'Section C', admission: '05 Apr 2016', feeStatus: 'Paid', attendance: 96, status: 'Active', photo: 'RD', dob: '2009-03-15', gender: 'Male', address: '28 CMH Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', monthlyFee: 22000, discount: 0, rollNo: '19', semester: 'Term 1', quota: 'Staff ward' },
    { id: 105, studentId: 'GPS-2605', name: 'Anika Sharma', father: 'Rajesh Sharma', mother: 'Pooja Sharma', phone: '98765 20005', email: 'rajesh.sharma@email.com', course: 'Class 3', batch: 'Section B', admission: '02 Apr 2024', feeStatus: 'Paid', attendance: 97, status: 'Active', photo: 'AS', dob: '2018-07-21', gender: 'Female', address: '11 12th Cross, Domlur', city: 'Bengaluru', state: 'Karnataka', pincode: '560071', monthlyFee: 13500, discount: 0, rollNo: '08', semester: 'Term 1', quota: 'RTE' }
  ];
  get students(): MockStudent[] { return this.tenant.current.businessType === 'school' ? this.schoolStudents : this.coachingStudents; }
  set students(value: MockStudent[]) { if (this.tenant.current.businessType === 'school') this.schoolStudents = value; else this.coachingStudents = value; }
  addClient(value: Omit<MockClient, 'id' | 'created' | 'status'>): MockClient {
    const record: MockClient = { ...value, id: Date.now(), created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), status: 'Active' };
    this.clients.unshift(record); return record;
  }
  addStudent(value: Omit<MockStudent, 'id' | 'studentId' | 'attendance' | 'status' | 'photo'> & { photo?: string }): MockStudent {
    const prefix = this.tenant.current.businessType === 'school' ? 'GPS' : 'NS';
    const record: MockStudent = { ...value, id: Date.now(), studentId: `${prefix}-${String(this.students.length + (prefix === 'GPS' ? 2601 : 2401)).padStart(4, '0')}`, attendance: 100, status: 'Active', photo: value.photo || value.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() };
    this.students.unshift(record); return record;
  }
}
