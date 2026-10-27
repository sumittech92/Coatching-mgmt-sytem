import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

/**
 * Turns every Bootstrap `.table` into stacked cards on phones (see `.stack-mobile` in styles.scss).
 * Each body cell gets a `data-label` copied from its column header, and labels refresh when rows change.
 * Add `no-stack` to a table that must keep its grid, e.g. a timetable.
 */
@Directive({ selector: 'table.table:not(.no-stack):not(.timetable-table)' })
export class StackTableDirective implements AfterViewInit, OnDestroy {
  private observer?: MutationObserver;
  constructor(private host: ElementRef<HTMLTableElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    const table = this.host.nativeElement;
    table.classList.add('stack-mobile');
    this.label();
    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.label());
      this.observer.observe(table, { childList: true, subtree: true, characterData: true });
    });
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  private label(): void {
    const table = this.host.nativeElement;
    const headers: string[] = [];
    table.querySelectorAll<HTMLTableCellElement>('thead tr:last-child th').forEach(th => {
      const text = (th.textContent || '').replace(/\s+/g, ' ').trim();
      for (let span = 0; span < (th.colSpan || 1); span++) headers.push(text);
    });
    table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
      let column = 0;
      Array.from(row.cells).forEach(cell => {
        // Action columns read better as a plain row of buttons, so they get no label.
        const header = headers[column] || '';
        const label = cell.colSpan >= headers.length || /^actions?$/i.test(header) ? '' : header;
        if (label && cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
        if (!label && cell.hasAttribute('data-label')) cell.removeAttribute('data-label');
        cell.classList.toggle('stack-full', cell.colSpan > 1 && cell.colSpan >= headers.length);
        column += cell.colSpan || 1;
      });
    });
  }
}
