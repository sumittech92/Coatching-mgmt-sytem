import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompanyMgtComponent } from './company-mgt/company-mgt.component';
import { WorkspacePageComponent } from './workspace-page.component';
import { SuperAdminPageComponent } from '../super-admin/super-admin-page.component';
import { StudentsPageComponent } from '../client/students-page.component';
import { ClientDashboardComponent } from '../client/client-dashboard.component';
import { ClientSectionComponent } from '../client/client-section.component';
import { ClientManagementComponent } from '../client/management/client-management.component';
import { RecordDialogComponent } from '../client/management/record-dialog.component';
import { AttendancePageComponent } from '../client/attendance-page.component';
import { FeesPageComponent, ReceiptPreviewComponent } from '../client/fees-page.component';
import { WebsiteCmsComponent } from '../client/website-cms.component';
import { ShopDashboardComponent } from '../shop/shop-dashboard.component';
import { ShopManagementComponent } from '../shop/shop-management.component';
import { ShopBillingComponent } from '../shop/shop-billing.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'super-admin', redirectTo: 'super-admin/dashboard', pathMatch: 'full' },
  { path: 'super-admin/dashboard', component: SuperAdminPageComponent },
  { path: 'super-admin/clients/add', component: SuperAdminPageComponent },
  { path: 'super-admin/clients/:id/edit', component: SuperAdminPageComponent },
  { path: 'super-admin/clients/:id', component: SuperAdminPageComponent },
  { path: 'super-admin/clients', component: SuperAdminPageComponent },
  { path: 'super-admin/users', component: SuperAdminPageComponent },
  { path: 'super-admin/subscriptions', component: SuperAdminPageComponent },
  { path: 'super-admin/reports', component: SuperAdminPageComponent },
  { path: 'super-admin/settings', component: SuperAdminPageComponent },
  { path: 'client', redirectTo: 'client/dashboard', pathMatch: 'full' },
  { path: 'client/dashboard', component: ClientDashboardComponent },
  { path: 'client/students/add', component: StudentsPageComponent },
  { path: 'client/students/:id/edit', component: StudentsPageComponent },
  { path: 'client/students/:id', component: StudentsPageComponent },
  { path: 'client/students', component: StudentsPageComponent },
  { path: 'client/teachers/add', component: ClientManagementComponent },
  { path: 'client/teachers/:id', component: ClientManagementComponent },
  { path: 'client/teachers', component: ClientManagementComponent },
  { path: 'client/courses/add', component: ClientManagementComponent },
  { path: 'client/courses/:id', component: ClientManagementComponent },
  { path: 'client/courses', component: ClientManagementComponent },
  { path: 'client/batches/add', component: ClientManagementComponent },
  { path: 'client/batches/:id', component: ClientManagementComponent },
  { path: 'client/batches', component: ClientManagementComponent },
  { path: 'client/attendance', component: AttendancePageComponent },
  { path: 'client/fees/collect', component: FeesPageComponent },
  { path: 'client/fees/:studentId', component: FeesPageComponent },
  { path: 'client/fees', component: FeesPageComponent },
  { path: 'client/admissions', component: ClientManagementComponent },
  { path: 'client/posts', component: ClientManagementComponent },
  { path: 'client/gallery', component: ClientManagementComponent },
  { path: 'client/notices', component: ClientManagementComponent },
  { path: 'client/results/add', component: ClientManagementComponent },
  { path: 'client/results/:id', component: ClientManagementComponent },
  { path: 'client/results', component: ClientManagementComponent },
  { path: 'client/materials', component: ClientManagementComponent },
  { path: 'client/website', component: WebsiteCmsComponent },
  { path: 'client/settings', component: ClientSectionComponent },
  { path: 'student/dashboard', component: WorkspacePageComponent },
  { path: 'company-management', component: CompanyMgtComponent },
  { path: 'dashboard', component: WorkspacePageComponent },
  { path: 'super-admin/overview', redirectTo: 'super-admin/dashboard' },
  { path: 'super-admin/businesses', redirectTo: 'super-admin/clients' },
  { path: 'client/overview', redirectTo: 'client/dashboard' },
  { path: 'client/people', redirectTo: 'client/students' },
  { path: 'client/catalog', redirectTo: 'client/courses' },
  { path: 'client/reports', component: ClientSectionComponent },
  { path: 'shop', redirectTo: 'shop/dashboard', pathMatch: 'full' },
  { path: 'shop/dashboard', component: ShopDashboardComponent },
  { path: 'shop/products/add', component: ShopManagementComponent },
  { path: 'shop/products', component: ShopManagementComponent },
  { path: 'shop/categories', component: ShopManagementComponent },
  { path: 'shop/inventory', component: ShopManagementComponent },
  { path: 'shop/billing', component: ShopBillingComponent },
  { path: 'shop/orders', component: ShopManagementComponent },
  { path: 'shop/customers', component: ShopManagementComponent },
  { path: 'shop/offers', component: ShopManagementComponent },
  { path: 'shop/posts', component: ClientManagementComponent },
  { path: 'shop/gallery', component: ClientManagementComponent },
  { path: 'shop/reports', component: ShopManagementComponent },
  { path: 'shop/settings', component: ShopManagementComponent },
  { path: 'student', redirectTo: 'student/dashboard', pathMatch: 'full' },
  { path: 'student/overview', redirectTo: 'student/dashboard' },
  { path: 'public', component: WorkspacePageComponent },
  { path: '**', redirectTo: 'dashboard' }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class ComponentsRoutingModule {}
