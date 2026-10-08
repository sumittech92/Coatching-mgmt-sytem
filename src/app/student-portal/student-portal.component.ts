import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MockAuthService } from '../core/mock-auth.service';
interface PortalMenu { key: string; label: string; icon: string; }
@Component({ selector: 'app-student-portal', templateUrl: './student-portal.component.html', styleUrls: ['./student-portal.component.scss'] })
export class StudentPortalComponent {
  section = 'dashboard'; menuOpen = false; readonly menu: PortalMenu[] = [{key:'dashboard',label:'Home',icon:'space_dashboard'},{key:'profile',label:'Profile',icon:'person_outline'},{key:'attendance',label:'Attendance',icon:'event_available'},{key:'fees',label:'Fees',icon:'payments'},{key:'results',label:'Results',icon:'emoji_events'},{key:'materials',label:'Lessons',icon:'folder_open'},{key:'notices',label:'Notices',icon:'campaign'},{key:'updates',label:'News',icon:'article'}];
  readonly fees = [{month:'September 2026',amount:4000,paid:2000,due:2000,status:'Partial',date:'—',mode:'—'},{month:'August 2026',amount:4000,paid:4000,due:0,status:'Paid',date:'08 Aug 2026',mode:'UPI'},{month:'July 2026',amount:4000,paid:4000,due:0,status:'Paid',date:'05 Jul 2026',mode:'Cash'}];
  readonly results = [{exam:'Unit Test 3',date:'18 Sep 2026',subject:'Physics',marks:'88 / 100',percentage:'88%',grade:'A'},{exam:'Unit Test 2',date:'20 Aug 2026',subject:'Chemistry',marks:'91 / 100',percentage:'91%',grade:'A+'},{exam:'Mid-term',date:'12 Jul 2026',subject:'Mathematics',marks:'84 / 100',percentage:'84%',grade:'A'}];
  readonly materials = [{title:'Motion and laws of motion',subject:'Physics · Chapter 4',type:'PDF',file:'motion-chapter-4.pdf',date:'26 Sep 2026'},{title:'Organic chemistry practice set',subject:'Chemistry · Assignment',type:'Assignment',file:'organic-practice.pdf',date:'24 Sep 2026'},{title:'Calculus lesson recording',subject:'Mathematics · Video',type:'Video',file:'calculus-lesson.mp4',date:'21 Sep 2026'}];
  readonly notices = [{type:'Exam',title:'Mid-term examinations begin October 12',body:'Please review the timetable shared by your teacher.',date:'25 Sep 2026',tone:'amber'},{type:'Holiday',title:'Institute closed for Gandhi Jayanti',body:'All classes resume on Saturday, October 3.',date:'22 Sep 2026',tone:'blue'},{type:'Fee reminder',title:'September fee balance due October 5',body:'Please contact the office if you need any assistance.',date:'20 Sep 2026',tone:'rose'}];
  readonly updates = [{title:'New batch admissions are open',body:'Our new academic batches are now enrolling.',date:'26 Sep 2026',type:'Announcement'},{title:'Celebrating our students',body:'A proud moment for learners across the academy.',date:'24 Sep 2026',type:'Community'}];
  readonly calendar = Array.from({length:30},(_,i)=>({day:i+1,status:[3,10,17,22].includes(i+1)?'absent':[6].includes(i+1)?'leave':[8,19].includes(i+1)?'late':i<28?'present':'future'}));
  constructor(private router: Router, public auth: MockAuthService) { this.update(router.url); router.events.pipe(filter((event):event is NavigationEnd=>event instanceof NavigationEnd)).subscribe(event=>{this.update(event.urlAfterRedirects);this.menuOpen=false;}); }
  get isParent(): boolean { return this.auth.role === 'Parent'; }
  get displayName(): string { return this.isParent ? 'Neha Sharma' : 'Aarav Sharma'; }
  get sectionLabel(): string { return this.menu.find(item => item.key === this.section)?.label || 'Overview'; }
  private update(url:string):void { const part=url.split('?')[0].split('/').filter(Boolean)[1];this.section=part||'dashboard'; }
  go(key:string):void {this.router.navigate(['/student',key==='dashboard'?'dashboard':key]);}
  download(file:string):void {const blob=new Blob([`Ageon student portal demo file: ${file}`],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.endsWith('.mp4')?'lesson-recording.txt':file;a.click();URL.revokeObjectURL(a.href);}
  printReceipt(month:string,amount:number):void {window.print();}
}
