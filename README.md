# 🎓 DCC CSE

A complete, production-ready, offline-first Progressive Web App (PWA) and Android application built for **Dhaka City College CSE students** to manage their entire academic life in one unified, modern dashboard.

> **Note:** This is an independent student project. It is not officially endorsed by or affiliated with Dhaka City College.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-Dexie.js_v4-green)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## ✨ Features

- 🔐 **Secure Authentication**:
  - Username + Mobile Number + Password registration
  - Server-side password hashing (bcryptjs, 12 rounds)
  - HTTP-only session cookies with 30-day expiry
  - Multi-user support with isolated local data per account

- 📅 **Mobile-First Attendance Tracking**:
  - Quick-mark 4-column status matrix (`Present`, `Absent`, `Late`, `No Class`)
  - Automatically handles non-conducted statuses (`Medical Leave`, `Holiday`, `No Class`)
  - **Attendance Target Analyzer**: Calculates exact classes to miss/attend to reach target percentage

- 📊 **GPA & CGPA Suite**:
  - **Semester GPA Calculator**: Grade selection linked to university grade scales
  - **Weighted CGPA Overview**: True credit-weighted CGPA calculation across 8 semesters
  - **Target CGPA Calculator**: Required future GPA calculation with validation

- 💳 **Fees & Payment Tracker**:
  - Track semester fees, admission, registration, exam, and lab fees
  - Record partial and full payments with date and payment method
  - Automatic balance calculation formatted in BDT (`৳`)

- 🗓️ **Class Routine**:
  - Weekly schedule organized Saturday to Friday with today's class highlighting

- 📝 **Assignments & Exam Deadlines**:
  - Assignment tracking with priority tags and overdue alerts
  - Upcoming exam countdown badges

- 📓 **Notes & Search**:
  - Rich study notes linked to subjects with instant full-text search

- 📈 **Analytics & Insights**:
  - Interactive visual charts powered by Recharts

- 📁 **Lab Projects & Coursework Archive**:
  - Organize experiments, lab reports, source code, tags, and demo URLs

- 🔒 **Offline-First & Privacy-Focused**:
  - Built with Dexie.js (IndexedDB) — **100% client-side academic data storage**
  - Full JSON backup export and restore capabilities
  - Server only stores authentication credentials (never academic data)

- 📱 **Progressive Web App (PWA)**:
  - Installable on mobile and desktop devices with offline service worker support

- 🤖 **Android App (Capacitor)**:
  - Ready for APK generation and Google Play Store publication

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), `next-themes` (Dark / Light / System mode)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives, Lucide Icons, Sonner Toasts)
- **Client Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper with live query hooks)
- **Server Database**: [Neon PostgreSQL](https://neon.tech/) (authentication data only)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (type-safe SQL)
- **Auth**: bcryptjs + HTTP-only session cookies
- **Charts**: [Recharts](https://recharts.org/)
- **Forms & Validation**: `react-hook-form` + `zod`
- **Mobile**: [Capacitor](https://capacitorjs.com/) (Android)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- A [Neon](https://neon.tech) PostgreSQL database (free tier)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MehediHasanTsx/Student-Academic-Dashboard.git
   cd Student-Academic-Dashboard
   ```

2. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file:
   ```env
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

4. **Push database schema**:
   ```bash
   bunx drizzle-kit push
   ```

5. **Run the development server**:
   ```bash
   bun run dev
   # or
   npm run dev
   ```

6. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. Add the `DATABASE_URL` environment variable (your Neon connection string).
4. Keep default settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `bun run build` or `npm run build`
   - **Output Directory**: `.next`
5. Click **Deploy**.

---

## 📱 Android App

See [MOBILE_APP_SETUP.md](MOBILE_APP_SETUP.md) for detailed instructions on:
- Building the APK
- Setting up Android Studio
- Generating a signed AAB for Google Play Store

---

## 🔐 Authentication

See [AUTHENTICATION.md](AUTHENTICATION.md) for detailed documentation on:
- Registration & login flows
- Session management
- Password security
- Multi-user data isolation

---

## 👨‍💻 Developer

Built by [**mehedihasantsx**](mailto:mehedi.hasan.tsx@gmail.com)

---

## 📄 License

MIT License. Free for all students and developers to customize and build upon.
