// EduRepo – Prisma Seed
// Legt initiale Kataloge (Subjects, Tags) und – falls nicht vorhanden – den
// initialen Administrator an. Wird beim Backend-Start automatisch ausgeführt
// (idempotent).
import { PrismaClient, UserRole, AccountStatus, UiLanguage } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // 1) Fächer-Katalog (mehrsprachig)
  const subjects = [
    { key: 'math', labels: { de: 'Mathematik', fr: 'Mathématiques', it: 'Matematica', en: 'Mathematics' } },
    { key: 'german', labels: { de: 'Deutsch', fr: 'Allemand', it: 'Tedesco', en: 'German' } },
    { key: 'french', labels: { de: 'Französisch', fr: 'Français', it: 'Francese', en: 'French' } },
    { key: 'italian', labels: { de: 'Italienisch', fr: 'Italien', it: 'Italiano', en: 'Italian' } },
    { key: 'english', labels: { de: 'Englisch', fr: 'Anglais', it: 'Inglese', en: 'English' } },
    { key: 'science', labels: { de: 'Natur und Technik', fr: 'Sciences naturelles', it: 'Scienze naturali', en: 'Science & Technology' } },
    { key: 'history', labels: { de: 'Räume, Zeiten, Gesellschaft', fr: 'Espaces, temps, sociétés', it: 'Spazi, tempi, società', en: 'History & Society' } },
    { key: 'arts', labels: { de: 'Gestalten', fr: 'Arts', it: 'Arte', en: 'Arts & Crafts' } },
    { key: 'music', labels: { de: 'Musik', fr: 'Musique', it: 'Musica', en: 'Music' } },
    { key: 'sport', labels: { de: 'Bewegung und Sport', fr: 'Éducation physique', it: 'Educazione fisica', en: 'Physical Education' } },
    { key: 'ethics', labels: { de: 'Ethik, Religionen, Gemeinschaft', fr: 'Éthique, religions, communauté', it: 'Etica, religioni, comunità', en: 'Ethics & Religions' } },
    { key: 'media', labels: { de: 'Medien und Informatik', fr: 'Médias et informatique', it: 'Media e informatica', en: 'Media & IT' } },
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { key: s.key },
      update: { labels: s.labels },
      create: s,
    });
  }

  // 2) Initiale Tags
  const tags = ['Arbeitsblatt', 'Präsentation', 'Quiz', 'Lernzielkontrolle', 'Projekt', 'Differenzierung', 'Inklusion', 'Digital'];
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { name: t },
      update: {},
      create: { name: t },
    });
  }

  // 3) Initialer Administrator
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@edurepo.local').toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hash = await argon2.hash(tempPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        displayName: 'Administrator',
        role: UserRole.ADMIN,
        status: AccountStatus.ACTIVE,
        emailVerified: true,
        passwordHash: hash,
        uiLanguage: UiLanguage.DE,
      },
    });
    console.log('------------------------------------------------------------');
    console.log(' Initialer Administrator angelegt');
    console.log('   E-Mail:    ', adminEmail);
    console.log('   Passwort:  ', tempPassword, ' (nur Development, bitte sofort ändern!)');
    console.log('------------------------------------------------------------');
  } else {
    console.log('Admin existiert bereits – kein neues Passwort generiert.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });