import fs from 'fs';
import db from './server/db.js';

const runBackup = async () => {
  try {
    const res = await db.query('SELECT * FROM campus_users');
    fs.writeFileSync('backup.json', JSON.stringify(res.rows, null, 2));
    console.log('Backup created successfully as backup.json');
    process.exit(0);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
};
runBackup();
