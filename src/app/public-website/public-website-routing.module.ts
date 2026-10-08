import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicSiteComponent } from './public-site.component';
const routes: Routes = [
  { path: '', pathMatch: 'full', component: PublicSiteComponent },
  { path: 'about', component: PublicSiteComponent },
  { path: 'courses', component: PublicSiteComponent },
  { path: 'faculty', component: PublicSiteComponent },
  { path: 'results', component: PublicSiteComponent },
  { path: 'gallery', component: PublicSiteComponent },
  { path: 'updates', component: PublicSiteComponent },
  { path: 'admission', component: PublicSiteComponent },
  { path: 'contact', component: PublicSiteComponent }
];
@NgModule({imports:[RouterModule.forChild(routes)],exports:[RouterModule]}) export class PublicWebsiteRoutingModule {}
