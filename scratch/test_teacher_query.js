import db from '../server/db.js';

async function test() {
  const query = `
    SELECT 
      cu.id as campus_user_id,
      cu.user_id,
      cu.college_id,
      cu.status,
      cu.created_at,
      u.full_name,
      u.email,
      c.name as college_name,
      c.code as college_code,
      COUNT(DISTINCT bt.batch_id)::int as batch_count,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', b.id, 'name', b.name, 'academic_year', b.academic_year))
        FILTER (WHERE b.id IS NOT NULL), '[]'::json
      ) as batches,
      COUNT(DISTINCT se.student_user_id)::int as student_count
    FROM campus_users cu
    JOIN users u ON cu.user_id = u.id
    JOIN colleges c ON cu.college_id = c.id
    LEFT JOIN batch_tutors bt ON bt.tutor_user_id = u.id
    LEFT JOIN batches b ON bt.batch_id = b.id
    LEFT JOIN student_enrollments se ON se.batch_id = bt.batch_id AND se.status = 'ACTIVE'
    WHERE cu.system_role = 'TUTOR'
    GROUP BY cu.id, cu.user_id, cu.college_id, cu.status, cu.created_at, u.full_name, u.email, c.name, c.code
    ORDER BY cu.created_at DESC
    LIMIT 10;
  `;

  const res = await db.query(query);
  console.log('Found teachers:', res.rows.length);
  res.rows.forEach(t => {
    console.log(`- ${t.full_name} (${t.email}): batches=${JSON.stringify(t.batches)}, student_count=${t.student_count}`);
  });
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
