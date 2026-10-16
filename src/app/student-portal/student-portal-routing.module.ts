import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentPortalComponent } from './student-portal.component';
import { RoleAccessGuard } from '../core/role-access.guard';
const portalAccess = [RoleAccessGuard];
const portalRoles = { roles: ['Student', 'Parent'] };
const studentOnly = { roles: ['Student'] };
const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'profile', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'family', component: StudentPortalComponent, canActivate: portalAccess, data: { roles: ['Parent'] } },
  { path: 'attendance', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'fees', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'results', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'materials', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'library', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'notices', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  // Parent menu only: school / institute updates feed.
  { path: 'updates', component: StudentPortalComponent, canActivate: portalAccess, data: { roles: ['Parent'] } },
  // Coaching student
  { path: 'batch', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'tests', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  // School student
  { path: 'class', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'subjects', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'timetable', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'homework', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  { path: 'exams', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly },
  // Both workspaces
  { path: 'assignments', component: StudentPortalComponent, canActivate: portalAccess, data: studentOnly }
];
@NgModule({imports:[RouterModule.forChild(routes)],exports:[RouterModule]}) export class StudentPortalRoutingModule {}
