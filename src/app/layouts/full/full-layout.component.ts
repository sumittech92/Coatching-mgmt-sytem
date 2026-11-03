import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../shared/sidebar/sidebar.service'
import { WebsiteContentService } from '../../core/website-content.service';

@Component({
    selector: 'app-full-layout',
    templateUrl: './full-layout.component.html',
    styleUrls: ['./full-layout.component.scss']
})

export class FullLayoutComponent implements OnInit {

    constructor( public sidebarservice: SidebarService, private content: WebsiteContentService ) {

    }
        


      toggleSidebar() {
        this.sidebarservice.setSidebarState(!this.sidebarservice.getSidebarState());
    }
   
    getSideBarState() {
        return this.sidebarservice.getSidebarState();
    }

    ngOnInit() {
        // A real Owner's logo and institute name come from their saved website.
        this.content.loadOwnerWebsite().subscribe();
    }

}