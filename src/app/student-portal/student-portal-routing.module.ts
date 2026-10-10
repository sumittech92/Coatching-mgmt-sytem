import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentPortalComponent } from './student-portal.component';
import { RoleAccessGuard } from '../core/role-access.guard';
const portalAccess = [RoleAccessGuard];
const portalRoles = { roles: ['Student', 'Parent'] };
const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'profile', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'family', component: StudentPortalComponent, canActivate: portalAccess, data: { roles: ['Parent'] } },
  { path: 'attendance', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'fees', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'results', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'materials', component: StudentPortalComponent, canActivate: portalAccess, data: { roles: ['Student'] } },
  { path: 'notices', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles },
  { path: 'updates', component: StudentPortalComponent, canActivate: portalAccess, data: portalRoles }
];
@NgModule({imports:[RouterModule.forChild(routes)],exports:[RouterModule]}) export class StudentPortalRoutingModule {}
