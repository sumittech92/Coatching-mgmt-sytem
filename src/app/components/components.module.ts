import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsRoutingModule } from './components-routing.module';
import { SharedModule } from '../shared/shared.module';
import { CompanyMgtComponent } from './company-mgt/company-mgt.component';
import { CategoryAddbrandComponent } from './company-mgt/category-addbrand/category-addbrand.component';
import { CategoryAdddeptComponent } from './company-mgt/category-adddept/category-adddept.component';
import { DashboardComponent } from './dashboard/dashboard.component';
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
@NgModule({ declarations: [CompanyMgtComponent, CategoryAddbrandComponent, CategoryAdddeptComponent, DashboardComponent, WorkspacePageComponent, SuperAdminPageComponent, StudentsPageComponent, ClientDashboardComponent, ClientSectionComponent, ClientManagementComponent, RecordDialogComponent, AttendancePageComponent, FeesPageComponent, ReceiptPreviewComponent, WebsiteCmsComponent, ShopDashboardComponent, ShopManagementComponent, ShopBillingComponent], imports: [CommonModule, ComponentsRoutingModule, SharedModule] })
export class ComponentsModule {}
