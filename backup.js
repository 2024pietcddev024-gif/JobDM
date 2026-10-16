import { exec } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  exec('pg_dump -U postgres postgres -f pre_migration_backup.sql', (err, stdout, stderr) => {
    if (err) { console.error('Backup failed:', err.message); process.exit(0); }
    console.log('Backup created successfully as pre_migration_backup.sql');
    process.exit(0);
  });
} else {
  exec(`pg_dump "${dbUrl}" -f pre_migration_backup.sql`, (err, stdout, stderr) => {
    if (err) { console.error('Backup failed:', err.message); process.exit(0); }
    console.log('Backup created successfully as pre_migration_backup.sql');
    process.exit(0);
  });
}
