const { Client } = require('pg');
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

async function main() {
  const c = new Client(cfg);
  await c.connect();

  await c.query(`UPDATE users SET name = 'Dr. Balkis Skouri' WHERE role = 'ADMIN'`);
  await c.query(
    `UPDATE professionals SET specialty = 'Chirurgien-Dentiste', bio = 'Votre dentiste de confiance — Soins dentaires, orthodontie et esthétique dentaire' WHERE slug = 'docteur'`,
  );

  const r = await c.query(
    `SELECT u.name, p.specialty, p.bio FROM users u JOIN professionals p ON p."userId" = u.id WHERE u.role = 'ADMIN'`,
  );
  console.log('Updated:', r.rows);
  await c.end();
}

main().catch(console.error);
