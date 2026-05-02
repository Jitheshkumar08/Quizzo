# MCQify — Master Implementation Plan

## Project Vision
A full-stack AI-powered quiz platform where Instructors/Admins upload PDFs, AI extracts MCQs, and Students take exams in a clean, timed, exam-like environment.

---

## Tech Stack (Final)

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS + Shadcn UI |
| Database | PostgreSQL via Supabase or Vercel Postgres |
| ORM | Prisma |
| Auth | NextAuth.js v5 (Credentials Provider) |
| AI | OpenAI `gpt-4o-mini` with Structured Outputs |
| PDF Parsing | `pdf-parse` (in-memory Buffer) |
| File Storage | Vercel Blob (PDF + extracted JSON) |
| Deployment | Vercel |

---

## Roles & Permissions

| Feature | Student | Instructor | Admin |
|---|---|---|---|
| Sign up / Login | ✅ | ✅ | ✅ |
| Attempt published quizzes | ✅ | ✅ | ✅ |
| Upload PDF & generate quiz | ❌ | ✅ (own only) | ✅ |
| Edit/publish own quiz | ❌ | ✅ (own only) | ✅ |
| View own quiz JSON file | ❌ | ✅ (own only) | ✅ |
| View all quizzes & JSONs | ❌ | ❌ | ✅ |
| Manage users & change roles | ❌ | ❌ | ✅ |
| View all student results | ❌ | ✅ (own quizzes) | ✅ |

---

## Database Schema (Prisma — Complete)

```prisma
enum Role {
  STUDENT
  INSTRUCTOR
  ADMIN
}

model User {
  id           String    @id @default(uuid())
  fullName     String
  username     String    @unique
  email        String    @unique
  passwordHash String
  role         Role      @default(STUDENT)
  createdAt    DateTime  @default(now())
  quizzes      Quiz[]    // quizzes created by this user
  results      Result[]
}

model Quiz {
  id            String     @id @default(uuid())
  title         String
  description   String?
  createdAt     DateTime   @default(now())
  isPublished   Boolean    @default(false)
  createdById   String
  createdBy     User       @relation(fields: [createdById], references: [id])
  jsonBlobUrl   String?    // Permanent Vercel Blob URL for the extracted JSON
  questions     Question[]
  results       Result[]
}

model Question {
  id             String   @id @default(uuid())
  quizId         String
  questionText   String
  options        Json     // [{ key: "A", text: "..." }, { key: "B", text: "..." }, ...]
  correctAnswer  String   // "A" | "B" | "C" | "D"
  explanation    String?
  order          Int      // question order within the quiz
  quiz           Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
}

model Result {
  id           String   @id @default(uuid())
  quizId       String
  studentId    String
  score        Int
  total        Int
  timeTaken    Int?     // seconds
  userAnswers  Json     // { questionId: "selectedOptionKey", ... }
  createdAt    DateTime @default(now())
  quiz         Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  student      User     @relation(fields: [studentId], references: [id])
}
```

---

## Project Folder Structure

```
mcqify/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Shared sidebar layout
│   │   ├── dashboard/page.tsx          # Role-aware home
│   │   ├── admin/
│   │   │   ├── users/page.tsx          # User management + role changer
│   │   │   └── quizzes/page.tsx        # All quizzes overview
│   │   ├── instructor/
│   │   │   ├── upload/page.tsx         # PDF upload + AI generation
│   │   │   ├── quizzes/page.tsx        # My quizzes list
│   │   │   └── quizzes/[id]/edit/page.tsx  # Preview + inline edit + publish
│   │   └── student/
│   │       ├── quizzes/page.tsx        # Browse published quizzes
│   │       ├── quizzes/[id]/page.tsx   # Take quiz interface
│   │       └── results/page.tsx        # My past results
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── quiz/
│       │   ├── generate/route.ts       # PDF → AI → JSON → Blob save
│       │   ├── save/route.ts           # Save questions to DB + publish
│       │   └── [id]/submit/route.ts    # Score calculation
│       └── admin/
│           └── users/route.ts          # Role update endpoint
├── components/
│   ├── ui/                             # Shadcn components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── quiz/
│   │   ├── UploadZone.tsx              # Drag & drop PDF uploader
│   │   ├── QuestionEditor.tsx          # Inline edit single question card
│   │   ├── QuizPreviewPanel.tsx        # Full preview before publish
│   │   ├── QuizTaker.tsx               # Student exam interface
│   │   ├── QuestionCard.tsx            # Single question during exam
│   │   ├── ProgressSidebar.tsx         # Jump to question + flag indicators
│   │   └── ResultsDashboard.tsx        # Score + review screen
│   └── admin/
│       └── UserTable.tsx               # Users list with role dropdown
├── lib/
│   ├── auth.ts                         # NextAuth config
│   ├── prisma.ts                       # Prisma client singleton
│   ├── openai.ts                       # OpenAI client + prompt
│   ├── pdfParser.ts                    # pdf-parse wrapper
│   └── blobStorage.ts                  # Vercel Blob upload helper
├── prisma/
│   └── schema.prisma
├── middleware.ts                        # Route protection by role
└── .env
```

---

## Step-by-Step Build Plan

### Phase 1 — Project Bootstrap
1. `npx create-next-app@latest mcqify --typescript --tailwind --app`
2. Install: `prisma`, `@prisma/client`, `next-auth@beta`, `pdf-parse`, `openai`, `@vercel/blob`, `shadcn-ui`, `bcryptjs`, `zod`
3. Initialize Prisma, connect to Postgres, run first migration
4. Configure `.env`:
```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
OPENAI_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

---

### Phase 2 — Auth System
- **Signup**: Collect `fullName`, `username`, `email`, `password` → hash with `bcryptjs` → save with `role: STUDENT`
- **Login**: Accept `email or username` + `password` → verify hash → return session with `id`, `role`, `fullName`
- **Middleware**: Protect routes by role using `middleware.ts` — redirect unauthorized users
- **Session**: Store `userId`, `role`, `fullName` in JWT

---

### Phase 3 — AI Generation Pipeline (`/api/quiz/generate`)

```
export const maxDuration = 60  ← required for Vercel

Incoming: FormData { pdf: File, title: string }

Step 1: Read file as Buffer (never write to disk)
Step 2: pdf-parse(buffer) → raw text string
Step 3: Truncate text to ~12,000 tokens if needed
Step 4: Send to OpenAI with Structured Output schema
Step 5: Receive guaranteed JSON array of questions
Step 6: Upload JSON to Vercel Blob → get permanent URL
Step 7: Return { questions: [...], jsonBlobUrl } to frontend
```

**OpenAI Prompt (in `lib/openai.ts`):**
```
You are an expert quiz creator. Given the educational text below, generate as many
high-quality multiple choice questions as possible that comprehensively cover the key
concepts. Each question must have exactly 4 options (A, B, C, D), one clearly correct
answer, and a brief explanation of why that answer is correct.

Rules:
- Questions must be clear, unambiguous, and directly based on the provided text
- Distractors (wrong options) must be plausible but clearly incorrect
- Explanations must reference the source material
- Do not repeat questions
- Output ONLY valid JSON — no markdown, no preamble

Output format:
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct_answer": "A",
    "explanation": "..."
  }
]

Text:
{TEXT}
```

---

### Phase 4 — Admin / Instructor Quiz Editor
- After generation, render each question as an editable card (`QuestionEditor`)
- Admin/Instructor can: edit question text, edit any option, change correct answer, delete a question, add a blank question
- "Publish" button → calls `/api/quiz/save` → saves questions to DB, marks `isPublished: true`, stores `jsonBlobUrl` on the Quiz record
- The JSON file on Vercel Blob is **permanent and scoped to the creator** — only the creator (Instructor) and Admin can access the blob URL from the DB

---

### Phase 5 — Student Quiz Interface
```
QuizTaker state:
{
  currentPage: number,          // 5 questions per page
  answers: Map<questionId, key>,
  flagged: Set<questionId>,
  timeElapsed: number
}
```

**UI Features:**
- Top bar: Quiz title + live timer (counts up) + Submit button
- Left sidebar: Grid of question numbers — color coded:
  - ⬜ Not visited
  - 🔵 Answered
  - 🟠 Flagged for review
  - 🔴 Skipped (visited but not answered)
- Each question card: 4 radio options + "Flag for Review" toggle + "Clear Response" button
- Pagination: Previous / Next page (5 questions each)
- Submit → confirmation modal → POST to `/api/quiz/[id]/submit`

---

### Phase 6 — Scoring & Results
**`/api/quiz/[id]/submit`:**
- Receives `{ userAnswers: { questionId: selectedKey } }`
- Fetches correct answers from DB (never trust client)
- Calculates score server-side
- Saves `Result` record to DB
- Returns full result with per-question breakdown

**Results Dashboard:**
- Score card: "You scored 18/25 (72%)"
- Stats: ✅ Correct | ❌ Incorrect | ⬜ Unattempted
- Per-question review: Shows selected answer vs correct answer + AI explanation
- Option to retake or go back to quiz list

---

### Phase 7 — Admin Dashboard
- **User Table**: All users with columns: Name, Username, Email, Role (dropdown to change), Joined date
- **Role change**: PATCH `/api/admin/users` → updates role in DB → takes effect on next login
- **All Quizzes view**: Table of every quiz with creator name, status, question count, download JSON button (fetches `jsonBlobUrl`)

---

## Key Vercel Rules Checklist

- [ ] `export const maxDuration = 60` on all heavy API routes (generate, submit)
- [ ] PDF processed as `Buffer` — never written to `/tmp` or local disk
- [ ] JSON saved to **Vercel Blob** (permanent) — not to the filesystem
- [ ] All secrets in `.env` and Vercel Environment Variables dashboard
- [ ] Prisma uses `DATABASE_URL` with connection pooling (`?pgbouncer=true&connect_timeout=10`)
- [ ] `bcryptjs` used (not native `bcrypt`) — bcrypt has native binary issues on Vercel

---

## Environment Variables Template

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/mcqify?pgbouncer=true"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-domain.vercel.app"

# AI
OPENAI_API_KEY="sk-..."

# Vercel Blob (for permanent JSON storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

---

## Summary of What Gets Built

1. **Auth system** — Signup/Login with full name, username, email, password. Default role: Student.
2. **Role system** — Student / Instructor / Admin. Admin changes roles from dashboard.
3. **PDF → AI pipeline** — Upload PDF, extract text in memory, send to GPT-4o-mini with structured output, get perfect JSON.
4. **Permanent JSON storage** — Every generated quiz JSON is saved to Vercel Blob permanently, accessible only to the creator and Admin.
5. **Quiz editor** — Inline edit questions/answers before publishing.
6. **Exam interface** — Paginated, flagging, progress sidebar, timer.
7. **Results & review** — Score, breakdown, AI explanations per question.
8. **Admin dashboard** — User management, role assignment, all-quiz oversight.