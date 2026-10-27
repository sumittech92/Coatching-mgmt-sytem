import { Component, ElementRef, EventEmitter, Input, Optional, Output, Self, ViewChild } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';

/** Searchable multi-select with "Select all" and removable chips. Works with formControlName, ngModel or [value]/(valueChange). */
@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss']
})
export class MultiSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() options: string[] = [];
  @Input() error = '';
  @Input() searchPlaceholder = 'Search';
  /** Text used in the trigger when nothing is selected, e.g. "All teachers" for filters. */
  @Input() emptyText = '';
  @Input() showChips = true;
  @Input() set value(value: string[] | string | null | undefined) { this.selected = MultiSelectComponent.toArray(value); }
  @Output() valueChange = new EventEmitter<string[]>();
  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;
  selected: string[] = [];
  query = '';
  disabled = false;
  readonly matcher: ErrorStateMatcher = { isErrorState: () => !!this.ngControl?.invalid && !!this.ngControl?.touched };
  private onChange: (value: string[]) => void = () => {};
  onTouched: () => void = () => {};

  constructor(@Optional() @Self() public ngControl: NgControl | null) { if (ngControl) ngControl.valueAccessor = this; }

  static toArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return typeof value === 'string' ? value.split(',').map(part => part.trim()).filter(Boolean) : [];
  }
  writeValue(value: unknown): void { this.selected = MultiSelectComponent.toArray(value); }
  registerOnChange(fn: (value: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  matches(option: string): boolean { return !this.query.trim() || option.toLowerCase().includes(this.query.trim().toLowerCase()); }
  get visibleOptions(): string[] { return this.options.filter(option => this.matches(option)); }
  get allVisibleSelected(): boolean { const visible = this.visibleOptions; return !!visible.length && visible.every(option => this.selected.includes(option)); }
  get someVisibleSelected(): boolean { return !this.allVisibleSelected && this.visibleOptions.some(option => this.selected.includes(option)); }
  get summary(): string {
    if (!this.selected.length) return this.emptyText;
    return this.selected.length <= 2 ? this.selected.join(', ') : `${this.selected[0]} +${this.selected.length - 1} more`;
  }

  select(values: string[]): void { this.update(values); }
  toggleAll(): void {
    const visible = this.visibleOptions;
    this.update(this.allVisibleSelected ? this.selected.filter(item => !visible.includes(item)) : [...new Set([...this.selected, ...visible])]);
  }
  remove(item: string): void { if (this.disabled) return; this.update(this.selected.filter(value => value !== item)); this.onTouched(); }
  clear(event: Event): void { event.stopPropagation(); this.update([]); this.onTouched(); }
  openedChange(open: boolean): void {
    if (open) setTimeout(() => this.searchBox?.nativeElement.focus(), 0);
    else { this.query = ''; this.onTouched(); }
  }
  private update(values: string[]): void {
    // Keep the option order so chips read the same way as the list.
    this.selected = this.options.filter(option => values.includes(option)).concat(values.filter(value => !this.options.includes(value)));
    this.onChange(this.selected);
    this.valueChange.emit(this.selected);
  }
}
