import 'dotenv/config';
import path from 'node:path';
import { openDb } from './db.js';
import { pullAllSheets, type SheetsEnv } from './sheets.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const env: SheetsEnv = {
    SPREADSHEET_ID: requireEnv('SPREADSHEET_ID'),
    GOOGLE_CLIENT_EMAIL: requireEnv('GOOGLE_CLIENT_EMAIL'),
    GOOGLE_PRIVATE_KEY: requireEnv('GOOGLE_PRIVATE_KEY'),
  };
  const dataDir = path.resolve(process.env.DATA_DIR || './data');
  const db = openDb(dataDir);
  console.log(`Importing all sheets into ${dataDir}/zenith.db …`);
  await pullAllSheets(env, db);
  console.log('Done.');
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
