import { Injectable } from '@angular/core';
import { MOCK_CLIENTS, MOCK_STUDENTS, MockClient, MockStudent } from './mock-data/management-data';
@Injectable({ providedIn: 'root' })
export class MockDataService {
  clients = MOCK_CLIENTS.map(item => ({ ...item, modules: [...item.modules] }));
  students = MOCK_STUDENTS.map(item => ({ ...item }));
  addClient(value: Omit<MockClient, 'id' | 'created' | 'status'>): MockClient {
    const record: MockClient = { ...value, id: Date.now(), created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), status: 'Active' };
    this.clients.unshift(record); return record;
  }
  addStudent(value: Omit<MockStudent, 'id' | 'studentId' | 'attendance' | 'status' | 'photo'> & { photo?: string }): MockStudent {
    const record: MockStudent = { ...value, id: Date.now(), studentId: `NS-${String(this.students.length + 2401).padStart(4, '0')}`, attendance: 100, status: 'Active', photo: value.photo || value.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() };
    this.students.unshift(record); return record;
  }
}
