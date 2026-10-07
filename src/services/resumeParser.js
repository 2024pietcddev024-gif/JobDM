/**
 * Resume Parser Service - Extracts technical skills, projects, and education
 */

export async function parseResumeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const base64Data = dataUrl.split(',')[1];
      const mimeType = file.type || dataUrl.split(';')[0].split(':')[1] || 'text/plain';
      
      resolve({ fileData: base64Data, mimeType, fileName: file.name });
    };

    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
}

export async function parseResumeWithAI(fileData, mimeType, fileName, token) {
  const response = await fetch('/api/interviews/analyze-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fileData, mimeType, fileName })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Diagnostic] Backend returned ${response.status}: ${errText}`);
    throw new Error(`Backend Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  console.log(`[Diagnostic] Backend response parsed:`, data);
  
  if (data && data.success && data.analysis) {
     return {
       fileName,
       uploadDate: new Date().toISOString().split('T')[0],
       extractedSkills: data.analysis.skills || [],
       extractedProjects: data.analysis.projects || [],
       categories: data.analysis.categories || [],
       programmingLanguages: data.analysis.programmingLanguages || [],
       roles: data.analysis.roles || [],
       experienceLevel: data.analysis.experienceLevel || '',
       rawAnalysis: data.analysis
     };
  }
  
  throw new Error('Analysis missing from backend response');
}
