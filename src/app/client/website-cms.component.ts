import { AfterViewInit, Component, QueryList, ViewChildren } from '@angular/core';
import { AbstractControl, NgModel, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { WebsiteContentService } from '../core/website-content.service';
import { TenantContextService } from '../core/tenant-context.service';
import { RecordDialogComponent, RecordField } from './management/record-dialog.component';
import { AppValidators, normalizeMobile, validationMessage } from '../core/app-validators';
import { ToastService } from '../core/toast.service';

/** Office numbers may be a landline with STD code (e.g. 0522 4567 8900) or a 10-digit mobile. */
const officePhone: ValidatorFn = (control: AbstractControl): ValidationErrors | null => { const v = String(control.value ?? '').replace(/[\s-]/g, ''); return !v || /^(0\d{9,11}|[6-9]\d{9})$/.test(v) ? null : { pattern: true }; };
const req = AppValidators.required, max = Validators.maxLength, url = AppValidators.url;
/** Validators and error labels for the template-driven CMS inputs, keyed by input name. */
const CMS_FIELDS: Record<string, { label: string; validators: ValidatorFn[] }> = {
  instituteName: { label: 'Institute name', validators: [req, max(100)] }, phone: { label: 'Phone', validators: [req, officePhone] }, email: { label: 'Email', validators: [req, AppValidators.email, max(120)] }, whatsapp: { label: 'WhatsApp number', validators: [AppValidators.mobile] }, address: { label: 'Address', validators: [req, max(300)] },
  heroTitle: { label: 'Hero title', validators: [req, max(120)] }, heroSubtitle: { label: 'Hero subtitle', validators: [max(300)] }, ctaText: { label: 'CTA text', validators: [req, max(30)] }, ctaLink: { label: 'CTA link', validators: [req, url] },
  description: { label: 'Description', validators: [req, max(1000)] }, mission: { label: 'Mission', validators: [max(500)] }, vision: { label: 'Vision', validators: [max(500)] }, experience: { label: 'Experience', validators: [max(120)] }, statistics: { label: 'Statistics', validators: [max(160)] },
  contactPhone: { label: 'Phone', validators: [req, officePhone] }, contactEmail: { label: 'Email', validators: [req, AppValidators.email, max(120)] }, contactAddress: { label: 'Address', validators: [req, max(300)] }, contactWhatsapp: { label: 'WhatsApp number', validators: [AppValidators.mobile] }, mapLink: { label: 'Google Map link', validators: [url] },
  instagram: { label: 'Instagram URL', validators: [url] }, facebook: { label: 'Facebook URL', validators: [url] }, youtube: { label: 'YouTube URL', validators: [url] }, linkedin: { label: 'LinkedIn URL', validators: [url] }
};
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface Section { key: string; label: string; icon: string; }
@Component({ selector: 'app-website-cms', templateUrl: './website-cms.component.html', styleUrls: ['./website-cms.component.scss'] })
export class WebsiteCmsComponent implements AfterViewInit {
  @ViewChildren(NgModel) private models!: QueryList<NgModel>;
  private readonly baseSections: Section[] = [
    { key: 'settings', label: 'Website Settings', icon: 'settings' }, { key: 'home', label: 'Home', icon: 'home' }, { key: 'about', label: 'About', icon: 'info_outline' }, { key: 'courses', label: 'Courses', icon: 'menu_book' }, { key: 'faculty', label: 'Faculty', icon: 'school' }, { key: 'results', label: 'Results', icon: 'emoji_events' }, { key: 'gallery', label: 'Gallery', icon: 'photo_library' }, { key: 'updates', label: 'Updates', icon: 'campaign' }, { key: 'contact', label: 'Contact', icon: 'location_on' }, { key: 'social', label: 'Social Links', icon: 'share' }
  ];
  activeSection = 'settings'; saving = false; saved = false;
  constructor(public content: WebsiteContentService, private dialog: MatDialog, private confirm: ConfirmationDialogService, private tenant: TenantContextService, private toast: ToastService) { [this.profile.settings, this.profile.contact].forEach(group => group['whatsapp'] = normalizeMobile(group['whatsapp'] || '')); }
  ngAfterViewInit(): void { this.attachValidators(); this.models.changes.subscribe(() => this.attachValidators()); }
  /** Inputs are recreated when the section changes, so validators are attached to whatever is on screen. */
  private attachValidators(): void { this.models.forEach(model => { const config = model.name ? CMS_FIELDS[model.name] : undefined; if (config && !model.control.hasValidator(config.validators[0])) { model.control.addValidators(config.validators); model.control.updateValueAndValidity({ emitEvent: false }); } }); }
  errorFor(name: string): string { const model = this.models?.find(item => item.name === name); return validationMessage(model?.control, CMS_FIELDS[name]?.label || name); }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get sections(): Section[] { return this.isSchool ? this.baseSections.map(item => item.key === 'courses' ? { ...item, label: 'Classes' } : item.key === 'faculty' ? { ...item, label: 'Teachers' } : item) : this.baseSections; }
  get profile() { return this.content.profile; }
  /** Singular / plural wording for the active collection (school uses classes and teachers). */
  get collectionNoun(): string { return this.isSchool ? ({ courses: 'class group', faculty: 'teacher' } as Record<string, string>)[this.activeSection] || this.activeSection.slice(0, -1) : this.activeSection === 'faculty' ? 'faculty' : this.activeSection.slice(0, -1); }
  get collectionPlural(): string { return this.isSchool ? ({ courses: 'class groups', faculty: 'teachers' } as Record<string, string>)[this.activeSection] || this.activeSection : this.activeSection; }
  get activeLabel(): string { return this.sections.find(item => item.key === this.activeSection)?.label || 'Website Settings'; }
  editCollection(key: 'courses'|'faculty'|'results'|'gallery'|'updates', row?: Record<string, string>): void {
    const fields: Record<string, RecordField[]> = {
      courses: [{ key:'name',label:this.isSchool?'Class group':'Course name',required:true },{ key:'description',label:'Description',type:'textarea' },{ key:'duration',label:this.isSchool?'Classes covered':'Duration' },{ key:'fee',label:this.isSchool?'Term fee':'Fee' },{ key:'subjects',label:'Subjects' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      faculty: [{ key:'name',label:this.isSchool?'Teacher name':'Faculty name',required:true },{ key:'qualification',label:this.isSchool?'Designation & qualification':'Qualification' },{ key:'experience',label:'Experience' },{ key:'subjects',label:'Subjects' },{ key:'photo',label:'Photo',type:'file' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      results: [{ key:'name',label:'Student name',required:true },{ key:'course',label:this.isSchool?'Class':'Course' },{ key:'exam',label:this.isSchool?'Board exam':'Exam' },{ key:'score',label:'Score' },{ key:'achievement',label:'Achievement' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      gallery: [{ key:'title',label:'Media title',required:true },{ key:'media',label:'Photo / video',type:'file' },{ key:'date',label:'Date' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      updates: [{ key:'title',label:'Update title',required:true },{ key:'description',label:'Description',type:'textarea' },{ key:'type',label:'Post type',type:'select',options:['Image','Video','Text','Announcement'] },{ key:'date',label:'Publish date' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }]
    };
    const noun = ({ courses: this.isSchool ? 'class group' : 'course', faculty: this.isSchool ? 'teacher' : 'faculty member', results: 'result', gallery: 'gallery item', updates: 'update' } as const)[key];
    const ref = this.dialog.open(RecordDialogComponent,{width:'620px',maxWidth:'calc(100vw - 24px)',data:{title:`${row?'Edit':'Add'} ${noun}`,submitLabel:row?'Save changes':`Add ${noun}`,fields:fields[key],record:row,successMessage:''}});
    ref.afterClosed().subscribe(value=>{if(!value)return;const list=this.profile[key] as Record<string,string>[];if(row)Object.assign(row,value);else list.unshift(value);const name=value['name']||value['title'];this.toast.success(row?`“${name}” updated.`:`“${name}” added to the website${value['status']==='Draft'?' as a draft':''}.`);});
  }
  remove(key: 'courses'|'faculty'|'results'|'gallery'|'updates', row: Record<string,string>): void { this.confirm.confirm({title:'Remove from website?',message:`Remove “${row['name'] || row['title']}” from the public website?`,confirmLabel:'Remove',destructive:true}).subscribe(ok=>{if(ok){const list=this.profile[key] as Record<string,string>[];const index=list.indexOf(row);if(index>=0)list.splice(index,1);this.toast.warning(`“${row['name'] || row['title']}” removed from the website.`);}}); }
  toggle(row: Record<string,string>): void { row['status']=row['status']=='Published'?'Draft':'Published';const name=row['name']||row['title'];if(row['status']==='Published')this.toast.success(`“${name}” is now visible on the website.`);else this.toast.info(`“${name}” moved to drafts and hidden from the website.`); }
  save(): void { if(this.saving)return;this.models.forEach(model=>model.control.markAsTouched());if(this.models.some(model=>model.control.invalid)){this.toast.invalidForm();return;}[this.profile.settings,this.profile.contact].forEach(group=>{group['whatsapp']=normalizeMobile(group['whatsapp']||'');});const message=({ settings:'Website settings saved.', home:'Homepage saved.', about:'About section saved.', contact:'Contact details saved.', social:'Social links saved.' } as Record<string,string>)[this.activeSection]||'Website changes saved.';this.saving=true;this.saved=false;window.setTimeout(()=>{this.saving=false;this.saved=true;this.toast.success(message);window.setTimeout(()=>this.saved=false,2500);},450); }
  upload(key: 'logo'|'favicon'|'image',event: Event): void { const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;const label=key==='image'?'Hero image':key==='logo'?'Logo':'Favicon';input.value='';if(!file.type.startsWith('image/')){this.toast.error(`${label} must be an image file (PNG, JPG, SVG or WebP).`);return;}if(file.size>MAX_IMAGE_BYTES){this.toast.error(`${label} must be 2 MB or smaller.`);return;}const url=URL.createObjectURL(file);if(key==='image')this.profile.home['image']=url;else this.profile.settings[key]=url;this.toast.success(`${label} updated. Save to publish it.`); }
  preview(): void { window.open(this.isSchool ? '/site/greenfield-school' : '/site/northstar-academy','_blank','noopener'); }
}
