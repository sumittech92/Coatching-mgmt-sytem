import { Injectable } from '@angular/core';
import { TenantContextService } from './tenant-context.service';
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

@Injectable({ providedIn: 'root' })
export class WebsiteContentService {
  constructor(private tenant: TenantContextService) {
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
    settings: { name: 'Northstar Academy', logo: 'assets/images/logo.svg', favicon: '', primary: '#2f52da', secondary: '#0a1046', phone: DEFAULT_CONTACT_NUMBER, email: 'hello@northstar.edu', address: 'Gomti Nagar, Lucknow, Uttar Pradesh (demo address)', whatsapp: DEFAULT_CONTACT_NUMBER },
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
      { name: 'Priya Nair', qualification: 'Physics teacher', experience: '8 years', subjects: 'Physics, Mathematics', photo: 'assets/images/avatars/avatar-3.png', status: 'Published' },
      { name: 'Ankit Rao', qualification: 'Chemistry teacher', experience: '6 years', subjects: 'Chemistry', photo: 'assets/images/avatars/avatar-5.png', status: 'Published' },
      { name: 'Nisha Thomas', qualification: 'English teacher', experience: '11 years', subjects: 'English', photo: 'assets/images/avatars/avatar-8.png', status: 'Published' }
    ],
    results: [
      { name: 'Diya Iyer', course: 'Class 10 Foundation', exam: 'Board examinations 2026', score: '97.2%', achievement: 'State merit list', status: 'Published' },
      { name: 'Aarav Sharma', course: 'Class 12 Science', exam: 'Board examinations 2026', score: '96.4%', achievement: 'Distinction in Physics', status: 'Published' }
    ],
    gallery: [
      { title: 'Students learn together', media: 'assets/images/coaching/classroom-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Class time', media: 'assets/images/coaching/students-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Learning in class', media: 'assets/images/coaching/classroom-india.jpg', date: 'August 2026', status: 'Published' },
      { title: 'Students in class', media: 'assets/images/coaching/classroom-india.jpg', date: 'August 2026', status: 'Published' }
    ],
    updates: [
      { title: 'New classes are open', description: 'Call us to ask about the new classes.', type: 'Announcement', date: '26 Sep 2026', status: 'Published' },
      { title: 'Well done, students!', description: 'We are proud of our students and their hard work.', type: 'Image', date: '24 Sep 2026', status: 'Published' }
    ]
  };
  private readonly schoolProfile: WebsiteProfile = {
    settings: { name: 'Greenfield Public School', logo: 'assets/images/logo.svg', favicon: '', primary: '#2f52da', secondary: '#0a1046', phone: DEFAULT_CONTACT_NUMBER, email: 'hello@greenfield.edu', address: 'Indiranagar, Bengaluru, Karnataka', whatsapp: DEFAULT_CONTACT_NUMBER },
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
      { name: 'Mrs. Neha Iyer', qualification: 'PGT Mathematics · M.Sc, B.Ed', experience: '12 years', subjects: 'Mathematics', photo: 'assets/images/avatars/avatar-3.png', status: 'Published' },
      { name: 'Mr. Rahul Mehta', qualification: 'PGT Commerce · M.Com, B.Ed', experience: '10 years', subjects: 'Accountancy, Economics', photo: 'assets/images/avatars/avatar-5.png', status: 'Published' },
      { name: 'Ms. Ananya Rao', qualification: 'TGT Science · M.Sc, B.Ed', experience: '9 years', subjects: 'Science, Biology', photo: 'assets/images/avatars/avatar-8.png', status: 'Published' }
    ],
    results: [
      { name: 'Rohan Das', course: 'Class 12 · Science', exam: 'CBSE Class 12 board 2026', score: '97.4%', achievement: 'School topper', status: 'Published' },
      { name: 'Aditya Menon', course: 'Class 10', exam: 'CBSE Class 10 board 2026', score: '98.2%', achievement: '100 in Mathematics', status: 'Published' }
    ],
    gallery: [
      { title: 'Learning in the classroom', media: 'assets/images/coaching/classroom-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Students learn together', media: 'assets/images/coaching/students-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Annual sports day', media: 'assets/images/gallery/02.png', date: 'August 2026', status: 'Published' },
      { title: 'Science exhibition', media: 'assets/images/gallery/03.png', date: 'August 2026', status: 'Published' }
    ],
    updates: [
      { title: 'Admissions open for 2027–28', description: 'Admission forms for Nursery to Class 9 and Class 11 are available at the school office and online.', type: 'Announcement', date: '26 Sep 2026', status: 'Published' },
      { title: 'Term 1 parent–teacher meeting', description: 'PTM for all classes on Saturday, 10 October, 9:00 am to 12:30 pm. Report cards will be shared.', type: 'Announcement', date: '24 Sep 2026', status: 'Published' }
    ]
  };
  get profile(): WebsiteProfile { return this.tenant.current.businessType === 'school' ? this.schoolProfile : this.coachingProfile; }
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
    try {
      const saved: SavedContact = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const settings = Object.fromEntries(Object.entries(this.profile.settings).filter(([, value]) => !String(value).startsWith('blob:')));
      saved[this.tenant.current.businessType] = { settings, contact: { ...this.profile.contact }, social: { ...this.profile.social } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch { /* storage unavailable: keep in memory */ }
  }
  get publicProfile(): WebsiteProfile { return this.profile; }
  /** Logo the owner uploaded for the current workspace; null while the default placeholder is in use. */
  get customLogo(): string | null { const logo = this.profile.settings['logo']; return logo && logo !== DEFAULT_LOGO ? logo : null; }
}
