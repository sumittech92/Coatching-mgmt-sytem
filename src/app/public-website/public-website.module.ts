import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { PublicWebsiteRoutingModule } from './public-website-routing.module';
import { PublicSiteComponent } from './public-site.component';
@NgModule({declarations:[PublicSiteComponent],imports:[CommonModule,SharedModule,PublicWebsiteRoutingModule]}) export class PublicWebsiteModule {}
