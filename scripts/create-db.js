/**
 * Script to create the reservation_system database.
 * Run: node scripts/create-db.js
 * 
 * Uses .env for DB credentials, or defaults to postgres/postgres.
 */
const { Client } = require('pg');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres', // Connect to default DB to create our DB
};

async function createDatabase() {
  const client = new Client(config);
  try {
    await client.connect();
    await client.query('CREATE DATABASE reservation_system');
    console.log('✅ Database "reservation_system" created successfully!');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('ℹ️  Database "reservation_system" already exists.');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

createDatabase();
