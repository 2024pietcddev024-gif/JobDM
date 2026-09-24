import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const isValidGeminiKey = GEMINI_KEY && (GEMINI_KEY.startsWith('AIza') || GEMINI_KEY.startsWith('AQ.'));
const genAI = isValidGeminiKey ? new GoogleGenerativeAI(GEMINI_KEY) : null;

if (GEMINI_KEY && !isValidGeminiKey) {
  console.warn('[AI Engine] GEMINI_API_KEY looks invalid. Falling back to offline question bank.');
}

// Map any incoming category string → our fallback bank key
function categoryToKey(category = '') {
  const c = category.toLowerCase().trim();
  if (c.includes('backend') || c.includes('node') || c.includes('server')) return 'backend';
  if (c.includes('frontend') || c.includes('react') || c.includes('ui')) return 'frontend';
  if (c.includes('system') || c.includes('design')) return 'system-design';
  if (c.includes('hr') || c.includes('behav') || c.includes('soft skill')) return 'hr';
  if (c.includes('ai') || c.includes('ml') || c.includes('machine')) return 'aiml';
  if (c.includes('data science') || c.includes('analytics') || c.includes('statistic')) return 'datascience';
  if (c.includes('data') || c.includes('sql') || c.includes('database')) return 'datascience';
  if (c.includes('devops') || c.includes('cloud') || c.includes('aws') || c.includes('docker')) return 'devops';
  if (c.includes('software') || c.includes('algorithm') || c.includes('dsa') || c.includes('general')) return 'software';
  return 'backend';
}

export async function generateQuestion({ category, role, difficulty, resumeData, pastQA = [], questionIndex = 0 }) {
  const askedQuestions = pastQA.map(q => (q.question_text || q.question || '').toLowerCase().slice(0, 60));

  if (!genAI) {
    return generateFallbackQuestion({ category, role, difficulty, pastQA: askedQuestions, questionIndex });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert technical interviewer for a ${difficulty || 'Intermediate'} level ${role || category} interview.
${resumeData ? `Candidate Resume: Skills [${resumeData.extractedSkills?.join(', ')}], Projects [${resumeData.extractedProjects?.map(p => p.name).join(', ')}]` : ''}
Previously asked questions (DO NOT repeat these): ${pastQA.map(q => q.question_text || q.question).join(' | ')}
Question number: ${questionIndex + 1} of 10.

Generate a UNIQUE interview question NOT similar to any previously asked questions.
Vary the type: conceptual, coding, or behavioral. Make it specific and realistic.

Return ONLY valid JSON (no markdown, no backticks):
{
  "question": "The question text here",
  "type": "conceptual",
  "topics": ["topic1", "topic2"],
  "expectedKeywords": ["keyword1", "keyword2"],
  "codingPrompt": null,
  "idealAnswer": "A comprehensive model answer (3-5 sentences) that a strong candidate would give."
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text);
    if (!parsed.idealAnswer) parsed.idealAnswer = 'See the key topics and expected keywords for guidance.';
    return parsed;
  } catch (err) {
    if (err?.status === 403 || err?.message?.includes('403') || err?.message?.toLowerCase().includes('forbidden')) {
      console.error('[AI Engine] Gemini 403 Forbidden — check API key quota.');
    } else {
      console.error('[AI Engine] Error generating question:', err?.message || err);
    }
    return generateFallbackQuestion({ category, role, difficulty, pastQA: askedQuestions, questionIndex });
  }
}

// ─── Expanded Fallback Question Bank ─────────────────────────────────────────
const FALLBACK_QUESTIONS = {
  backend: [
    { question: 'Explain the fundamental differences between REST and GraphQL APIs. When would you choose one over the other?', type: 'conceptual', topics: ['REST', 'GraphQL', 'API Design'], expectedKeywords: ['overfetching', 'underfetching', 'schema', 'caching', 'endpoints'], idealAnswer: 'REST uses fixed endpoints and HTTP methods where the server decides the response shape. GraphQL uses a single endpoint where clients specify exactly what data they need, solving overfetching and underfetching. Choose REST for simple CRUD and public APIs; choose GraphQL when multiple clients need different data shapes or when reducing network calls is critical.' },
    { question: 'How would you handle high traffic spikes on a database? Discuss indexing, connection pooling, and caching.', type: 'conceptual', topics: ['PostgreSQL', 'Redis', 'Performance'], expectedKeywords: ['indexing', 'connection pool', 'cache invalidation', 'read replica', 'sharding'], idealAnswer: 'Use database indexes on frequently queried columns to speed lookups. Connection pooling (e.g., PgBouncer) reduces overhead of creating new connections. Read replicas distribute read load. Redis caching stores hot data in memory to avoid DB hits. For extreme scale, horizontal sharding distributes data across nodes.' },
    { question: 'Design a simple Rate Limiter allowing 5 requests per 10 seconds per IP address.', type: 'coding', topics: ['Rate Limiting', 'Algorithms'], expectedKeywords: ['sliding window', 'token bucket', 'map', 'timestamp'], codingPrompt: '// Complete the RateLimiter class\nclass RateLimiter {\n  constructor(limit = 5, windowMs = 10000) {\n    this.limit = limit;\n    this.windowMs = windowMs;\n    this.requests = new Map();\n  }\n  isAllowed(ip) {\n    // TODO: implement sliding window\n  }\n}', idealAnswer: 'Use a sliding window algorithm. Store timestamps of requests per IP in a Map. On each request, filter out timestamps older than windowMs, check if remaining count < limit, push new timestamp if allowed. Token bucket is an alternative that refills tokens at a constant rate.' },
    { question: 'What is the N+1 query problem in ORMs and how do you solve it?', type: 'conceptual', topics: ['ORM', 'Database', 'Performance'], expectedKeywords: ['eager loading', 'join', 'batch', 'lazy loading', 'dataloader'], idealAnswer: 'N+1 occurs when fetching a list of N items and then making 1 additional query per item (e.g., fetching all users then their profiles one by one). Solutions: use eager loading (JOIN in SQL), batch loading (DataLoader pattern in GraphQL), or SELECT IN queries to fetch all related records in one query.' },
    { question: 'Explain the CAP theorem and how it applies when designing a distributed system.', type: 'conceptual', topics: ['Distributed Systems', 'CAP Theorem'], expectedKeywords: ['consistency', 'availability', 'partition tolerance', 'eventual consistency', 'trade-off'], idealAnswer: 'CAP theorem states a distributed system can guarantee only 2 of: Consistency (all nodes see same data), Availability (every request gets a response), and Partition Tolerance (system works despite network splits). Since network partitions are inevitable, real systems choose CP (consistent but may be unavailable during partition, e.g., HBase) or AP (available but eventually consistent, e.g., Cassandra).' },
    { question: 'How does JWT authentication work? What are its advantages and risks?', type: 'conceptual', topics: ['JWT', 'Authentication', 'Security'], expectedKeywords: ['header', 'payload', 'signature', 'stateless', 'expiration', 'refresh token'], idealAnswer: 'JWT has three parts: header (algorithm), payload (claims), and signature. Server signs the token; clients send it with requests. The server verifies the signature without a DB lookup (stateless). Advantage: scalable, no session store needed. Risks: tokens cannot be invalidated before expiry — mitigate with short expiry + refresh tokens, and store refresh tokens server-side.' },
    { question: 'What is database normalization? Explain 1NF, 2NF, and 3NF with examples.', type: 'conceptual', topics: ['Database Design', 'Normalization', 'SQL'], expectedKeywords: ['1NF', '2NF', '3NF', 'atomic', 'partial dependency', 'transitive dependency'], idealAnswer: '1NF: each column holds atomic (indivisible) values, no repeating groups. 2NF: must be 1NF + no partial dependency (non-key columns depend on the whole composite primary key). 3NF: must be 2NF + no transitive dependency (non-key columns depend only on the primary key, not on other non-key columns). Normalization reduces redundancy and update anomalies.' },
    { question: 'Explain the difference between SQL and NoSQL databases. When would you use each?', type: 'conceptual', topics: ['SQL', 'NoSQL', 'Database'], expectedKeywords: ['ACID', 'schema', 'horizontal scaling', 'document', 'key-value', 'relational'], idealAnswer: 'SQL databases (PostgreSQL, MySQL) enforce a fixed schema, support ACID transactions, and excel at complex joins. Use when data relationships are complex and consistency is critical. NoSQL databases (MongoDB, Cassandra, Redis) offer flexible schemas and horizontal scaling. Use for high-volume unstructured data, real-time apps, or when eventual consistency is acceptable.' },
  ],
  frontend: [
    { question: 'How does React Virtual DOM diffing work? Explain reconciliation and how keys optimize list rendering.', type: 'conceptual', topics: ['React', 'Virtual DOM'], expectedKeywords: ['reconciliation', 'keys', 'fiber', 're-render', 'diffing'], idealAnswer: 'React creates a Virtual DOM — a lightweight JS representation of the real DOM. On state change, React creates a new VDOM, diffs it against the previous one (reconciliation), and only updates changed real DOM nodes. Keys help React identify which list items changed, moved, or were removed — without keys, React re-renders entire lists inefficiently.' },
    { question: 'What is the difference between useMemo and useCallback hooks? When should you use each?', type: 'conceptual', topics: ['React Hooks', 'Performance'], expectedKeywords: ['useMemo', 'useCallback', 'memoization', 'dependency array', 'referential equality'], idealAnswer: 'useMemo memoizes a computed value — re-computes only when dependencies change (prevents expensive calculations on every render). useCallback memoizes a function reference — returns the same function instance unless dependencies change (prevents unnecessary child re-renders when passing callbacks as props). Use useMemo for expensive computations; useCallback when passing stable callbacks to React.memo children.' },
    { question: 'Explain CSS Box Model and the difference between box-sizing: content-box and border-box.', type: 'conceptual', topics: ['CSS', 'Layout'], expectedKeywords: ['margin', 'border', 'padding', 'content', 'border-box', 'content-box'], idealAnswer: 'The CSS Box Model has layers: content, padding, border, margin. With content-box (default), width applies only to content — padding and border add to total size. With border-box, width includes content + padding + border, making layout calculations much more predictable. Most modern CSS resets use `* { box-sizing: border-box; }`.' },
    { question: 'What is Event Delegation in JavaScript and why is it useful?', type: 'conceptual', topics: ['JavaScript', 'DOM', 'Events'], expectedKeywords: ['event bubbling', 'parent', 'target', 'performance', 'dynamic elements'], idealAnswer: 'Event delegation attaches a single event listener to a parent element instead of many listeners on individual children. It works because events bubble up from child to parent. Benefits: fewer listeners (better performance), automatically handles dynamically added elements. Example: listen for clicks on a `<ul>` and check `e.target` to identify which `<li>` was clicked.' },
    { question: 'What is the difference between `==` and `===` in JavaScript? What is type coercion?', type: 'conceptual', topics: ['JavaScript', 'Type System'], expectedKeywords: ['strict equality', 'loose equality', 'type coercion', 'NaN', 'null'], idealAnswer: '`==` (loose equality) converts operands to the same type before comparing (type coercion): `"0" == 0` is true. `===` (strict equality) requires both value and type to match: `"0" === 0` is false. Always prefer `===` to avoid subtle bugs from coercion. Notable: `NaN === NaN` is false; use `Number.isNaN()` instead.' },
    { question: 'What are JavaScript Promises and how do async/await work under the hood?', type: 'conceptual', topics: ['JavaScript', 'Async', 'Promises'], expectedKeywords: ['microtask queue', 'event loop', 'resolve', 'reject', 'then', 'catch'], idealAnswer: 'A Promise represents a future value with states: pending, fulfilled, rejected. async/await is syntactic sugar over Promises — `await` pauses execution of an async function until the Promise resolves, then returns the value. Under the hood, resolved Promises queue microtasks (higher priority than macrotasks like setTimeout). This keeps the event loop non-blocking.' },
  ],
  'system-design': [
    { question: 'How would you design a scalable URL shortener like Bitly? Walk through database schema, hash generation, and caching.', type: 'conceptual', topics: ['URL Shortener', 'Hashing', 'Scalability'], expectedKeywords: ['base62', 'redis cache', 'redirection', 'db sharding', 'collision'], idealAnswer: 'Generate a unique short code using base62 encoding of an auto-increment ID or a hash (MD5 truncated). Store mappings in a DB (id, short_code, original_url). Cache hot short_codes in Redis for O(1) lookup. For scale: use consistent hashing for DB sharding, CDN for redirect responses, and a write-through cache strategy.' },
    { question: 'Design a real-time chat application for 10M daily active users. Discuss WebSockets vs Polling and message persistence.', type: 'conceptual', topics: ['WebSockets', 'Message Queues'], expectedKeywords: ['websockets', 'kafka', 'message queue', 'connection manager', 'fan-out'], idealAnswer: 'Use WebSockets for full-duplex real-time messaging. A connection manager layer maps user IDs to WebSocket server instances. Messages flow through Kafka for durability and fan-out (delivering to offline users). Persist messages in Cassandra (optimized for time-series writes). Use Redis pub/sub for real-time notifications across servers.' },
    { question: 'Design a notification system that sends push, email, and SMS notifications reliably at scale.', type: 'conceptual', topics: ['Notifications', 'Queue', 'Reliability'], expectedKeywords: ['message queue', 'retry', 'dead letter queue', 'idempotency', 'priority'], idealAnswer: 'Decouple producers from consumers using a message queue (SQS/Kafka). Different consumer workers handle push (FCM/APNs), email (SendGrid), and SMS (Twilio). Implement retries with exponential backoff and a dead letter queue for failed notifications. Use idempotency keys to prevent duplicate sends. Priority queues handle critical alerts first.' },
    { question: 'Design YouTube\'s video upload and streaming pipeline. How would you handle transcoding and CDN delivery?', type: 'conceptual', topics: ['Video Streaming', 'CDN', 'Transcoding'], expectedKeywords: ['chunk upload', 'transcoding', 'HLS', 'CDN', 'object storage', 'adaptive bitrate'], idealAnswer: 'Upload in chunks to handle large files and resume. Store raw video in object storage (S3). A job queue triggers transcoding workers that convert to multiple resolutions (360p, 720p, 1080p) in HLS format for adaptive bitrate streaming. Serve via CDN with edge caches close to users. Use pre-signed URLs for secure access.' },
  ],
  hr: [
    { question: 'Tell me about a time you had a technical disagreement with a team member. How did you resolve it?', type: 'behavioral', topics: ['Conflict Resolution', 'Communication'], expectedKeywords: ['situation', 'task', 'action', 'result', 'compromise', 'listen'], idealAnswer: 'Use the STAR method. Describe a specific disagreement (e.g., choice of technology). Explain how you listened to understand their perspective, presented data/evidence for your approach, and found a compromise or deferred to the team\'s decision for the sake of progress. Highlight what you learned from the experience.' },
    { question: 'Describe a project where a tight deadline threatened quality. What tradeoffs did you make?', type: 'behavioral', topics: ['Prioritization', 'Time Management'], expectedKeywords: ['mvp', 'tradeoffs', 'communication', 'deliverable', 'technical debt'], idealAnswer: 'Identify the core MVP features vs nice-to-haves. Communicate the tradeoffs to stakeholders early. Implement the critical path features with good test coverage, while deferring non-critical features with documented technical debt. After delivery, schedule a sprint to address the deferred work. Transparency with leadership is key.' },
    { question: 'Tell me about a time you learned a new technology quickly to complete a project. How did you approach it?', type: 'behavioral', topics: ['Learning Agility', 'Self-Development'], expectedKeywords: ['documentation', 'practice', 'deadline', 'resources', 'applied'], idealAnswer: 'Describe the technology and business context. Explain your learning strategy: reading official docs, building a small proof-of-concept, following tutorials, asking senior developers. Highlight how you applied it to the actual project and the outcome. Emphasize adaptability and structured self-learning.' },
    { question: 'Where do you see yourself in 3-5 years? What are your career goals?', type: 'behavioral', topics: ['Career Goals', 'Ambition'], expectedKeywords: ['growth', 'skills', 'leadership', 'contribution', 'learning'], idealAnswer: 'Be specific and align with the company\'s growth areas. Example: "In 3 years I aim to become a senior engineer proficient in distributed systems, mentor junior team members, and contribute to architectural decisions. In 5 years, I\'d like to lead a team or specialize as a principal engineer in a domain I\'m passionate about." Show ambition while staying grounded.' },
    { question: 'Tell me about your greatest professional failure. What did you learn from it?', type: 'behavioral', topics: ['Self-Awareness', 'Growth Mindset'], expectedKeywords: ['mistake', 'responsibility', 'learned', 'improved', 'outcome'], idealAnswer: 'Choose a real failure that demonstrates self-awareness. Briefly describe what went wrong and own your part of it without blame-shifting. Focus more on what you learned and the concrete changes you made afterward. Show that you can reflect critically on yourself and turn failures into growth opportunities.' },
  ],
  aiml: [
    { question: 'Explain the difference between fine-tuning a foundation model and RAG. When would you choose each?', type: 'conceptual', topics: ['LLMs', 'RAG', 'Fine-tuning'], expectedKeywords: ['embeddings', 'vector db', 'context window', 'hallucination', 'cost', 'domain adaptation'], idealAnswer: 'Fine-tuning trains the model on your domain-specific data to adapt its weights — expensive but produces a model that "knows" your domain style. RAG (Retrieval-Augmented Generation) retrieves relevant documents at inference time and injects them into the prompt — cheaper and keeps knowledge updatable. Use fine-tuning for consistent tone/format; use RAG for dynamic, frequently changing knowledge bases.' },
    { question: 'How would you detect and mitigate bias in a machine learning model?', type: 'conceptual', topics: ['Bias', 'Fairness', 'ML Ethics'], expectedKeywords: ['training data', 'representation', 'fairness metrics', 'disparate impact', 'debiasing'], idealAnswer: 'Audit training data for underrepresentation of demographic groups. Use fairness metrics (demographic parity, equalized odds). Techniques: re-sampling the training set, re-weighting examples, adversarial debiasing, or post-processing model outputs. Monitor model performance disaggregated by sensitive attributes after deployment.' },
    { question: 'Explain the difference between supervised, unsupervised, and reinforcement learning with real examples.', type: 'conceptual', topics: ['ML Fundamentals', 'Learning Types'], expectedKeywords: ['labeled data', 'clustering', 'reward', 'classification', 'regression', 'policy'], idealAnswer: 'Supervised: learn from labeled data (input→output pairs). Examples: image classification, spam detection. Unsupervised: find patterns in unlabeled data. Examples: K-means clustering, PCA for dimensionality reduction. Reinforcement: an agent learns by taking actions in an environment to maximize cumulative reward. Examples: game-playing AI (AlphaGo), robotic control, recommendation systems.' },
  ],
  datascience: [
    { question: 'How would you design an A/B test to measure the impact of a new recommendation algorithm on click-through rate?', type: 'conceptual', topics: ['A/B Testing', 'Statistics'], expectedKeywords: ['control group', 'statistical significance', 'p-value', 'sample size', 'bias', 'power'], idealAnswer: 'Randomly split users into control (old algorithm) and treatment (new algorithm) groups. Define the primary metric (CTR). Calculate required sample size using power analysis (typically 80% power, α=0.05). Run the test long enough to account for novelty effects and weekly seasonality. Analyze using a two-proportion z-test. Check for segment interactions and Simpson\'s paradox.' },
    { question: 'What is overfitting and how do you prevent it in machine learning models?', type: 'conceptual', topics: ['Overfitting', 'Regularization', 'Validation'], expectedKeywords: ['regularization', 'cross-validation', 'dropout', 'early stopping', 'train-test split', 'L1 L2'], idealAnswer: 'Overfitting occurs when a model memorizes training data and fails to generalize to unseen data. Prevention techniques: use train/validation/test splits; k-fold cross-validation; L1/L2 regularization (penalizes large weights); dropout (randomly deactivate neurons during training); early stopping (stop training when validation loss increases); reduce model complexity; increase training data size.' },
    { question: 'Explain the difference between precision and recall. When would you prioritize one over the other?', type: 'conceptual', topics: ['Evaluation Metrics', 'Classification'], expectedKeywords: ['precision', 'recall', 'F1', 'false positive', 'false negative', 'threshold'], idealAnswer: 'Precision = TP/(TP+FP) — of all predicted positives, how many are actually positive. Recall = TP/(TP+FN) — of all actual positives, how many did we find. Prioritize precision when false positives are costly (e.g., spam detection — don\'t mark legitimate emails as spam). Prioritize recall when false negatives are costly (e.g., cancer screening — don\'t miss a true case). F1-score balances both.' },
    { question: 'What is the Central Limit Theorem and why does it matter for data science?', type: 'conceptual', topics: ['Statistics', 'CLT', 'Sampling'], expectedKeywords: ['sample mean', 'normal distribution', 'n', 'hypothesis testing', 'confidence interval'], idealAnswer: 'CLT states that the distribution of sample means approaches a normal distribution as sample size increases (n≥30), regardless of the population\'s original distribution. This is foundational for hypothesis testing and confidence intervals — it justifies using z-tests and t-tests on many real-world datasets and allows inference about population parameters from samples.' },
  ],
  devops: [
    { question: 'Explain the difference between Docker containers and virtual machines. When would you use each?', type: 'conceptual', topics: ['Docker', 'Virtualization', 'Containers'], expectedKeywords: ['hypervisor', 'OS kernel', 'image', 'lightweight', 'isolation', 'portability'], idealAnswer: 'VMs virtualize hardware and run a full OS on a hypervisor — heavier but stronger isolation. Containers share the host OS kernel, making them much lighter and faster to start. Use VMs for strong isolation or running different OS types. Use containers for microservices, CI/CD pipelines, and consistent environment packaging. Kubernetes orchestrates containers at scale.' },
    { question: 'What is CI/CD and how would you design a deployment pipeline for a web application?', type: 'conceptual', topics: ['CI/CD', 'DevOps', 'Automation'], expectedKeywords: ['continuous integration', 'deployment', 'testing', 'staging', 'rollback', 'blue-green'], idealAnswer: 'CI (Continuous Integration): automatically build and test code on every commit. CD (Continuous Delivery/Deployment): automatically deploy to staging or production after CI passes. Pipeline stages: code commit → lint/format → unit tests → integration tests → build Docker image → push to registry → deploy to staging → smoke tests → deploy to production. Use blue-green or canary deployments for zero-downtime releases with easy rollback.' },
  ],
  software: [
    { question: 'Explain the difference between BFS and DFS. Describe a real problem where you\'d prefer each.', type: 'conceptual', topics: ['Algorithms', 'Graph Traversal'], expectedKeywords: ['queue', 'stack', 'shortest path', 'cycle detection', 'level order'], idealAnswer: 'BFS (breadth-first) uses a queue, explores level by level — ideal for finding the shortest path in unweighted graphs. DFS (depth-first) uses a stack/recursion, explores as far as possible before backtracking — ideal for detecting cycles, topological sorting, and finding paths in a maze. BFS example: finding shortest route in a city map. DFS example: detecting circular dependencies in a module graph.' },
    { question: 'What is dynamic programming? Solve the Fibonacci sequence using both memoization and tabulation.', type: 'coding', topics: ['Dynamic Programming', 'Algorithms'], expectedKeywords: ['memoization', 'tabulation', 'overlapping subproblems', 'optimal substructure', 'cache'], codingPrompt: '// Implement both approaches\nfunction fibMemo(n, memo = {}) {\n  // TODO: memoization\n}\n\nfunction fibTab(n) {\n  // TODO: tabulation (bottom-up)\n}', idealAnswer: 'Dynamic programming solves problems with overlapping subproblems by storing results. Memoization (top-down): cache results of fib(n) in a hash map, recursively compute. Tabulation (bottom-up): build a table from base cases fib[0]=0, fib[1]=1, compute fib[i]=fib[i-1]+fib[i-2] iteratively. Both achieve O(n) time vs O(2^n) naive recursion.' },
    { question: 'Explain SOLID principles with a real-world example for each.', type: 'conceptual', topics: ['OOP', 'SOLID', 'Design Principles'], expectedKeywords: ['single responsibility', 'open-closed', 'liskov', 'interface segregation', 'dependency inversion'], idealAnswer: 'S - Single Responsibility: each class has one job (User class only handles user data, not email sending). O - Open/Closed: open for extension, closed for modification (use inheritance/interfaces not if-else chains). L - Liskov Substitution: subclasses must work wherever a parent is expected. I - Interface Segregation: don\'t force clients to implement methods they don\'t use. D - Dependency Inversion: depend on abstractions not concrete implementations.' },
    { question: 'What are the common time complexities (Big O)? Give an example algorithm for each.', type: 'conceptual', topics: ['Complexity', 'Big O', 'Algorithms'], expectedKeywords: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'binary search', 'merge sort'], idealAnswer: 'O(1) - constant: hash map lookup. O(log n) - logarithmic: binary search. O(n) - linear: finding max in array. O(n log n) - linearithmic: merge sort, heapsort. O(n²) - quadratic: bubble sort, nested loops. O(2^n) - exponential: naive recursive Fibonacci. Understanding time complexity lets you predict performance at scale and choose the right algorithm for the data size.' },
  ],
};

function generateFallbackQuestion({ category, role, difficulty, pastQA = [], questionIndex = 0 }) {
  const key = categoryToKey(category);
  const bank = FALLBACK_QUESTIONS[key] || FALLBACK_QUESTIONS['backend'];

  // Filter out already-asked questions
  const available = bank.filter(q =>
    !pastQA.some(asked => asked.includes(q.question.toLowerCase().slice(0, 60)))
  );

  // If all questions used, cycle but still try to pick a less-recently asked one
  const pool = available.length > 0 ? available : bank;
  const q = pool[questionIndex % pool.length];

  return {
    ...q,
    codingPrompt: q.codingPrompt || null,
    idealAnswer: q.idealAnswer || 'Focus on the expected keywords and key concepts listed in the topics.',
    id: `q-fallback-${Date.now()}`
  };
}

// ─── Evaluation ───────────────────────────────────────────────────────────────
export async function evaluateAnswer({ questionText, idealAnswer, expectedKeywords, answer, code, category, metrics = {} }) {
  const trimmedAnswer = (answer || '').trim();
  const trimmedCode = (code || '').trim();
  const totalWords = (trimmedAnswer + ' ' + trimmedCode).trim().split(/\s+/).filter(Boolean).length;

  // If answer is completely empty → return failing score immediately (no AI call needed)
  if (!trimmedAnswer && !trimmedCode) {
    return {
      accuracy: 0, communication: 0, confidence: 0, depth: 0, examples: 0,
      overall: 0,
      verdict: 'No Answer',
      strengths: [],
      improvements: [
        'No answer was provided for this question.',
        'Practice articulating your thoughts even when unsure — a partial answer is better than silence.',
        idealAnswer ? `Model answer: ${idealAnswer}` : 'Review the core concepts for this topic.'
      ],
      detailedFeedback: 'You did not submit an answer for this question. In a real interview, always attempt to answer — even a partial response shows thought process.',
      idealAnswer: idealAnswer || null
    };
  }

  if (!genAI) {
    return generateFallbackEvaluation({ questionText, idealAnswer, answer: trimmedAnswer, code: trimmedCode, metrics, expectedKeywords });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are an expert AI Interview Evaluator for a student preparing for technical interviews.
Question: "${questionText}"
Ideal Answer Reference: "${idealAnswer || 'N/A'}"
Expected Keywords: ${expectedKeywords ? (Array.isArray(expectedKeywords) ? expectedKeywords.join(', ') : expectedKeywords) : 'None'}
Candidate Answer: "${trimmedAnswer || 'No spoken answer provided'}"
Candidate Code: "${trimmedCode || 'N/A'}"
Speech Metrics: WPM: ${metrics.wpm || 'N/A'}, Filler Words: ${metrics.fillerCount || 0}.

IMPORTANT SCORING RULES:
- If the answer is very short (under 10 words) or completely off-topic, accuracy and depth MUST be below 3.
- Do NOT give communication/confidence scores above 5 if the answer was empty or irrelevant.
- Be honest and strict — this helps the student improve.

Score each dimension 1.0-10.0 (be strict and honest):
Return ONLY valid JSON (no backticks):
{
  "accuracy": 7.5,
  "communication": 7.0,
  "confidence": 6.5,
  "depth": 7.0,
  "examples": 6.0,
  "overall": 7.0,
  "verdict": "Hire",
  "strengths": ["Mentioned REST vs GraphQL correctly"],
  "improvements": ["Should have discussed caching strategies"],
  "detailedFeedback": "2-3 sentence honest analysis of what was good and what needs improvement.",
  "idealAnswer": "The ideal answer is: [3-5 sentence model answer]"
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text);
    if (!parsed.idealAnswer) parsed.idealAnswer = idealAnswer || null;
    return parsed;
  } catch (err) {
    console.error('[AI Engine] Evaluation error:', err?.message || err);
    return generateFallbackEvaluation({ questionText, idealAnswer, answer: trimmedAnswer, code: trimmedCode, metrics, expectedKeywords });
  }
}

function generateFallbackEvaluation({ questionText, idealAnswer, answer = '', code = '', metrics = {}, expectedKeywords = [] }) {
  const combined = (answer + ' ' + code).trim();
  const words = combined.split(/\s+/).filter(Boolean).length;
  const keywords = Array.isArray(expectedKeywords) ? expectedKeywords : [];

  // If too short → very low scores
  if (words < 5) {
    return {
      accuracy: 1.0, communication: 1.0, confidence: 1.5, depth: 1.0, examples: 1.0,
      overall: 1.1,
      verdict: 'Needs Practice',
      strengths: [],
      improvements: [
        'Your answer was too brief to be evaluated meaningfully.',
        'Try to provide at least 2-3 sentences explaining your thinking.',
        idealAnswer ? `Model answer: ${idealAnswer}` : 'Study the core concepts for this topic.'
      ],
      detailedFeedback: `Your answer was very short (${words} word${words !== 1 ? 's' : ''}). In a real interview, aim for 3-5 sentences that cover the key concepts, real-world examples, and tradeoffs.`,
      idealAnswer: idealAnswer || null
    };
  }

  let keywordHits = 0;
  keywords.forEach(kw => {
    if (combined.toLowerCase().includes(kw.toLowerCase())) keywordHits++;
  });

  const keyRatio = keywordHits / Math.max(1, keywords.length);
  const fillerPenalty = Math.min(1.5, (metrics.fillerCount || 0) * 0.3);
  const lengthBonus = Math.min(1.5, words / 60);

  const accuracy = Math.min(9.0, Math.max(2.0, keyRatio * 5.0 + 3.0));
  const comm = Math.min(9.0, Math.max(3.0, 6.5 + lengthBonus - fillerPenalty));
  const conf = Math.min(9.0, Math.max(3.5, 7.0 - fillerPenalty));
  const depth = Math.min(9.0, Math.max(2.0, accuracy * 0.8 + (code ? 1.0 : 0)));
  const examples = Math.min(9.0, Math.max(2.0, keywordHits > 1 ? 7.0 : 4.0));
  const overall = Number(((accuracy * 0.35) + (comm * 0.2) + (conf * 0.15) + (depth * 0.2) + (examples * 0.1)).toFixed(1));

  let verdict = 'Hire';
  if (overall >= 8.5) verdict = 'Strong Hire';
  else if (overall < 7.0) verdict = 'Needs Practice';
  else if (overall < 7.5) verdict = 'Weak Hire';

  const strengths = [];
  if (keywordHits > 0) strengths.push(`Mentioned ${keywordHits} of ${keywords.length} core concept(s): ${keywords.slice(0, keywordHits).join(', ')}.`);
  if (words > 50) strengths.push('Provided a detailed response with good length.');
  if ((metrics.fillerCount || 0) <= 2) strengths.push('Fluent delivery with minimal filler words.');
  if (strengths.length === 0) strengths.push('Attempted to address the question — keep building on this.');

  const improvements = [];
  if (keywords.length > 0 && keywordHits < keywords.length) {
    const missing = keywords.filter(k => !combined.toLowerCase().includes(k.toLowerCase())).slice(0, 3);
    if (missing.length) improvements.push(`Key concepts not mentioned: ${missing.join(', ')}. Study these specifically.`);
  }
  if (words < 30) improvements.push('Expand your answer with concrete examples and real-world context.');
  if ((metrics.fillerCount || 0) > 3) improvements.push(`Reduce filler words (${metrics.fillerCount} detected) — practice speaking more deliberately.`);
  if (improvements.length === 0) improvements.push('Practice explaining edge cases and failure scenarios for a stronger answer.');

  const idealRef = idealAnswer ? `\n\nModel Answer: ${idealAnswer}` : '';

  return {
    accuracy: +accuracy.toFixed(1), communication: +comm.toFixed(1),
    confidence: +conf.toFixed(1), depth: +depth.toFixed(1), examples: +examples.toFixed(1),
    overall, verdict, strengths, improvements,
    detailedFeedback: `Your answer scored ${overall}/10 overall. ${strengths[0] || ''} ${improvements[0] || ''}${idealRef}`,
    idealAnswer: idealAnswer || null
  };
}
