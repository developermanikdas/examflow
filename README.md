# ExamFlow — Modular Online Examination Platform

ExamFlow is a complete, production-minded online examination platform inspired by Google's product design philosophy. It allows administrators to upload versioned JSON question papers, customize authoritative examination timers, distribute PIN-protected shareable links to students, autosave answers with reload recovery, automatically evaluate MCQs, and grade written questions manually.

---

## Features

- **Google Workspace Aesthetic:** Built with official Material UI (MUI) components, subtle elevations, Roboto typography, and clean hierarchy.
- **Server-Authoritative Timer:** Eliminates reload or clock-tampering cheats. Hard server-side expiration automatically submits student papers.
- **Strict JSON Question Paper Validation:** Built with Zod (v1.0 schema). Validates question types, options, unique IDs, and calculates duration.
- **Automatic MCQ Grading:** Evaluates MCQs instantaneously upon submission.
- **Manual Written-Answer Grading:** Allows instructors to review student text, compare against expected answer guides, award partial marks, and leave comments.
- **Distributed Brute-Force Defense:** MongoDB-backed atomic rate limiter with 30-minute IP lockout.
- **Idempotent Submission & Autosave:** Debounced autosaving with immediate flush on question navigation.
- **JSON Data Exports:** One-click download of individual attempts or all submissions for an exam.
- **Downloadable Demo Template:** Downloadable static JSON paper located at `/demo-exam-template.json`.

---

## 1. Prerequisites

- **Node.js**: v18.17.0 or newer (Tested on v24)
- **npm**: v9.0.0 or newer
- **MongoDB Atlas** cluster or a local MongoDB 6.0+ instance

---

## 2. Dependency Installation

Clone or navigate to the repository directory and install dependencies:

```bash
cd examflow
npm install
```

---

## 3. MongoDB Atlas Configuration

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a Database User with read and write privileges (e.g. `examflow_user`).
3. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for cloud deployment).
4. Retrieve your connection string in the format:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```
   *(Note: Ensure the database name is specified before the query string, e.g. `/examflow?`)*

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# JWT & Authentication Secret
JWT_SECRET=your_jwt_secret_here

# Environment Mode
NODE_ENV=development

# App Base URL (Used for generating student shareable links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Initial Admin Credentials (used during bootstrap/initialization)
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=your_secure_password_here
INITIAL_ADMIN_NAME=System Administrator

# Security & Rate Limiting Configurations
ADMIN_MAX_LOGIN_ATTEMPTS=5
ADMIN_LOCKOUT_MINUTES=30
COOKIE_SECURE=false
TRUSTED_PROXY_COUNT=1
```

---

## 5. Initial Admin Account Bootstrap

ExamFlow automatically initializes the first administrator account when you log in for the first time using the credentials configured in `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in your `.env.local`.

Alternatively, you can trigger the secure initialization endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/init
```

---

## 6. Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- **Admin Portal**: [http://localhost:3000/admin-login](http://localhost:3000/admin-login) (Log in with the credentials defined in `.env.local`)
- **Demo Paper**: [http://localhost:3000/demo-exam-template.json](http://localhost:3000/demo-exam-template.json)

---

## 7. Building for Production

Compile and build the optimized production bundle:

```bash
npm run build
npm run start
```

---

## 8. Deploying to Vercel

1. Push your code to GitHub, GitLab, or Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and import the repository.
3. In **Environment Variables**, set:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI.
   - `JWT_SECRET`: A strong 64-character secret.
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_APP_URL`: Your custom domain or Vercel URL.
   - `COOKIE_SECURE`: `true`
4. Click **Deploy**.

---

## 9. Demo Question Paper Usage

1. Log into the Admin Console at `/admin-login`.
2. Navigate to **Examinations** &rarr; **Create Examination**.
3. Click **Download Demo JSON Template** to save `demo-exam-template.json`.
4. Upload or drag & drop the file into the upload zone.
5. Review the automatic duration formula breakdown.
6. Click **Publish Immediately & Get Link**.
7. Copy the student link (e.g. `http://localhost:3000/exam/ex-xxxx`) and PIN to test as a student!

---

## 10. Automated End-to-End Verification

ExamFlow comes with an automated test suite verifying all 20 architectural requirements:

```bash
node test-e2e.js
```

---

## License

MIT License &copy; 2026 ExamFlow.
