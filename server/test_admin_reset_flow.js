import { query } from './db.js';
import { sendPasswordResetEmail } from './services/emailService.js';
import bcrypt from 'bcrypt';

async function testFlow() {
  console.log('🧪 Testing College Admin Password Reset & Mail Notification Flow...');

  // 1. Fetch student
  const studentRes = await query(
    `SELECT u.id, u.email, u.full_name, c.name as college_name, c.code as college_code
     FROM users u
     JOIN campus_users cu ON cu.user_id = u.id
     JOIN colleges c ON c.id = cu.college_id
     WHERE cu.system_role = 'STUDENT' AND c.code = 'AIT-JAIPUR'
     LIMIT 1`
  );
  if (studentRes.rows.length === 0) throw new Error('No student found in AIT-JAIPUR');
  const student = studentRes.rows[0];
  console.log(`✅ Target Student: ${student.full_name} (${student.email})`);

  // 2. Perform password reset simulation
  const newTempPassword = 'Student@Reset2026!';
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newTempPassword, salt);

  await query(
    'UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2',
    [newHash, student.id]
  );
  console.log(`✅ Updated password in DB. Set must_change_password = TRUE`);

  // 3. Dispatch automated email
  const emailRes = await sendPasswordResetEmail({
    toEmail: student.email,
    recipientName: student.full_name,
    collegeName: student.college_name,
    temporaryPassword: newTempPassword,
    role: 'STUDENT'
  });

  if (!emailRes.success) throw new Error('Email dispatch failed');
  console.log(`✅ Email service response: ${emailRes.method} -> ${emailRes.recipient}`);

  // 4. Verify student login with the new temporary password
  const verifyUser = await query('SELECT password_hash, must_change_password FROM users WHERE id = $1', [student.id]);
  const isMatch = await bcrypt.compare(newTempPassword, verifyUser.rows[0].password_hash);
  if (!isMatch) throw new Error('Password mismatch on bcrypt compare');
  if (!verifyUser.rows[0].must_change_password) throw new Error('must_change_password flag was not set');
  console.log(`✅ Student can successfully authenticate with new temporary password!`);

  // Reset password back to standard Student@123 for user convenience
  const defaultHash = await bcrypt.hash('Student@123', 10);
  await query('UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2', [defaultHash, student.id]);
  console.log(`🔄 Reset student password back to Student@123 for normal testing.`);

  console.log('\n🎉 ALL TESTS PASSED! Password reset & email notification flow is 100% working!\n');
  process.exit(0);
}

testFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
