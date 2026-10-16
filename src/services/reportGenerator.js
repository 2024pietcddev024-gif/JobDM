/**
 * Post-Interview PDF Report Exporter
 */

export function exportReportAsPDF(session, userProfile) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JobDM Performance Report - ${session.role}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; background: #ffffff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
        .score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; justify-content: space-around; margin-bottom: 30px; text-align: center; }
        .score-num { font-size: 32px; font-weight: 800; color: #4f46e5; }
        .score-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .tag { display: inline-block; background: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-right: 6px; margin-bottom: 6px; }
        .tag-danger { background: #fee2e2; color: #991b1b; }
        .q-card { background: #fafafa; border-left: 4px solid #4f46e5; padding: 14px 18px; margin-bottom: 14px; border-radius: 0 8px 8px 0; }
        .q-title { font-weight: 600; color: #0f172a; margin-bottom: 6px; }
        .q-ans { font-size: 14px; color: #475569; font-style: italic; margin-bottom: 8px; }
        .q-feedback { font-size: 13px; color: #166534; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">JobDM</div>
          <div style="font-size: 14px; color: #64748b;">AI-Powered Mock Interview Assessment</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600;">Candidate: ${userProfile?.name || 'Alex Rivera'}</div>
          <div style="font-size: 13px; color: #64748b;">Date: ${new Date(session.date || Date.now()).toLocaleDateString()}</div>
        </div>
      </div>

      <div class="score-card">
        <div>
          <div class="score-num">${session.overallScore} / 10</div>
          <div class="score-label">Overall Composite Score</div>
        </div>
        <div>
          <div class="score-num" style="color: #059669;">${session.scores?.accuracy || 8.5}</div>
          <div class="score-label">Technical Accuracy</div>
        </div>
        <div>
          <div class="score-num" style="color: #2563eb;">${session.scores?.communication || 8.0}</div>
          <div class="score-label">Communication</div>
        </div>
        <div>
          <div class="score-num" style="color: #d97706;">${session.scores?.confidence || 8.5}</div>
          <div class="score-label">Confidence</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Session Metadata</div>
        <div style="font-size: 14px; line-height: 1.6;">
          <strong>Target Role:</strong> ${session.role} (${session.difficulty} Level)<br/>
          <strong>Questions Asked:</strong> ${session.questionsCount || 10} Questions<br/>
          <strong>Duration:</strong> ${session.durationMinutes || 25} Minutes<br/>
          <strong>Speech Metrics:</strong> Average ${session.avgWpm || 135} WPM | ${session.fillerWordsCount || 4} Filler Words Detected
        </div>
      </div>

      <div class="grid">
        <div class="section">
          <div class="section-title">Strong Topics</div>
          <div>
            ${(session.strongTopics || ['REST vs GraphQL', 'Redis Caching', 'Database Indexing']).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="section">
          <div class="section-title">Areas for Improvement</div>
          <div>
            ${(session.weakTopics || ['System Sharding', 'Kafka Partitions']).map(t => `<span class="tag tag-danger">${t}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Executive AI Summary & Action Plan</div>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          ${session.summary || 'Strong candidate performance with articulate responses across conceptual questions. Continue refining distributed systems edge cases.'}
        </p>
      </div>

      <div class="footer">
        Generated by JobDM Platform • Verified AI Evaluation Report
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
