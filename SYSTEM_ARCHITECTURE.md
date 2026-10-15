# JobDM System Architecture and Data Flow

This document outlines the system architecture and data flow for the JobDM platform based on its current implementation and the planned target architecture.

## 1. System Design Architecture

### 1.1 Current Architecture (Client-Side SPA)
Currently, JobDM operates entirely as a client-side Single Page Application (SPA). There is no operational backend server or database. State is managed via React Context and persisted in the browser's Local Storage. External API calls (like to the Google Gemini API) are made directly from the client.

```mermaid
graph TD
    User((User)) --> ReactApp[React Application Vite]
    
    subgraph Frontend Client
        ReactApp --> AuthCtx[AuthContext]
        ReactApp --> IntCtx[InterviewContext]
        AuthCtx --> LS[(Browser Local Storage)]
        IntCtx --> LS
        ReactApp --> AIEngine[AI Engine Service]
    end
    
    AIEngine -- "Insecure API Calls" --> Gemini[Google Gemini API]
```

### 1.2 Planned Target Architecture (Full-Stack)
The intended architecture (as inferred from the project documentation and SQL schema) involves a Node.js/Express backend with a PostgreSQL database. This resolves the security issue of exposing API keys on the client and allows for robust data persistence.

```mermaid
graph TD
    User((User)) --> Frontend[React Frontend]
    
    subgraph Client Layer
        Frontend
    end
    
    subgraph Backend Server Node.js/Express
        Frontend -- "REST API" --> APIRouter[API Router]
        APIRouter --> AuthRoutes[Auth Controller]
        APIRouter --> InterviewRoutes[Interview Controller]
        APIRouter --> UserRoutes[User Controller]
        InterviewRoutes --> AIService[AI Service]
    end
    
    subgraph Data Layer
        AuthRoutes --> DB[(PostgreSQL)]
        InterviewRoutes --> DB
        UserRoutes --> DB
    end
    
    AIService -- "Secure API Calls" --> Gemini[Google Gemini API]
```

## 2. Data Flow Diagrams

### 2.1 Interview Session Data Flow (Current Implementation)
The following sequence diagram illustrates how data flows when a user starts an interview and submits an answer in the current client-side implementation.

```mermaid
sequenceDiagram
    actor User
    participant Component as React Component
    participant Context as InterviewContext
    participant AI as aiEngine (Service)
    participant Storage as LocalStorage
    participant Gemini as Gemini API

    User->>Component: 1. Starts Interview Session
    Component->>Context: 2. initializeSession(role, difficulty)
    Context->>AI: 3. generateQuestions(role)
    AI->>Gemini: 4. Request Questions
    Gemini-->>AI: 5. Return Questions
    AI-->>Context: 6. Questions Array
    Context->>Storage: 7. Save Session State
    Context-->>Component: 8. Session Ready
    Component-->>User: 9. Display Question 1
    
    User->>Component: 10. Submits Answer
    Component->>Context: 11. submitAnswer(answerText)
    Context->>AI: 12. evaluateAnswer(question, answer)
    AI->>Gemini: 13. Request Evaluation
    Gemini-->>AI: 14. Return Score & Feedback
    AI-->>Context: 15. Evaluation Result
    Context->>Storage: 16. Update Session State
    Context-->>Component: 17. Show Feedback
    Component-->>User: 18. Display Feedback & Next Question
```

### 2.2 Database Schema Entity Relationship (Planned)
Based on the `backend_schema.sql`, the planned database structure can be visualized as follows:

```mermaid
erDiagram
    USERS ||--o{ RESUMES : has
    USERS ||--o{ INTERVIEW_SESSIONS : conducts
    USERS ||--o{ CODING_ATTEMPTS : makes
    INTERVIEW_SESSIONS ||--o{ QUESTIONS : contains
    QUESTIONS ||--o{ ANSWERS : has
    ANSWERS ||--o| SCORES : receives

    USERS {
        UUID id PK
        VARCHAR email
        VARCHAR password_hash
        VARCHAR target_role
    }
    
    INTERVIEW_SESSIONS {
        UUID id PK
        UUID user_id FK
        VARCHAR category
        DECIMAL overall_score
    }
    
    QUESTIONS {
        UUID id PK
        UUID session_id FK
        TEXT question_text
    }
    
    ANSWERS {
        UUID id PK
        UUID question_id FK
        TEXT transcript
        TEXT code_content
    }
    
    SCORES {
        UUID id PK
        UUID answer_id FK
        DECIMAL accuracy_score
        DECIMAL overall_score
    }
```
