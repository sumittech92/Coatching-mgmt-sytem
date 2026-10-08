import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentPortalComponent } from './student-portal.component';
const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: StudentPortalComponent },
  { path: 'profile', component: StudentPortalComponent },
  { path: 'attendance', component: StudentPortalComponent },
  { path: 'fees', component: StudentPortalComponent },
  { path: 'results', component: StudentPortalComponent },
  { path: 'materials', component: StudentPortalComponent },
  { path: 'notices', component: StudentPortalComponent },
  { path: 'updates', component: StudentPortalComponent }
];
@NgModule({imports:[RouterModule.forChild(routes)],exports:[RouterModule]}) export class StudentPortalRoutingModule {}
