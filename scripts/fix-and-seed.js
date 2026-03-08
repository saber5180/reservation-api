const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const cfg = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'reservation_system',
    };

const ADMIN = {
  email: 'admin@cabinet.com',
  password: 'Admin123!',
  name: 'Dr. Cabinet',
  phone: '+33600000000',
};

const PROFILE = {
  specialty: 'Médecin Généraliste',
  bio: 'Votre médecin de confiance',
  slug: 'docteur',
};

async function main() {
  const c = new Client(cfg);
  await c.connect();
  console.log('Connected to database.');

  try {
    // 1. Check existing enum values
    const enumRes = await c.query(
      `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')`,
    );
    const enumValues = enumRes.rows.map((r) => r.enumlabel);
    console.log('Current enum values:', enumValues);

    // 2. Add ADMIN to enum if missing
    if (!enumValues.includes('ADMIN')) {
      await c.query(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'ADMIN'`);
      console.log('Added ADMIN to users_role_enum.');
    }

    // 3. Update PROFESSIONAL users to ADMIN (only if PROFESSIONAL exists)
    if (enumValues.includes('PROFESSIONAL')) {
      const upd = await c.query(`UPDATE users SET role = 'ADMIN' WHERE role = 'PROFESSIONAL'`);
      console.log(`Updated ${upd.rowCount} PROFESSIONAL users to ADMIN.`);
    }

    // 4. List current users for debugging
    const usersRes = await c.query(`SELECT id, email, phone, name, role FROM users`);
    console.log('Current users:', usersRes.rows);

    // 5. Check if admin user exists
    const existing = await c.query(`SELECT id FROM users WHERE email = $1`, [ADMIN.email]);
    let adminId;

    if (existing.rows.length > 0) {
      adminId = existing.rows[0].id;
      // Make sure it's ADMIN role
      await c.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [adminId]);
      console.log('Admin user already exists:', adminId);
    } else {
      const hash = await bcrypt.hash(ADMIN.password, 10);
      const ins = await c.query(
        `INSERT INTO users (id, email, password, name, phone, role, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ADMIN', NOW())
         RETURNING id`,
        [ADMIN.email, hash, ADMIN.name, ADMIN.phone],
      );
      adminId = ins.rows[0].id;
      console.log('Created admin user:', adminId);
    }

    // 6. Check if professional profile exists for this admin
    const profExist = await c.query(
      `SELECT id FROM professionals WHERE "userId" = $1`,
      [adminId],
    );

    if (profExist.rows.length > 0) {
      console.log('Professional profile already exists:', profExist.rows[0].id);
    } else {
      // Check if slug already taken
      const slugCheck = await c.query(
        `SELECT id FROM professionals WHERE slug = $1`,
        [PROFILE.slug],
      );
      if (slugCheck.rows.length > 0) {
        // Delete old profile with this slug
        const oldId = slugCheck.rows[0].id;
        await c.query(`DELETE FROM availability WHERE "professionalId" = $1`, [oldId]);
        await c.query(`DELETE FROM reservations WHERE "professionalId" = $1`, [oldId]);
        await c.query(`DELETE FROM professionals WHERE id = $1`, [oldId]);
        console.log('Removed old professional with slug "docteur":', oldId);
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const bookingLink = `${baseUrl}/booking/${PROFILE.slug}`;
      const profIns = await c.query(
        `INSERT INTO professionals (id, "userId", specialty, bio, slug, "bookingLink", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [adminId, PROFILE.specialty, PROFILE.bio, PROFILE.slug, bookingLink],
      );
      console.log('Created professional profile:', profIns.rows[0].id);
    }

    console.log('\nDone! Admin credentials:');
    console.log(`  Email: ${ADMIN.email}`);
    console.log(`  Password: ${ADMIN.password}`);
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await c.end();
  }
}

main();
