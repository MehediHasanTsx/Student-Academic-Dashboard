import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function createProfilesTable() {
  console.log('Creating profiles table...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(100) NOT NULL,
      university VARCHAR(200) NOT NULL,
      department VARCHAR(200) NOT NULL,
      student_id VARCHAR(50) NOT NULL,
      roll_number VARCHAR(50) NOT NULL,
      registration_number VARCHAR(50) NOT NULL,
      batch VARCHAR(50) NOT NULL,
      session VARCHAR(50) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      email VARCHAR(200),
      blood_group VARCHAR(10),
      emergency_contact VARCHAR(100),
      current_semester INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)`;

  console.log('✅ Profiles table created successfully!');
}

createProfilesTable().catch(console.error);
