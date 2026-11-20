import { PortalLiveClassesComponent } from './portal-live-classes.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { StudentPortalRoutingModule } from './student-portal-routing.module';
import { StudentPortalComponent } from './student-portal.component';
@NgModule({ declarations: [StudentPortalComponent, PortalLiveClassesComponent], imports: [CommonModule, SharedModule, StudentPortalRoutingModule] }) export class StudentPortalModule { }
