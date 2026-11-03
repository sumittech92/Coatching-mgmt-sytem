import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { FullLayoutComponent } from './layouts/full/full-layout.component';
import { Full_ROUTES } from './shared/routes/full-layout.routes';
import { AuthGuard } from './core/auth.guard';

const routes: Routes = [
  // Site root: an institute's own domain opens its website; otherwise the list of published institutes. Sign-in lives at /login.
  { path: '', pathMatch: 'full', loadComponent: () => import('./public-website/site-home.component').then(module => module.SiteHomeComponent) },
  { path: '', loadChildren: () => import('./auth/auth.module').then(module => module.AuthModule) },
  { path: 'site/:slug', loadChildren: () => import('./public-website/public-website.module').then(module => module.PublicWebsiteModule) },
  { path: 'student', canActivate: [AuthGuard], loadChildren: () => import('./student-portal/student-portal.module').then(module => module.StudentPortalModule) },
  { path: '', component: FullLayoutComponent, canActivate: [AuthGuard], children: Full_ROUTES },
  { path: '**', redirectTo: 'dashboard' }
];
@NgModule({ imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })], exports: [RouterModule] })
export class AppRoutingModule {}
