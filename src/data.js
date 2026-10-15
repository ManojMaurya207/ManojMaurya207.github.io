// Public portfolio content. Keep presentation in app.js and replace this source with Firestore reads.
export const portfolioData = {
  profile: {
    name: 'Manoj Mourya', initials: 'MM', role: 'Mobile Application Developer · iOS & Android',
    location: 'Mumbai, India', currentlyBuilding: 'Mobile applications for real-world workflows',
    intro: 'Mobile developer building healthcare and utility applications with Swift, SwiftUI, Kotlin, and Jetpack Compose.',
    bio: 'I’m a mobile application developer with hands-on experience building and maintaining healthcare and utility apps. I work across iOS and Android, with a focus on offline-first workflows, background processing, media handling, and reliable production software.',
    email: 'manojkumarmaurya9372@gmail.com',
    resumeUrl: '/assets/Manoj-Mourya-Resume.pdf', profileImage: '/assets/profile-pic.png',
    socials: [
      { label: 'GitHub', url: 'https://github.com/ManojMaurya207', handle: 'ManojMaurya207' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/manoj-maurya', handle: 'Professional profile' },
      { label: 'Email', url: 'mailto:manojkumarmaurya9372@gmail.com', handle: 'manojkumarmaurya9372@gmail.com' }
    ]
  },
  projects: [
    { title: 'Cilika Retic', slug: 'cilika-retic', category: 'iOS · Healthcare', summary: 'A production healthcare app in the Cilika ecosystem, with background workflows for medical image analysis involving reticulocyte and RBC detection.', description: 'Built background processing workflows for medical image analysis and optimized task execution for long-running image-processing operations. Contributed to stable offline workflows used in clinical diagnostic environments.', technologies: ['SwiftUI', 'Background Tasks', 'Image Processing'], highlights: ['Background processing for medical image analysis', 'Long-running task execution', 'Offline workflows for clinical diagnostic environments'], featured: true, published: true, links: { live: 'https://apps.apple.com/us/app/cilika-reticulocyte/id6755103616' } },
    { title: 'StealthShield', slug: 'stealthshield', category: 'Android · Safety', summary: 'A theft-prevention Android app with real-time tracking, geofencing, simulated shutdown, and unauthorized access detection.', description: 'Built with Jetpack Compose, Firebase, and Google Maps SDK. Implemented Dagger-Hilt for modular dependency injection and optimized background services for continuous, lifecycle-aware location tracking with attention to memory and battery use.', technologies: ['Kotlin', 'Jetpack Compose', 'Firebase', 'Google Maps SDK', 'Geocoding API', 'Dagger-Hilt'], highlights: ['Real-time tracking and geofencing', 'Unauthorized access detection', 'Lifecycle-aware background location services'], featured: true, published: true, links: { github: 'https://github.com/ManojMaurya207/StealthShield' } },
    { title: 'Signify', slug: 'signify', category: 'Android · Computer Vision', summary: 'A sign language learning and interpretation application using MediaPipe and CameraX.', technologies: ['Kotlin', 'Jetpack Compose', 'MediaPipe', 'CameraX', 'Firebase'], featured: true, published: true, links: {} },
    { title: 'EduTrack', slug: 'edutrack', category: 'Android', summary: 'An education-focused application project.', technologies: ['Kotlin', 'Firebase'], featured: false, published: true, links: {} },
    { title: 'Digit Recognizer', slug: 'digit-recognizer', category: 'AI / ML', summary: 'A computer vision project for recognizing handwritten digits.', technologies: ['Python', 'NumPy', 'Matplotlib'], featured: false, published: true, links: {} },
    { title: 'DivyaDrishti', slug: 'divyadrishti', category: 'Android', summary: 'A mobile application project from Manoj’s portfolio.', technologies: ['Kotlin', 'Android'], featured: false, published: true, links: {} }
  ],
  skillCategories: [
    { name: 'iOS', items: ['Swift', 'SwiftUI', 'State Management', 'Background Tasks', 'Navigation', 'Media Handling', 'Xcode'] },
    { name: 'Android', items: ['Kotlin', 'Java', 'Jetpack Compose', 'XML', 'MVVM', 'CameraX', 'Google Maps SDK', 'Geofencing API'] },
    { name: 'Backend & data', items: ['Firebase', 'Firestore', 'SQLite', 'MySQL', 'Flask'] },
    { name: 'Libraries & tools', items: ['MediaPipe', 'Firebase Crashlytics', 'Dagger-Hilt', 'Python', 'NumPy', 'Matplotlib', 'Git', 'GitHub'] }
  ],
  experience: [
    { role: 'Junior Mobile Application Developer', company: 'MedPrime Technologies', companyUrl: 'https://www.medprimetech.com/', location: 'Mumbai', description: 'Maintained and enhanced applications in the Cilika ecosystem. Built local medical record sharing across Android and iOS, integrated Firebase Crashlytics, resolved production stability issues, and implemented offline-first and background image-processing workflows.', technologies: ['Swift', 'SwiftUI', 'Android', 'Firebase Crashlytics', 'Offline-first workflows'], published: true }
  ],
  education: [
    { degree: 'BSc. Computer Science', institution: "Vivekanand Education Society’s College of Arts, Commerce and Science", location: 'Chembur, Mumbai, Maharashtra', startDate: 'July 2022', endDate: 'April 2025', description: 'CGPA: 9.67', published: true }
  ],
  achievements: [
    { title: 'Pre-Incubatee — MUIDEAS Ideathon', organization: 'Selected for StealthShield', published: true },
    { title: 'Top 10 — Aavishkar Research Competition', organization: 'District level', published: true },
    { title: 'Runner-Up — Best Student', year: '2024–2025', published: true }
  ],
  certificates: [], workshops: [], blogs: [],
  settings: { siteTitle: 'Manoj Mourya — Mobile Application Developer', description: 'Mobile developer building healthcare and utility applications with Swift, SwiftUI, Kotlin, and Jetpack Compose.' }
};
