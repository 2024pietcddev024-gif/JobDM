// UI configuration for interview categories
export const MOCK_ROLES = [
  {
    id: 'backend',
    title: 'Backend Developer',
    icon: 'Server',
    description: 'REST APIs, Databases, Caching, Microservices & System Architecture',
    color: 'from-blue-500 to-indigo-600',
    popular: true,
    tags: ['Node.js', 'PostgreSQL', 'Redis', 'GraphQL', 'Docker']
  },
  {
    id: 'frontend',
    title: 'Frontend Developer',
    icon: 'Layout',
    description: 'React, State Management, CSS Architecture, Web Performance & DOM',
    color: 'from-purple-500 to-pink-600',
    popular: true,
    tags: ['React', 'TypeScript', 'Vite', 'Tailwind', 'Performance']
  },
  {
    id: 'system-design',
    title: 'System Design',
    icon: 'Cpu',
    description: 'Scalability, Load Balancing, Sharding, Message Queues & Distributed Systems',
    color: 'from-emerald-500 to-teal-600',
    popular: true,
    tags: ['Kafka', 'CDN', 'CAP Theorem', 'Sharding', 'Consistent Hashing']
  },
  {
    id: 'aiml',
    title: 'AI / ML Engineer',
    icon: 'Brain',
    description: 'LLMs, PyTorch, Model Fine-tuning, RAG, Embeddings & Vector DBs',
    color: 'from-amber-500 to-orange-600',
    popular: false,
    tags: ['PyTorch', 'Transformers', 'RAG', 'Vector DB', 'Prompt Engineering']
  },
  {
    id: 'datascience',
    title: 'Data Science & Analytics',
    icon: 'BarChart2',
    description: 'SQL, Statistical Modeling, A/B Testing, Feature Engineering & Pandas',
    color: 'from-cyan-500 to-blue-600',
    popular: false,
    tags: ['Python', 'SQL', 'Pandas', 'A/B Testing', 'Machine Learning']
  },
  {
    id: 'hr',
    title: 'HR & Behavioral',
    icon: 'Users',
    description: 'STAR Method, Conflict Resolution, Leadership, Adaptability & Culture Fit',
    color: 'from-rose-500 to-pink-500',
    popular: true,
    tags: ['STAR Method', 'Leadership', 'Conflict Resolution', 'Prioritization']
  },
  {
    id: 'software',
    title: 'General Software Engineering',
    icon: 'Code',
    description: 'Data Structures, Algorithms, OOP Principles, Clean Code & Git',
    color: 'from-indigo-500 to-violet-600',
    popular: false,
    tags: ['Data Structures', 'Algorithms', 'Design Patterns', 'Git']
  }
];

export const MOCK_DIFFICULTIES = [
  { id: 'beginner', title: 'Beginner', level: '1-2 YOE', desc: 'Core concepts, fundamental syntax & basic scenarios' },
  { id: 'intermediate', title: 'Intermediate', level: '3-5 YOE', desc: 'Real-world tradeoffs, performance optimizations & design patterns' },
  { id: 'advanced', title: 'Advanced', level: '6+ YOE', desc: 'Complex edge cases, high scalability, fault tolerance & deep dives' }
];

// Offline fallback question bank — used when AI API is unavailable
export const SAMPLE_QUESTIONS_BANK = {
  backend: [
    {
      id: 'q-b1',
      question: 'Explain the fundamental differences between REST and GraphQL APIs. When would you choose one over the other?',
      type: 'conceptual',
      topics: ['REST', 'GraphQL', 'API Design'],
      expectedKeywords: ['overfetching', 'underfetching', 'schema', 'http methods', 'caching', 'endpoints'],
      codingPrompt: null
    },
    {
      id: 'q-b2',
      question: 'How would you handle high traffic spikes on a database? Discuss indexing, connection pooling, and caching strategies with Redis.',
      type: 'conceptual',
      topics: ['PostgreSQL', 'Redis', 'Performance'],
      expectedKeywords: ['indexing', 'connection pool', 'cache invalidation', 'read replica', 'write-through'],
      codingPrompt: null
    },
    {
      id: 'q-b3',
      question: 'Design a simple Rate Limiter in code that permits a maximum of 5 requests per 10 seconds per IP address.',
      type: 'coding',
      topics: ['Rate Limiting', 'Algorithms', 'Sliding Window'],
      codingPrompt: `// Complete the RateLimiter class using sliding window or token bucket strategy
class RateLimiter {
  constructor(limit = 5, windowMs = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = new Map(); // ip -> timestamps[]
  }

  isAllowed(ip) {
    const now = Date.now();
    // TODO: implement rate limiting logic
    
    return true;
  }
}`
    }
  ],
  frontend: [
    {
      id: 'q-f1',
      question: 'How does React Virtual DOM diffing work? Explain reconciliation and how keys help optimize list rendering.',
      type: 'conceptual',
      topics: ['React', 'Virtual DOM', 'Reconciliation'],
      expectedKeywords: ['reconciliation', 'keys', 'tree diffing', 'fiber', 're-render'],
      codingPrompt: null
    },
    {
      id: 'q-f2',
      question: 'Explain how you would optimize a slow React web app that suffers from long load times and unnecessary re-renders.',
      type: 'conceptual',
      topics: ['Performance', 'React', 'Web Vitals'],
      expectedKeywords: ['useMemo', 'useCallback', 'code splitting', 'lazy loading', 'LCP', 'CLS'],
      codingPrompt: null
    },
    {
      id: 'q-f3',
      question: 'Implement a custom JavaScript `useDebounce` hook or function that delays invoking a function until after X milliseconds.',
      type: 'coding',
      topics: ['JavaScript', 'Hooks', 'Debounce'],
      codingPrompt: `// Implement a custom useDebounce hook in React
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // TODO: implement timer logic
    
  }, [value, delay]);

  return debouncedValue;
}`
    }
  ],
  'system-design': [
    {
      id: 'q-s1',
      question: 'How would you design a scalable URL shortener like Bitly? Walk me through database schema, hash generation, and caching.',
      type: 'conceptual',
      topics: ['URL Shortener', 'Hashing', 'Base62', 'Scalability'],
      expectedKeywords: ['base62', 'auto-increment', 'bloom filter', 'redis cache', 'redirection', 'db sharding'],
      codingPrompt: null
    },
    {
      id: 'q-s2',
      question: 'Explain how to build a real-time chat application for 10 million daily active users. Discuss WebSockets vs Polling and message persistence.',
      type: 'conceptual',
      topics: ['WebSockets', 'Message Queues', 'Kafka', 'Redis PubSub'],
      expectedKeywords: ['websockets', 'kafka', 'message queue', 'connection manager', 'presence server'],
      codingPrompt: null
    }
  ],
  hr: [
    {
      id: 'q-h1',
      question: 'Tell me about a time you had a technical disagreement with a team member or senior engineer. How did you resolve it?',
      type: 'behavioral',
      topics: ['STAR Method', 'Conflict Resolution', 'Communication'],
      expectedKeywords: ['situation', 'task', 'action', 'result', 'data-driven', 'compromise', 'respect'],
      codingPrompt: null
    },
    {
      id: 'q-h2',
      question: 'Walk me through a project where a tight deadline threatened quality. What tradeoffs did you make and what was the outcome?',
      type: 'behavioral',
      topics: ['Prioritization', 'Time Management', 'Stakeholder Management'],
      expectedKeywords: ['mvp', 'tradeoffs', 'communication', 'retrospective', 'deliverable'],
      codingPrompt: null
    }
  ]
};
