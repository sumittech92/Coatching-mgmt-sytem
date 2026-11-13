import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { MockAuthService } from './mock-auth.service';
import { WebsiteApiService } from './website-api.service';
export interface WebsiteProfile {
  settings: Record<string, string>;
  home: Record<string, string>;
  about: Record<string, string>;
  contact: Record<string, string>;
  social: Record<string, string>;
  courses: Record<string, string>[];
  faculty: Record<string, string>[];
  results: Record<string, string>[];
  gallery: Record<string, string>[];
  updates: Record<string, string>[];
}
/** Default call / WhatsApp / support number. Owners change it in Website → Website Settings or Contact (and Institute settings). */
export const DEFAULT_CONTACT_NUMBER = '6392909743';
const STORAGE_KEY = 'demo-website-contact';
const DEFAULT_LOGO = 'assets/images/logo.svg';
type SavedContact = Record<string, { settings: Record<string, string>; contact: Record<string, string>; social: Record<string, string> }>;
const OBJECT_SECTIONS = ['settings', 'home', 'about', 'contact', 'social'] as const;
const LIST_SECTIONS = ['courses', 'faculty', 'results', 'gallery', 'updates'] as const;
/** Real owner's website state from crm-backend. `saved` is false until the first save creates it. */
export interface OwnerWebsite { ownerId: string; siteSlug: string | null; customDomain: string | null; isPublished: boolean; saved: boolean; }

@Injectable({ providedIn: 'root' })
export class WebsiteContentService {
  /** The signed-in account's institute website: the Owner's own (editable) or, for teachers and students, their institute's. */
  private ownerProfile: WebsiteProfile | null = null;
  ownerSite: OwnerWebsite | null = null;
  private ownerLoad$: Observable<OwnerWebsite | null> | null = null;
  /** The institute website a visitor is viewing on /site/<name> (null on the demo websites). */
  private publicSiteProfile: WebsiteProfile | null = null;

  constructor(private tenant: TenantContextService, private auth: MockAuthService, private api: WebsiteApiService) {
    // Owner edits to contact details survive a reload (no backend for the website yet).
    try {
      const saved: SavedContact = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      ([['coaching', this.coachingProfile], ['school', this.schoolProfile]] as const).forEach(([key, profile]) => {
        if (!saved[key]) return;
        Object.assign(profile.settings, saved[key].settings); Object.assign(profile.contact, saved[key].contact); Object.assign(profile.social, saved[key].social);
      });
    } catch { /* storage unavailable: use defaults */ }
  }
  private readonly coachingProfile: WebsiteProfile = {
    settings: { name: 'Northstar Academy', logo: 'assets/images/logo.svg', favicon: '', primary: '#2f52da', secondary: '#0a1046', phone: DEFAULT_CONTACT_NUMBER, email: 'hello@northstar.edu', address: 'Gomti Nagar, Lucknow, Uttar Pradesh (demo address)', whatsapp: DEFAULT_CONTACT_NUMBER,
      established: '2014', registrationNo: 'UDYAM-UP-32-0012345', gstin: '09ABCDE1234F1Z5', boards: 'CBSE, ICSE', classesFrom: 'Class 1', classesTo: 'Class 12', session: 'April – March', feeCycle: 'Monthly',
      headName: 'Jordan Davis', headTitle: 'Director', headPhone: '9876543210', headEmail: 'jordan@northstar.edu' },
    home: { title: 'Learn well. Do well.', subtitle: 'Classes, kind teachers and help for your child.', image: 'assets/images/coaching/classroom-india.jpg', ctaText: 'See classes', ctaLink: '/courses' },
    about: { description: 'We teach in clear steps. Our teachers help every child learn.', mission: 'Help every child learn well.', vision: 'Help children learn and reach their goals.', experience: 'We have taught for 12 years', statistics: '1,200 students · 24 teachers · 96% happy families' },
    contact: { phone: DEFAULT_CONTACT_NUMBER, email: 'hello@northstar.edu', address: 'Gomti Nagar, Lucknow, Uttar Pradesh (demo address)', map: 'https://maps.example.com/northstar', whatsapp: DEFAULT_CONTACT_NUMBER },
    social: { instagram: 'https://instagram.com/northstaracademy', facebook: 'https://facebook.com/northstaracademy', youtube: '', linkedin: '' },
    courses: [
      { name: 'Class 12 Science', description: 'Get ready for your board exams with help from our teachers.', duration: '12 months', fee: '₹4,500 / month', subjects: 'Physics, Chemistry, Mathematics', status: 'Published' },
      { name: 'Class 11 Science', description: 'Learn the basics and prepare for Class 12.', duration: '12 months', fee: '₹4,000 / month', subjects: 'Physics, Chemistry, Biology', status: 'Published' },
      { name: 'Class 10 Foundation', description: 'Learn each topic and practise every week.', duration: '10 months', fee: '₹3,200 / month', subjects: 'Mathematics, Biology, English', status: 'Published' }
    ],
    faculty: [
      { name: 'Priya Nair', qualification: 'Physics teacher', experience: '8 years', subjects: 'Physics, Mathematics', photo: 'assets/images/people/teacher-woman.jpg', status: 'Published' },
      { name: 'Ankit Rao', qualification: 'Chemistry teacher', experience: '6 years', subjects: 'Chemistry', photo: 'assets/images/people/teacher-man.jpg', status: 'Published' },
      { name: 'Nisha Thomas', qualification: 'English teacher', experience: '11 years', subjects: 'English', photo: 'assets/images/people/teacher-senior.jpg', status: 'Published' }
    ],
    results: [
      { name: 'Diya Iyer', course: 'Class 10 Foundation', exam: 'Board examinations 2026', score: '97.2%', achievement: 'State merit list', status: 'Published' },
      { name: 'Aarav Sharma', course: 'Class 12 Science', exam: 'Board examinations 2026', score: '96.4%', achievement: 'Distinction in Physics', status: 'Published' }
    ],
    gallery: [
      { title: 'Students learn together', media: 'assets/images/coaching/classroom-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Class time', media: 'assets/images/coaching/students-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Learning in class', media: 'assets/images/edu/coaching-class.jpg', date: 'August 2026', status: 'Published' },
      { title: 'Students in class', media: 'assets/images/edu/coaching-batch.jpg', date: 'August 2026', status: 'Published' }
    ],
    updates: [
      { title: 'New classes are open', description: 'Call us to ask about the new classes.', type: 'Announcement', date: '26 Sep 2026', status: 'Published' },
      { title: 'Well done, students!', description: 'We are proud of our students and their hard work.', type: 'Image', date: '24 Sep 2026', status: 'Published' }
    ]
  };
  private readonly schoolProfile: WebsiteProfile = {
    settings: { name: 'Greenfield Public School', logo: 'assets/images/logo.svg', favicon: '', primary: '#2f52da', secondary: '#0a1046', phone: DEFAULT_CONTACT_NUMBER, email: 'hello@greenfield.edu', address: 'Indiranagar, Bengaluru, Karnataka', whatsapp: DEFAULT_CONTACT_NUMBER,
      established: '1998', board: 'CBSE', affiliationNo: '830412', udise: '29200812345', classesFrom: 'Nursery', classesTo: 'Class 12', session: 'April – March', feeCycle: 'Term-wise',
      headName: 'Mrs. Kavita Menon', headTitle: 'Principal', headPhone: '9845022110', headEmail: 'principal@greenfieldpublic.edu.in' },
    home: { title: 'Rooted in values. Ready for tomorrow.', subtitle: 'A CBSE-affiliated school from Nursery to Class 12, where caring teachers help every child learn, play and grow.', image: 'assets/images/coaching/students-india.jpg', ctaText: 'See classes offered', ctaLink: '/courses' },
    about: { description: 'Greenfield Public School is a co-educational CBSE school in Bengaluru. We combine strong academics with sports, arts and values, so every child grows with confidence.', mission: 'Give every child a safe, joyful place to learn and discover their strengths.', vision: 'Nurture confident, kind and curious young citizens ready for the world.', experience: 'Serving families in Bengaluru since 1998', statistics: '2,486 students · 148 teachers · Nursery to Class 12 · 100% Class 10 & 12 board pass rate' },
    contact: { phone: DEFAULT_CONTACT_NUMBER, email: 'hello@greenfield.edu', address: 'Indiranagar, Bengaluru, Karnataka', map: 'https://maps.example.com/greenfield', whatsapp: DEFAULT_CONTACT_NUMBER },
    social: { instagram: 'https://instagram.com/greenfieldschool', facebook: 'https://facebook.com/greenfieldschool', youtube: 'https://youtube.com/@greenfieldschool', linkedin: '' },
    courses: [
      { name: 'Pre-primary (Nursery – UKG)', description: 'Play-based learning that builds language, numbers and social skills in a warm, safe setting.', duration: 'Nursery, LKG, UKG', fee: '₹14,500 / term', subjects: 'Phonics, Numbers, Rhymes, Art & Craft, Play', status: 'Published' },
      { name: 'Primary (Class 1 – 5)', description: 'Strong foundations in reading, writing and maths with activity-based lessons.', duration: 'Class 1 to Class 5', fee: '₹16,000 / term', subjects: 'English, Hindi, Mathematics, EVS, Computer Science', status: 'Published' },
      { name: 'Middle (Class 6 – 8)', description: 'Subject teachers, science labs and projects that build curiosity and good study habits.', duration: 'Class 6 to Class 8', fee: '₹18,000 / term', subjects: 'English, Hindi, Sanskrit, Mathematics, Science, Social Science', status: 'Published' },
      { name: 'Secondary (Class 9 – 10)', description: 'Focused CBSE board preparation with regular tests, remedial classes and mentoring.', duration: 'Class 9 to Class 10', fee: '₹19,500 / term', subjects: 'English, Hindi, Mathematics, Science, Social Science', status: 'Published' },
      { name: 'Senior Secondary (Class 11 – 12)', description: 'Science, Commerce and Humanities streams with career guidance for life after school.', duration: 'Class 11 to Class 12', fee: '₹22,000 / term', subjects: 'Physics, Chemistry, Biology, Mathematics, Accountancy, Economics', status: 'Published' }
    ],
    faculty: [
      { name: 'Mrs. Neha Iyer', qualification: 'PGT Mathematics · M.Sc, B.Ed', experience: '12 years', subjects: 'Mathematics', photo: 'assets/images/people/teacher-woman.jpg', status: 'Published' },
      { name: 'Mr. Rahul Mehta', qualification: 'PGT Commerce · M.Com, B.Ed', experience: '10 years', subjects: 'Accountancy, Economics', photo: 'assets/images/people/teacher-man.jpg', status: 'Published' },
      { name: 'Ms. Ananya Rao', qualification: 'TGT Science · M.Sc, B.Ed', experience: '9 years', subjects: 'Science, Biology', photo: 'assets/images/people/teacher-senior.jpg', status: 'Published' }
    ],
    results: [
      { name: 'Rohan Das', course: 'Class 12 · Science', exam: 'CBSE Class 12 board 2026', score: '97.4%', achievement: 'School topper', status: 'Published' },
      { name: 'Aditya Menon', course: 'Class 10', exam: 'CBSE Class 10 board 2026', score: '98.2%', achievement: '100 in Mathematics', status: 'Published' }
    ],
    gallery: [
      { title: 'Learning in the classroom', media: 'assets/images/coaching/classroom-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Students learn together', media: 'assets/images/coaching/students-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Annual sports day', media: 'assets/images/edu/sports-day.jpg', date: 'August 2026', status: 'Published' },
      { title: 'Science exhibition', media: 'assets/images/edu/science-exhibition.jpg', date: 'August 2026', status: 'Published' }
    ],
    updates: [
      { title: 'Admissions open for 2027–28', description: 'Admission forms for Nursery to Class 9 and Class 11 are available at the school office and online.', type: 'Announcement', date: '26 Sep 2026', status: 'Published' },
      { title: 'Term 1 parent–teacher meeting', description: 'PTM for all classes on Saturday, 10 October, 9:00 am to 12:30 pm. Report cards will be shared.', type: 'Announcement', date: '24 Sep 2026', status: 'Published' }
    ]
  };
  get profile(): WebsiteProfile {
    if (this.ownerProfile && this.ownerSite?.ownerId === this.auth.user?._id) return this.ownerProfile;
    return this.tenant.current.businessType === 'school' ? this.schoolProfile : this.coachingProfile;
  }
  /** True when the Website page edits go to crm-backend instead of this browser (real Owner accounts only). */
  get isOwnerWebsite(): boolean { return this.auth.role === 'Owner' && !!this.ownerProfile && this.profile === this.ownerProfile; }

  /**
   * Loads the signed-in owner's website once per account. Before the first save the owner starts from
   * the sample template with their own name, phone and email (demo-only details cleared).
   */
  loadOwnerWebsite(): Observable<OwnerWebsite | null> {
    const user = this.auth.user, token = this.auth.token;
    if (!token || !user) return of(null);
    if (this.ownerSite?.ownerId === user._id) return of(this.ownerSite);
    if (this.ownerLoad$) return this.ownerLoad$;
    if (this.auth.role === 'Teacher' || this.auth.role === 'Student' || this.auth.role === 'Parent') return this.ownerLoad$ = this.loadMemberWebsite(token, user._id);
    if (this.auth.role !== 'Owner') return of(null);
    this.ownerLoad$ = this.api.mine(token).pipe(
      map(({ website, siteSlug, customDomain }) => {
        const type = user.workType === 'school' ? 'school' : 'coaching';
        this.ownerProfile = website ? WebsiteContentService.complete(website, type) : this.starterProfile(type);
        this.ownerSite = { ownerId: user._id, siteSlug, customDomain, isPublished: !!website?.isPublished, saved: !!website };
        // Sidebar, receipts and messages use the real institute name instead of the demo one.
        if (this.ownerProfile.settings['name']) this.tenant.current.businessName = this.ownerProfile.settings['name'];
        return this.ownerSite;
      }),
      catchError(() => of(null)),
      finalize(() => this.ownerLoad$ = null),
      shareReplay(1)
    );
    return this.ownerLoad$;
  }

  /** Teachers, students and parents see their institute's logo, name and office contact (read-only). */
  private loadMemberWebsite(token: string, userId: string): Observable<OwnerWebsite | null> {
    return this.api.institute(token).pipe(
      map(({ website, instituteName, workType }) => {
        this.ownerProfile = website ? WebsiteContentService.complete(website, workType) : this.templateFor(workType);
        if (!website) this.ownerProfile.settings['name'] = instituteName;
        this.ownerSite = { ownerId: userId, siteSlug: null, customDomain: null, isPublished: false, saved: !!website };
        if (instituteName) this.tenant.current.businessName = instituteName;
        return this.ownerSite;
      }),
      catchError(() => of(null)),
      finalize(() => this.ownerLoad$ = null),
      shareReplay(1)
    );
  }

  /** Saves the owner's whole website to crm-backend. */
  saveOwnerWebsite(): Observable<void> {
    const settings = this.ownerProfile!.settings;
    return this.api.save(this.auth.token!, WebsiteContentService.sectionsOf(this.ownerProfile!)).pipe(
      tap(() => { if (this.ownerSite) this.ownerSite.saved = true; this.tenant.current.businessName = settings['name']; }),
      map(() => undefined)
    );
  }

  setOwnerPublished(isPublished: boolean): Observable<boolean> {
    return this.api.setPublished(this.auth.token!, isPublished).pipe(map(website => { if (this.ownerSite) this.ownerSite.isPublished = website.isPublished; return website.isPublished; }));
  }

  /** Shows a published institute's website (or the demo content again with null). */
  usePublicProfile(profile: WebsiteProfile | null, type: 'school' | 'coaching' = 'coaching'): void {
    this.publicSiteProfile = profile ? WebsiteContentService.complete(profile, type) : null;
  }

  /** Copy of the sample website for a work type. */
  templateFor(type: string): WebsiteProfile { return JSON.parse(JSON.stringify(this.profileFor(type))) as WebsiteProfile; }

  private starterProfile(type: string): WebsiteProfile {
    const profile = this.templateFor(type), user = this.auth.user!;
    const phone = user.phoneNumber || DEFAULT_CONTACT_NUMBER, email = user.email || '';
    Object.assign(profile.settings, { name: user.instituteName || user.fullName || '', logo: DEFAULT_LOGO, phone, whatsapp: phone, email, address: '' });
    Object.assign(profile.contact, { phone, whatsapp: phone, email, address: '', map: '' });
    // Head of institute starts as the Owner; demo-only registration numbers are cleared.
    Object.assign(profile.settings, { headName: user.fullName || '', headPhone: user.phoneNumber || '', headEmail: email, registrationNo: '', gstin: '', affiliationNo: '', udise: '', established: '' });
    profile.social = { instagram: '', facebook: '', youtube: '', linkedin: '' };
    return profile;
  }

  /** Every section present, so templates never read from a missing one. */
  private static complete(source: Partial<WebsiteProfile>, type: string): WebsiteProfile {
    const profile = WebsiteContentService.sectionsOf(source as WebsiteProfile);
    if (!profile.settings['logo']) profile.settings['logo'] = DEFAULT_LOGO;
    if (!profile.home['image']) profile.home['image'] = type === 'school' ? 'assets/images/coaching/students-india.jpg' : 'assets/images/coaching/classroom-india.jpg';
    return profile;
  }

  private static sectionsOf(source: WebsiteProfile): WebsiteProfile {
    const profile = {} as Record<string, unknown>;
    OBJECT_SECTIONS.forEach(key => profile[key] = { ...(source[key] || {}) });
    LIST_SECTIONS.forEach(key => profile[key] = (source[key] || []).map(item => ({ ...item })));
    return profile as unknown as WebsiteProfile;
  }
  profileFor(type: string): WebsiteProfile { return type === 'school' ? this.schoolProfile : this.coachingProfile; }
  /** Number for "Call us" / "Call the office" / support links. */
  get phone(): string { return this.profile.contact['phone'] || this.profile.settings['phone'] || DEFAULT_CONTACT_NUMBER; }
  get whatsapp(): string { return this.profile.contact['whatsapp'] || this.profile.settings['whatsapp'] || this.phone; }
  static telLink(phone: string): string { const digits = phone.replace(/[^\d+]/g, ''); return 'tel:' + (/^[6-9]\d{9}$/.test(digits) ? '+91' + digits : digits); }
  static whatsappLink(phone: string): string { return 'https://wa.me/91' + phone.replace(/\D/g, '').slice(-10); }
  /** Keeps the office phone the same everywhere (Institute settings writes here too). */
  setPhone(phone: string): void { this.profile.settings['phone'] = phone; this.profile.contact['phone'] = phone; this.persist(); }
  /** Saves contact details, settings (except unsaved blob images) and social links for the current workspace. */
  persist(): void {
    if (this.isOwnerWebsite) return;
    try {
      const saved: SavedContact = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const settings = Object.fromEntries(Object.entries(this.profile.settings).filter(([, value]) => !String(value).startsWith('blob:')));
      saved[this.tenant.current.businessType] = { settings, contact: { ...this.profile.contact }, social: { ...this.profile.social } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch { /* storage unavailable: keep in memory */ }
  }
  get publicProfile(): WebsiteProfile { return this.publicSiteProfile ?? this.profile; }
  /** Logo the owner uploaded for the current workspace; null while the default placeholder is in use. */
  get customLogo(): string | null { return WebsiteContentService.logoOf(this.profile); }
  /** Uploaded logo of a website, or null when it still uses the platform placeholder (show the first letter instead). */
  static logoOf(profile: WebsiteProfile): string | null { const logo = profile.settings['logo']; return logo && logo !== DEFAULT_LOGO ? logo : null; }
  /** "GSTIN …" for coaching, "<board> affiliation no. …" for schools; shown on receipts and the website footer. */
  static registrationLine(profile: WebsiteProfile, isSchool: boolean): string {
    const s = profile.settings;
    if (isSchool) return s['affiliationNo'] ? `${s['board'] || 'Board'} affiliation no. ${s['affiliationNo']}` : '';
    return s['gstin'] ? `GSTIN ${s['gstin'].toUpperCase()}` : s['registrationNo'] ? `Reg. no. ${s['registrationNo']}` : '';
  }
}
