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
@Injectable({ providedIn: 'root' })
export class WebsiteContentService {
  constructor(private tenant: TenantContextService) {}
  private readonly coachingProfile: WebsiteProfile = {
    settings: { name: 'Northstar Academy', logo: 'assets/images/logo.svg', favicon: '', primary: '#128c78', secondary: '#12313c', phone: '+91 522 4567 8900', email: 'hello@northstar.edu', address: 'Gomti Nagar, Lucknow, Uttar Pradesh (demo address)', whatsapp: '+91 98765 43210' },
    home: { title: 'Learn well. Do well.', subtitle: 'Classes, kind teachers and help for your child.', image: 'assets/images/coaching/classroom-india.jpg', ctaText: 'See classes', ctaLink: '/courses' },
    about: { description: 'We teach in clear steps. Our teachers help every child learn.', mission: 'Help every child learn well.', vision: 'Help children learn and reach their goals.', experience: 'We have taught for 12 years', statistics: '1,200 students · 24 teachers · 96% happy families' },
    contact: { phone: '+91 522 4567 8900', email: 'hello@northstar.edu', address: 'Gomti Nagar, Lucknow, Uttar Pradesh (demo address)', map: 'https://maps.example.com/northstar', whatsapp: '+91 98765 43210' },
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
  private readonly collegeProfile: WebsiteProfile = {
    settings: { name: 'Greenfield College', logo: 'assets/images/logo.svg', favicon: '', primary: '#128c78', secondary: '#163c3b', phone: '+91 8045 678 900', email: 'hello@greenfield.edu', address: 'Indiranagar, Bengaluru, Karnataka', whatsapp: '+91 98765 43210' },
    home: { title: 'Curiosity builds the future.', subtitle: 'A welcoming college for bold ideas, meaningful learning and lifelong friendships.', image: 'assets/images/coaching/students-india.jpg', ctaText: 'Explore our programs', ctaLink: '/courses' },
    about: { description: 'Greenfield College brings ambitious students and dedicated educators together.', mission: 'Make high-quality learning personal and practical.', vision: 'Prepare thoughtful graduates to shape a changing world.', experience: 'A vibrant learning community in Bengaluru', statistics: '2,486 students · 148 faculty · 8 departments' },
    contact: { phone: '+91 8045 678 900', email: 'hello@greenfield.edu', address: 'Indiranagar, Bengaluru, Karnataka', map: 'https://maps.example.com/greenfield', whatsapp: '+91 98765 43210' },
    social: { instagram: 'https://instagram.com/greenfieldcollege', facebook: 'https://facebook.com/greenfieldcollege', youtube: '', linkedin: 'https://linkedin.com/school/greenfield-college' },
    courses: [
      { name: 'B.Sc Computer Science', description: 'Build practical knowledge in computing and software.', duration: '3 years', fee: '₹42,000 / year', subjects: 'Programming, Data Structures, Mathematics', status: 'Published' },
      { name: 'B.Com', description: 'Explore accounting, economics and modern business.', duration: '3 years', fee: '₹36,000 / year', subjects: 'Accounting, Economics, Business Law', status: 'Published' },
      { name: 'BA Psychology', description: 'Understand people, behaviour and research.', duration: '3 years', fee: '₹38,000 / year', subjects: 'Psychology, Sociology, Research Methods', status: 'Published' },
      { name: 'BBA', description: 'Develop confident, practical business leadership.', duration: '3 years', fee: '₹48,000 / year', subjects: 'Marketing, Finance, Management', status: 'Published' }
    ],
    faculty: [
      { name: 'Dr. Neha Iyer', qualification: 'Computer Science', experience: '12 years', subjects: 'Data Structures, Programming', photo: 'assets/images/avatars/avatar-3.png', status: 'Published' },
      { name: 'Prof. Rahul Mehta', qualification: 'Commerce', experience: '10 years', subjects: 'Accounting, Economics', photo: 'assets/images/avatars/avatar-5.png', status: 'Published' },
      { name: 'Dr. Ananya Rao', qualification: 'Psychology', experience: '9 years', subjects: 'Psychology, Research Methods', photo: 'assets/images/avatars/avatar-8.png', status: 'Published' }
    ],
    results: [
      { name: 'Ishita Rao', course: 'B.Sc Computer Science', exam: 'University examinations 2026', score: '9.2 CGPA', achievement: 'Department merit list', status: 'Published' },
      { name: 'Aditya Menon', course: 'B.Com', exam: 'University examinations 2026', score: '8.8 CGPA', achievement: 'Academic distinction', status: 'Published' }
    ],
    gallery: [
      { title: 'Ideas in the classroom', media: 'assets/images/coaching/classroom-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Students learn together', media: 'assets/images/coaching/students-india.jpg', date: 'September 2026', status: 'Published' },
      { title: 'Life on campus', media: 'assets/images/gallery/02.png', date: 'August 2026', status: 'Published' },
      { title: 'A day of discovery', media: 'assets/images/gallery/03.png', date: 'August 2026', status: 'Published' }
    ],
    updates: [
      { title: 'Innovation showcase this Friday', description: 'Join us in the main hall for student projects and demonstrations.', type: 'Announcement', date: '26 Sep 2026', status: 'Published' },
      { title: 'Annual cultural festival registrations', description: 'Sign up for music, dance, theatre and more.', type: 'Image', date: '24 Sep 2026', status: 'Published' }
    ]
  };
  get profile(): WebsiteProfile { return this.tenant.current.businessType === 'college' ? this.collegeProfile : this.coachingProfile; }
  get publicProfile(): WebsiteProfile { return this.profile; }
}
