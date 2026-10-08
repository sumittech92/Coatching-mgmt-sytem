import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { FullLayoutComponent } from './layouts/full/full-layout.component';
import { Full_ROUTES } from './shared/routes/full-layout.routes';

const routes: Routes = [
  { path: '', redirectTo: 'site/northstar-academy', pathMatch: 'full' },
  { path: '', loadChildren: () => import('./auth/auth.module').then(module => module.AuthModule) },
  { path: 'site/:slug', loadChildren: () => import('./public-website/public-website.module').then(module => module.PublicWebsiteModule) },
  { path: 'student', loadChildren: () => import('./student-portal/student-portal.module').then(module => module.StudentPortalModule) },
  { path: '', component: FullLayoutComponent, children: Full_ROUTES },
  { path: '**', redirectTo: 'dashboard' }
];
@NgModule({ imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })], exports: [RouterModule] })
export class AppRoutingModule {}
