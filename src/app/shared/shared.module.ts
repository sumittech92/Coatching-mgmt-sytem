import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MatModule } from '../appModules/mat.module';
import { BreadcrumbsComponent } from './ui/breadcrumbs/breadcrumbs.component';
import { StatCardComponent } from './ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from './ui/status-badge/status-badge.component';
import { EmptyStateComponent } from './ui/empty-state/empty-state.component';
import { LoadingStateComponent } from './ui/loading-state/loading-state.component';
import { SearchToolbarComponent } from './ui/search-toolbar/search-toolbar.component';
import { DataTableComponent } from './ui/data-table/data-table.component';
import { FormFieldComponent } from './ui/form-field/form-field.component';
import { ConfirmationDialogComponent } from './ui/confirmation-dialog/confirmation-dialog.component';

const components = [HeaderComponent, SidebarComponent, BreadcrumbsComponent, StatCardComponent, StatusBadgeComponent, EmptyStateComponent, LoadingStateComponent, SearchToolbarComponent, DataTableComponent, FormFieldComponent, ConfirmationDialogComponent];
@NgModule({ declarations: components, imports: [CommonModule, RouterModule, MatModule, FormsModule, ReactiveFormsModule], exports: [CommonModule, RouterModule, MatModule, FormsModule, ReactiveFormsModule, ...components] })
export class SharedModule {}
