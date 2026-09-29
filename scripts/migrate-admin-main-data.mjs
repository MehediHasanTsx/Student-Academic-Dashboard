import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local
const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(dbUrl);

async function runMigration() {
  console.log('🔄 Running migration for admin roles and main_data...');

  // 1. Add role column to users table
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student';
  `;
  console.log('✅ users.role column ensured (default student)');

  // 2. Set mehedihasantsx as admin
  await sql`
    UPDATE users
    SET role = 'admin'
    WHERE username = 'mehedihasantsx';
  `;
  console.log('✅ mehedihasantsx role updated to admin');

  // 3. Create main_data table
  await sql`
    CREATE TABLE IF NOT EXISTS main_data (
      id VARCHAR(50) PRIMARY KEY,
      semester_id VARCHAR(50) NOT NULL DEFAULT 'semester-5',
      subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
      routine JSONB NOT NULL DEFAULT '[]'::jsonb,
      exams JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES users(id)
    );
  `;
  console.log('✅ main_data table created');

  // 4. Check if main_data has semester-5 record
  const existing = await sql`
    SELECT id FROM main_data WHERE id = 'semester-5';
  `;

  if (existing.length === 0) {
    // Initial 5th semester subjects and routine
    const defaultSubjects = [
      {
        id: 'subj-sem5-530201',
        semesterId: 'semester-5',
        name: 'Microprocessors and Microcontrollers',
        code: '530201',
        credits: 3,
        type: 'theory',
        color: '#3B82F6',
        teacher: 'MK',
        room: '704',
        order: 0,
      },
      {
        id: 'subj-sem5-530202',
        semesterId: 'semester-5',
        name: 'Microprocessors and Microcontrollers Lab',
        code: '530202',
        credits: 1.5,
        type: 'lab',
        color: '#6366F1',
        teacher: 'MK',
        room: 'Microprocessor Lab',
        order: 1,
      },
      {
        id: 'subj-sem5-530203',
        semesterId: 'semester-5',
        name: 'Operating System',
        code: '530203',
        credits: 3,
        type: 'theory',
        color: '#10B981',
        teacher: 'SA / NM',
        room: '704',
        order: 2,
      },
      {
        id: 'subj-sem5-530204',
        semesterId: 'semester-5',
        name: 'Operating System Lab',
        code: '530204',
        credits: 1.5,
        type: 'lab',
        color: '#14B8A6',
        teacher: 'SA / NM',
        room: 'Software Lab 1',
        order: 3,
      },
      {
        id: 'subj-sem5-530205',
        semesterId: 'semester-5',
        name: 'Data Communication',
        code: '530205',
        credits: 3,
        type: 'theory',
        color: '#F59E0B',
        teacher: 'NC',
        room: '704',
        order: 4,
      },
      {
        id: 'subj-sem5-530206',
        semesterId: 'semester-5',
        name: 'Numerical Methods',
        code: '530206',
        credits: 3,
        type: 'theory',
        color: '#EC4899',
        teacher: 'JF',
        room: '704',
        order: 5,
      },
      {
        id: 'subj-sem5-530207',
        semesterId: 'semester-5',
        name: 'Economics',
        code: '530207',
        credits: 3,
        type: 'theory',
        color: '#8B5CF6',
        teacher: 'SHS',
        room: '704',
        order: 6,
      },
    ];

    const defaultRoutine = [
      // Sunday
      { id: 'slot-sun-1', semesterId: 'semester-5', subjectId: 'subj-sem5-530201', dayOfWeek: 'sunday', startTime: '09:00', endTime: '10:30', room: '704', teacher: 'MK' },
      { id: 'slot-sun-2', semesterId: 'semester-5', subjectId: 'subj-sem5-530205', dayOfWeek: 'sunday', startTime: '10:30', endTime: '12:00', room: '704', teacher: 'NC' },
      { id: 'slot-sun-3', semesterId: 'semester-5', subjectId: 'subj-sem5-530206', dayOfWeek: 'sunday', startTime: '12:00', endTime: '13:30', room: '704', teacher: 'JF' },
      // Monday
      { id: 'slot-mon-1', semesterId: 'semester-5', subjectId: 'subj-sem5-530207', dayOfWeek: 'monday', startTime: '09:00', endTime: '10:30', room: '704', teacher: 'SHS' },
      { id: 'slot-mon-2', semesterId: 'semester-5', subjectId: 'subj-sem5-530203', dayOfWeek: 'monday', startTime: '10:30', endTime: '12:00', room: '704', teacher: 'SA' },
      { id: 'slot-mon-3', semesterId: 'semester-5', subjectId: 'subj-sem5-530205', dayOfWeek: 'monday', startTime: '12:00', endTime: '13:30', room: '704', teacher: 'NC' },
      // Tuesday
      { id: 'slot-tue-1', semesterId: 'semester-5', subjectId: 'subj-sem5-530203', dayOfWeek: 'tuesday', startTime: '09:00', endTime: '10:30', room: '704', teacher: 'NM' },
      { id: 'slot-tue-2', semesterId: 'semester-5', subjectId: 'subj-sem5-530206', dayOfWeek: 'tuesday', startTime: '10:30', endTime: '12:00', room: '704', teacher: 'JF' },
      { id: 'slot-tue-3', semesterId: 'semester-5', subjectId: 'subj-sem5-530201', dayOfWeek: 'tuesday', startTime: '12:00', endTime: '13:30', room: '704', teacher: 'MK' },
      // Wednesday
      { id: 'slot-wed-1', semesterId: 'semester-5', subjectId: 'subj-sem5-530207', dayOfWeek: 'wednesday', startTime: '09:00', endTime: '10:30', room: '704', teacher: 'SHS' },
      { id: 'slot-wed-2', semesterId: 'semester-5', subjectId: 'subj-sem5-530202', dayOfWeek: 'wednesday', startTime: '10:30', endTime: '13:30', room: 'Microprocessor Lab', teacher: 'MK' },
      // Thursday
      { id: 'slot-thu-1', semesterId: 'semester-5', subjectId: 'subj-sem5-530204', dayOfWeek: 'thursday', startTime: '09:00', endTime: '12:00', room: 'Software Lab 1', teacher: 'SA / NM' },
    ];

    const adminUser = await sql`SELECT id FROM users WHERE username = 'mehedihasantsx' LIMIT 1;`;
    const adminId = adminUser[0]?.id || null;

    await sql`
      INSERT INTO main_data (id, semester_id, subjects, routine, exams, updated_at, updated_by)
      VALUES (
        'semester-5',
        'semester-5',
        ${JSON.stringify(defaultSubjects)}::jsonb,
        ${JSON.stringify(defaultRoutine)}::jsonb,
        '[]'::jsonb,
        NOW(),
        ${adminId}
      );
    `;
    console.log('✅ Seeded initial main_data for semester-5');
  }

  // Display all users with their roles
  const users = await sql`SELECT id, username, mobile, role FROM users;`;
  console.log('\n👥 Current users and roles:');
  console.table(users);
}

runMigration().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
