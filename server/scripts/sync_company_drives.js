import db from '../db.js';

async function sync() {
  const pool = db.pool;
  const colRes = await pool.query("SELECT id FROM colleges WHERE code = 'AIT-JAIPUR'");
  if (!colRes.rows.length) return process.exit(0);
  const collegeId = colRes.rows[0].id;

  const adminRes = await pool.query("SELECT id FROM users WHERE email = 'admin@aitjaipur.edu'");
  const adminId = adminRes.rows[0]?.id;

  const compRes = await pool.query(
    "SELECT id, company_name FROM college_partner_companies WHERE college_id = $1 AND LOWER(company_name) LIKE '%jobdm%'", 
    [collegeId]
  );

  if (compRes.rows.length && adminId) {
    const jobdm = compRes.rows[0];
    const existingJob = await pool.query("SELECT id FROM hr_jobs WHERE partner_company_id = $1", [jobdm.id]);
    if (!existingJob.rows.length) {
      await pool.query(`
        INSERT INTO hr_jobs (
          college_id, creator_id, partner_company_id, company_name, title, description, skills, 
          location, job_type, workplace_type, target_domain, min_cgpa, status
        ) VALUES (
          $1, $2, $3, $4, 'Data Analyst (Campus Placement)', 
          'Entry-level Data Analyst opportunity for campus graduates. Strong fundamentals in Python, SQL, DSA and OOPs required.',
          'Python, SQL, DSA, OOPs, Data Analysis', 'Jaipur / Hybrid', 'Full Time', 'Hybrid', 'DATA_SCIENCE', 7.0, 'OPEN'
        )
      `, [collegeId, adminId, jobdm.id, jobdm.company_name]);
      console.log('✅ Created campus drive for JobDM!');
    } else {
      console.log('ℹ️ JobDM already has a campus drive.');
    }
  }

  // Ensure all existing jobs have correct company_name and partner_company_id
  const allComps = await pool.query("SELECT id, company_name FROM college_partner_companies WHERE college_id = $1", [collegeId]);
  for (const c of allComps.rows) {
    await pool.query(`
      UPDATE hr_jobs 
      SET partner_company_id = $1, company_name = $2
      WHERE college_id = $3 AND (partner_company_id = $1 OR LOWER(company_name) = LOWER($2))
    `, [c.id, c.company_name, collegeId]);
  }
  console.log('✅ Synced all partner companies with their drives.');
  process.exit(0);
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
