import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

export interface BottomNavItem { label: string; icon: string; route: string; /** Red dot on the icon, e.g. unread notifications. */ dot?: boolean; exact?: boolean; }

/**
 * Phone / tablet tab bar fixed to the bottom of every panel: four shortcuts plus "More", which opens the panel's full menu.
 * Hidden on desktop, where the sidebar is always visible.
 */
@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss']
})
export class BottomNavComponent {
  @Input() items: BottomNavItem[] = [];
  /** Highlights "More" while the full menu is open. */
  @Input() moreActive = false;
  /** Width below which the bar shows: 'lg' (≤991px, admin panels) or 'md' (≤900px, student portal). */
  @Input() @HostBinding('attr.data-breakpoint') breakpoint: 'lg' | 'md' = 'lg';
  @Output() more = new EventEmitter<void>();
}
