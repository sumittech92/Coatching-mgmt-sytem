import { AfterViewInit, ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { AbstractControl, NgModel, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { WebsiteContentService } from '../core/website-content.service';
import { TenantContextService } from '../core/tenant-context.service';
import { RecordDialogComponent, RecordField } from './management/record-dialog.component';
import { AppValidators, normalizeMobile, validationMessage } from '../core/app-validators';
import { ToastService } from '../core/toast.service';
import { MockAuthService } from '../core/mock-auth.service';
import { WebsiteApiService } from '../core/website-api.service';
import { firstValueFrom } from 'rxjs';

/** Office numbers may be a landline with STD code (e.g. 0522 4567 8900) or a 10-digit mobile. */
const officePhone: ValidatorFn = (control: AbstractControl): ValidationErrors | null => { const v = String(control.value ?? '').replace(/[\s-]/g, ''); return !v || /^(0\d{9,11}|[6-9]\d{9})$/.test(v) ? null : { pattern: true }; };
const req = AppValidators.required, max = Validators.maxLength, url = AppValidators.url;
const THIS_YEAR = new Date().getFullYear();
/** Validators and error labels for the template-driven CMS inputs, keyed by input name. */
const CMS_FIELDS: Record<string, { label: string; validators: ValidatorFn[] }> = {
  instituteName: { label: 'Institute name', validators: [req, max(100)] }, phone: { label: 'Phone', validators: [req, officePhone] }, email: { label: 'Email', validators: [req, AppValidators.email, max(120)] }, whatsapp: { label: 'WhatsApp number', validators: [AppValidators.mobile] }, address: { label: 'Address', validators: [req, max(300)] },
  heroTitle: { label: 'Hero title', validators: [req, max(120)] }, heroSubtitle: { label: 'Hero subtitle', validators: [max(300)] }, ctaText: { label: 'CTA text', validators: [req, max(30)] }, ctaLink: { label: 'CTA link', validators: [req, url] },
  description: { label: 'Description', validators: [req, max(1000)] }, mission: { label: 'Mission', validators: [max(500)] }, vision: { label: 'Vision', validators: [max(500)] }, experience: { label: 'Experience', validators: [max(120)] }, statistics: { label: 'Statistics', validators: [max(160)] },
  contactPhone: { label: 'Phone', validators: [req, officePhone] }, contactEmail: { label: 'Email', validators: [req, AppValidators.email, max(120)] }, contactAddress: { label: 'Address', validators: [req, max(300)] }, contactWhatsapp: { label: 'WhatsApp number', validators: [AppValidators.mobile] }, mapLink: { label: 'Google Map link', validators: [url] },
  established: { label: 'Year established', validators: [Validators.pattern(/^\d{4}$/), Validators.min(1850), Validators.max(THIS_YEAR)] }, registrationNo: { label: 'Registration no.', validators: [max(40)] }, gstin: { label: 'GSTIN', validators: [Validators.pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i)] },
  board: { label: 'Affiliation board', validators: [req] }, affiliationNo: { label: 'Affiliation no.', validators: [max(20), Validators.pattern(/^[A-Za-z0-9/-]{4,20}$/)] }, udise: { label: 'UDISE code (11 digits)', validators: [Validators.pattern(/^\d{11}$/)] },
  headName: { label: 'Name', validators: [req, AppValidators.personName, max(60)] }, headTitle: { label: 'Role', validators: [req] }, headPhone: { label: 'Mobile', validators: [req, AppValidators.mobile] }, headEmail: { label: 'Email', validators: [req, AppValidators.email, max(120)] },
  instagram: { label: 'Instagram URL', validators: [url] }, facebook: { label: 'Facebook URL', validators: [url] }, youtube: { label: 'YouTube URL', validators: [url] }, linkedin: { label: 'LinkedIn URL', validators: [url] }
};
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface Section { key: string; label: string; icon: string; }
import { readImageAsDataUrl } from '../core/image-file';
import { COACHING_BOARDS, SCHOOL_CLASSES } from '../core/workspace-terms';
@Component({ selector: 'app-website-cms', templateUrl: './website-cms.component.html', styleUrls: ['./website-cms.component.scss'] })
export class WebsiteCmsComponent implements AfterViewInit, OnInit {
  @ViewChildren(NgModel) private models!: QueryList<NgModel>;
  private readonly baseSections: Section[] = [
    { key: 'settings', label: 'Website Settings', icon: 'settings' }, { key: 'home', label: 'Home', icon: 'home' }, { key: 'about', label: 'About', icon: 'info_outline' }, { key: 'courses', label: 'Courses', icon: 'menu_book' }, { key: 'faculty', label: 'Faculty', icon: 'school' }, { key: 'results', label: 'Results', icon: 'emoji_events' }, { key: 'gallery', label: 'Gallery', icon: 'photo_library' }, { key: 'updates', label: 'Updates', icon: 'campaign' }, { key: 'contact', label: 'Contact', icon: 'location_on' }, { key: 'social', label: 'Social Links', icon: 'share' }
  ];
  activeSection = 'settings'; saving = false; saved = false; publishing = false;
  /** A real Owner's page waits for their website from crm-backend before showing the editor. */
  loading = !!this.auth.token && this.auth.role === 'Owner';
  constructor(public content: WebsiteContentService, private dialog: MatDialog, private confirm: ConfirmationDialogService, private tenant: TenantContextService, private toast: ToastService, private auth: MockAuthService, private websiteApi: WebsiteApiService, private cdr: ChangeDetectorRef) { this.normalizeWhatsapp(); }
  private normalizeWhatsapp(): void { [this.profile.settings, this.profile.contact].forEach(group => group['whatsapp'] = normalizeMobile(group['whatsapp'] || '')); }
  /** True for a real Owner: changes are saved to crm-backend and images are uploaded. */
  get isLive(): boolean { return this.content.isOwnerWebsite; }
  get ownerSite() { return this.content.ownerSite; }
  ngAfterViewInit(): void { this.attachValidators(); this.models.changes.subscribe(() => this.attachValidators()); }
  /** Inputs are recreated when the section changes, so validators are attached to whatever is on screen. */
  private attachValidators(): void { this.models.forEach(model => { const config = model.name ? CMS_FIELDS[model.name] : undefined; if (config && !model.control.hasValidator(config.validators[0])) { model.control.addValidators(config.validators); model.control.updateValueAndValidity({ emitEvent: false }); } }); /* Error messages depend on the validators just attached; refresh now so dev mode does not report NG0100. */ this.cdr.detectChanges(); }
  errorFor(name: string): string { const model = this.models?.find(item => item.name === name); return validationMessage(model?.control, CMS_FIELDS[name]?.label || name); }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get sections(): Section[] { return this.isSchool ? this.baseSections.map(item => item.key === 'courses' ? { ...item, label: 'Classes' } : item.key === 'faculty' ? { ...item, label: 'Teachers' } : item) : this.baseSections; }
  get profile() { return this.content.profile; }
  // Options for the institute details (same choices the old Institute / School profile page offered).
  readonly boards = COACHING_BOARDS;
  readonly schoolBoards = ['CBSE', 'ICSE', 'State Board'];
  readonly headTitles = ['Director', 'Founder & Director', 'Centre Head', 'Managing Partner'];
  readonly sessions = ['April – March', 'June – May'];
  get feeCycles(): string[] { return this.isSchool ? ['Term-wise', 'Quarterly', 'Monthly'] : ['Monthly', 'Quarterly', 'One-time (full course)']; }
  get classOptions(): string[] { return this.isSchool ? SCHOOL_CLASSES : SCHOOL_CLASSES.slice(3); }
  /**
   * Boards are saved as "CBSE, ICSE" (the website stores text); the multi-select works with a list.
   * The same array is returned until the text changes, otherwise ngModel sees a new value on every check and loops.
   */
  private boardsCache = { text: '', list: [] as string[] };
  get boardsValue(): string[] {
    const text = this.profile.settings['boards'] || '';
    if (text !== this.boardsCache.text) this.boardsCache = { text, list: text.split(',').map(item => item.trim()).filter(Boolean) };
    return this.boardsCache.list;
  }
  set boardsValue(value: string[]) { this.profile.settings['boards'] = (value || []).join(', '); }
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
    ref.afterClosed().subscribe(async value=>{if(!value)return;if(this.isLive&&!(await this.uploadPicked(value,['photo','media'])))return;const list=this.profile[key] as Record<string,string>[];if(row)Object.assign(row,value);else list.unshift(value);const name=value['name']||value['title'];this.commit(row?`“${name}” updated.`:`“${name}” added to the website${value['status']==='Draft'?' as a draft':''}.`);});
  }
  remove(key: 'courses'|'faculty'|'results'|'gallery'|'updates', row: Record<string,string>): void { this.confirm.confirm({title:'Remove from website?',message:`Remove “${row['name'] || row['title']}” from the public website?`,confirmLabel:'Remove',destructive:true}).subscribe(ok=>{if(ok){const list=this.profile[key] as Record<string,string>[];const index=list.indexOf(row);if(index>=0)list.splice(index,1);this.commit(`“${row['name'] || row['title']}” removed from the website.`,'warning');}}); }
  toggle(row: Record<string,string>): void { row['status']=row['status']=='Published'?'Draft':'Published';const name=row['name']||row['title'];if(row['status']==='Published')this.commit(`“${name}” is now visible on the website.`);else this.commit(`“${name}” moved to drafts and hidden from the website.`,'info'); }
  /** Collection edits apply at once: demo sessions keep them in memory, a real Owner's website is saved to the server. */
  private commit(message: string, tone: 'success'|'warning'|'info' = 'success'): void {
    if (!this.isLive) { this.toast[tone](message); return; }
    this.content.saveOwnerWebsite().subscribe({ next: () => this.toast[tone](message), error: (error: Error) => this.toast.error(`${error.message} Your change is not saved yet; use Save changes to try again.`) });
  }
  /** Photos / videos picked in the dialog are local blob: URLs; upload them and keep the server URLs instead. */
  private async uploadPicked(value: Record<string,string>, keys: string[]): Promise<boolean> {
    for (const key of keys) {
      const src = value[key];
      if (!src?.startsWith('blob:')) continue;
      try { const blob = await (await fetch(src)).blob(); value[key] = (await firstValueFrom(this.websiteApi.upload(this.auth.token!, blob, blob.type.startsWith('video/') ? 'video' : 'image'))).url; URL.revokeObjectURL(src); }
      catch (error) { this.toast.error((error as Error).message || 'Upload failed. Try again.'); return false; }
    }
    return true;
  }
  save(): void { if(this.saving)return;this.models.forEach(model=>model.control.markAsTouched());if(this.models.some(model=>model.control.invalid)){this.toast.invalidForm();return;}[this.profile.settings,this.profile.contact].forEach(group=>{group['whatsapp']=normalizeMobile(group['whatsapp']||'');});const s=this.profile.settings;if(s['headPhone'])s['headPhone']=normalizeMobile(s['headPhone']);if(s['classesFrom']&&s['classesTo']&&SCHOOL_CLASSES.indexOf(s['classesFrom'])>SCHOOL_CLASSES.indexOf(s['classesTo'])){this.toast.error('“Classes from” cannot be higher than “Classes to”.');return;}if(this.isSchool)s['headTitle']='Principal';const message=({ settings:'Website settings saved.', home:'Homepage saved.', about:'About section saved.', contact:'Contact details saved.', social:'Social links saved.' } as Record<string,string>)[this.activeSection]||'Website changes saved.';if(this.isLive){this.saving=true;this.saved=false;this.content.saveOwnerWebsite().subscribe({next:()=>{this.saving=false;this.saved=true;this.toast.success(message);window.setTimeout(()=>this.saved=false,2500);},error:(error:Error)=>{this.saving=false;this.toast.error(error.message);}});return;}this.content.persist();this.saving=true;this.saved=false;window.setTimeout(()=>{this.saving=false;this.saved=true;this.toast.success(message);window.setTimeout(()=>this.saved=false,2500);},450); }
  upload(key: 'logo'|'favicon'|'image',event: Event): void { const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;const label=key==='image'?'Hero image':key==='logo'?'Logo':'Favicon';input.value='';if(!file.type.startsWith('image/')){this.toast.error(`${label} must be an image file (PNG, JPG, SVG or WebP).`);return;}if(file.size>MAX_IMAGE_BYTES){this.toast.error(`${label} must be 2 MB or smaller.`);return;}if(this.isLive){this.websiteApi.upload(this.auth.token!,file,file.name).subscribe({next:({url})=>{if(key==='image')this.profile.home['image']=url;else this.profile.settings[key]=url;this.toast.success(`${label} uploaded. Save to publish it.`);},error:(error:Error)=>this.toast.error(error.message)});return;}if(key==='image'){this.profile.home['image']=URL.createObjectURL(file);this.toast.success(`${label} updated. Save to publish it.`);return;}readImageAsDataUrl(file,key==='logo'?256:64).then(url=>{this.profile.settings[key]=url;this.toast.success(`${label} updated. Save to publish it.`);},()=>this.toast.error(`${label} could not be read. Try another image.`)); }
  /** A real Owner's own public address (where website enquiries come from); demo sessions open the sample websites. */
  get siteSlug(): string | null { return this.ownerSite?.siteSlug ?? this.auth.user?.siteSlug ?? null; }
  get sitePath(): string { return this.siteSlug ? `/site/${this.siteSlug}` : this.isSchool ? '/site/greenfield-school' : '/site/northstar-academy'; }
  get siteUrl(): string { return `${window.location.origin}${this.sitePath}`; }
  /** Address shown in the side menu: the custom domain once the Super Admin has set one. */
  get siteHost(): string { return this.ownerSite?.customDomain || `${window.location.host}${this.sitePath}`; }
  ngOnInit(): void {
    if (!this.loading) return;
    this.content.loadOwnerWebsite().subscribe(site => {
      this.loading = false;
      if (!site) { this.toast.error('Your website could not be loaded. Showing the sample website; changes will not be saved.'); return; }
      this.normalizeWhatsapp();
    });
  }
  /** Publishing makes the website visible at its address / domain and lets it take enquiries; it is saved first if it never was. */
  async setPublished(isPublished: boolean): Promise<void> {
    if (this.publishing || !this.isLive) return;
    this.publishing = true;
    try {
      if (isPublished && !this.ownerSite?.saved) {
        this.models.forEach(model => model.control.markAsTouched());
        if (this.models.some(model => model.control.invalid)) { this.toast.invalidForm(); return; }
        await firstValueFrom(this.content.saveOwnerWebsite());
      }
      await firstValueFrom(this.content.setOwnerPublished(isPublished));
      if (isPublished) this.toast.success('Your website is live. Share the link with parents and students.'); else this.toast.info('Your website is hidden. Visitors see “Website not found” and enquiries are paused.');
    } catch (error) { this.toast.error((error as Error).message); }
    finally { this.publishing = false; }
  }
  preview(): void { window.open(this.sitePath, '_blank', 'noopener'); }
  copyLink(): void { navigator.clipboard?.writeText(this.siteUrl).then(() => this.toast.success('Website link copied. Share it with parents and students.'), () => this.toast.error('Could not copy the link. Select and copy it instead.')); }
}
