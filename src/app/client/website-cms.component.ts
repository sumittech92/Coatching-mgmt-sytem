import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { WebsiteContentService } from '../core/website-content.service';
import { TenantContextService } from '../core/tenant-context.service';
import { RecordDialogComponent, RecordField } from './management/record-dialog.component';

interface Section { key: string; label: string; icon: string; }
@Component({ selector: 'app-website-cms', templateUrl: './website-cms.component.html', styleUrls: ['./website-cms.component.scss'] })
export class WebsiteCmsComponent {
  private readonly baseSections: Section[] = [
    { key: 'settings', label: 'Website Settings', icon: 'settings' }, { key: 'home', label: 'Home', icon: 'home' }, { key: 'about', label: 'About', icon: 'info_outline' }, { key: 'courses', label: 'Courses', icon: 'menu_book' }, { key: 'faculty', label: 'Faculty', icon: 'school' }, { key: 'results', label: 'Results', icon: 'emoji_events' }, { key: 'gallery', label: 'Gallery', icon: 'photo_library' }, { key: 'updates', label: 'Updates', icon: 'campaign' }, { key: 'contact', label: 'Contact', icon: 'location_on' }, { key: 'social', label: 'Social Links', icon: 'share' }
  ];
  activeSection = 'settings'; saving = false; saved = false;
  constructor(public content: WebsiteContentService, private dialog: MatDialog, private confirm: ConfirmationDialogService, private tenant: TenantContextService) {}
  get isCollege(): boolean { return this.tenant.current.businessType === 'college'; }
  get sections(): Section[] { return this.isCollege ? this.baseSections.map(item => item.key === 'courses' ? { ...item, label: 'Programs' } : item.key === 'faculty' ? { ...item, label: 'Faculty' } : item) : this.baseSections; }
  get profile() { return this.content.profile; }
  get activeLabel(): string { return this.sections.find(item => item.key === this.activeSection)?.label || 'Website Settings'; }
  editCollection(key: 'courses'|'faculty'|'results'|'gallery'|'updates', row?: Record<string, string>): void {
    const fields: Record<string, RecordField[]> = {
      courses: [{ key:'name',label:'Course name',required:true },{ key:'description',label:'Description',type:'textarea' },{ key:'duration',label:'Duration' },{ key:'fee',label:'Fee' },{ key:'subjects',label:'Subjects' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      faculty: [{ key:'name',label:'Faculty name',required:true },{ key:'qualification',label:'Qualification' },{ key:'experience',label:'Experience' },{ key:'subjects',label:'Subjects' },{ key:'photo',label:'Photo',type:'file' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      results: [{ key:'name',label:'Student name',required:true },{ key:'course',label:'Course' },{ key:'exam',label:'Exam' },{ key:'score',label:'Score' },{ key:'achievement',label:'Achievement' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      gallery: [{ key:'title',label:'Media title',required:true },{ key:'media',label:'Photo / video',type:'file' },{ key:'date',label:'Date' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }],
      updates: [{ key:'title',label:'Update title',required:true },{ key:'description',label:'Description',type:'textarea' },{ key:'type',label:'Post type',type:'select',options:['Image','Video','Text','Announcement'] },{ key:'date',label:'Publish date' },{ key:'status',label:'Visibility',type:'select',options:['Published','Draft'],required:true }]
    };
    const ref = this.dialog.open(RecordDialogComponent,{width:'620px',maxWidth:'calc(100vw - 24px)',data:{title:`${row?'Edit':'Add'} ${this.activeSection==='faculty'?'faculty member':this.activeSection.slice(0,-1)}`,submitLabel:row?'Save changes':'Add to website',fields:fields[key],record:row}});
    ref.afterClosed().subscribe(value=>{if(!value)return;const list=this.profile[key] as Record<string,string>[];if(row)Object.assign(row,value);else list.unshift(value);});
  }
  remove(key: 'courses'|'faculty'|'results'|'gallery'|'updates', row: Record<string,string>): void { this.confirm.confirm({title:'Remove from website?',message:`Remove “${row['name'] || row['title']}” from the public website?`,confirmLabel:'Remove',destructive:true}).subscribe(ok=>{if(ok){const list=this.profile[key] as Record<string,string>[];const index=list.indexOf(row);if(index>=0)list.splice(index,1);}}); }
  toggle(row: Record<string,string>): void { row['status']=row['status']=='Published'?'Draft':'Published'; }
  save(): void { this.saving=true;this.saved=false;window.setTimeout(()=>{this.saving=false;this.saved=true;window.setTimeout(()=>this.saved=false,2500);},450); }
  upload(key: 'logo'|'favicon'|'image',event: Event): void { const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;const url=URL.createObjectURL(file);if(key==='image')this.profile.home['image']=url;else this.profile.settings[key]=url; }
  preview(): void { window.open(this.isCollege ? '/site/greenfield-college' : '/site/northstar-academy','_blank','noopener'); }
}
