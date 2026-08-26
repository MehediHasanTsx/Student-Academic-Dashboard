# 🎓 Student Academic Dashboard

A complete, production-ready, offline-first Progressive Web App (PWA) built for university students to manage their entire academic life in one unified, modern dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-Dexie.js_v4-green)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## ✨ Features

- 📅 **Mobile-First Attendance Tracking**:
  - Quick-mark 4-column status matrix (`Present`, `Absent`, `Late`, `No Class`).
  - Automatically handles non-conducted statuses (`Medical Leave`, `Holiday`, `No Class`).
  - **Attendance Target Analyzer**: Calculates the exact number of classes a student can miss or must attend to reach their target percentage (e.g., 75%).

- 📊 **GPA & CGPA Suite**:
  - **Semester GPA Calculator**: Grade selection linked to university grade scales (A+, A, A-, B+, etc.).
  - **Weighted CGPA Overview**: True credit-weighted CGPA calculation across all 8 semesters (not simple GPA averaging).
  - **Target CGPA Calculator**: Determines required future GPA to reach a target CGPA, with validation for unachievable targets (> 4.00).

- 💳 **Fees & Payment Tracker**:
  - Track semester fees, admission, registration, exam, and lab fees.
  - Record partial and full payments with date and payment method.
  - Automatic balance calculation formatted in BDT (`৳`) or configurable currency.

- 🗓️ **Class Routine**:
  - Weekly schedule organized Saturday to Friday with today's class highlighting and room numbers.

- 📝 **Assignments & Exam Deadlines**:
  - Assignment tracking with priority tags (`High`, `Medium`, `Low`), status toggle, and overdue alerts.
  - Upcoming exam countdown badges showing remaining days.

- 📓 **Notes & Search**:
  - Rich study notes linked to subjects with instant full-text search.

- 📈 **Analytics & Insights**:
  - Interactive visual charts powered by Recharts (GPA trend bar chart, attendance pie chart, overall degree progress).

- 📁 **Lab Projects & Coursework Archive**:
  - Standalone section inspired by academic repositories to organize experiments, lab reports, source code, tags, and demo URLs.

- 🔒 **Offline-First & Privacy-Focused**:
  - Built with Dexie.js (IndexedDB). **100% client-side storage** — no cloud server required, no data leaves your device.
  - Full JSON backup export and restore capabilities for data safety.

- 📱 **Progressive Web App (PWA)**:
  - Installable on mobile and desktop devices with offline service worker support.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), `next-themes` (Dark / Light / System mode)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives, Lucide Icons, Sonner Toasts)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper with live query hooks)
- **Charts**: [Recharts](https://recharts.org/)
- **Forms & Validation**: `react-hook-form` + `zod`

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/student-academic-dashboard.git
   cd student-academic-dashboard
   ```

2. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

3. **Run the development server**:
   ```bash
   bun run dev
   # or
   npm run dev
   ```

4. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel

This application is fully optimized for one-click deployment on [Vercel](https://vercel.com/):

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. Keep default settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `bun run build` or `npm run build`
   - **Output Directory**: `.next`
4. Click **Deploy**.

Because data persistence is handled completely on the client side via IndexedDB, no external database environment variables are required!

---

## 📄 License

MIT License. Free for all students and developers to customize and build upon.
