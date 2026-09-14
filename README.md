# 🎓 DCC CSE

**Your complete academic companion — built for Dhaka City College CSE students.**

DCC CSE is a modern, offline-first web application that helps you manage your entire academic life from a single dashboard. Track attendance, calculate GPA, manage fees, organize your routine, and more — all from your phone or laptop.

> **Note:** This is an independent student project. It is not officially endorsed by or affiliated with Dhaka City College.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📌 What is DCC CSE?

DCC CSE is a **student utility app** that replaces scattered notebooks, spreadsheets, and mental calculations with one clean dashboard. It's designed specifically for the academic structure at Dhaka City College's Computer Science & Engineering department.

### What can you do with it?

| Feature | What it does |
|---|---|
| 📅 **Attendance Tracker** | Mark daily attendance for each subject. See your attendance percentage instantly. Know exactly how many classes you can miss (or need to attend) to hit your target. |
| 📊 **GPA & CGPA Calculator** | Calculate your semester GPA with proper credit weights. Track your cumulative CGPA across all 8 semesters. Set a target CGPA and see what grades you need. |
| 💳 **Fees & Payments** | Track all fees — tuition, exam, lab, registration. Record partial/full payments. See your remaining balance in ৳ (BDT). |
| 🗓️ **Class Routine** | View your weekly class schedule (Saturday–Friday). Today's classes are highlighted. |
| 📝 **Assignments** | Track assignments with deadlines, priority levels, and completion status. Overdue alerts keep you on track. |
| 📓 **Notes** | Write study notes linked to your subjects. Search instantly across all notes. |
| 🧪 **Lab Projects** | Organize lab experiments, reports, code, and demo links in one place. |
| 📈 **Analytics** | Visual charts showing your academic trends — attendance patterns, GPA progress, and more. |
| 🔔 **Exam Countdown** | See countdown badges for upcoming exams so you never miss one. |

---

## 🔒 Your Data is Private

**Your academic data never leaves your device.**

DCC CSE stores all your grades, attendance, notes, and fees **locally in your browser** (using IndexedDB). Nothing is uploaded to any server.

The only thing the server knows is your username and password (for login). That's it.

| Data Type | Where it's stored |
|---|---|
| Attendance, GPA, Fees, Notes, Routine | 🏠 **Your device only** (IndexedDB) |
| Username & Password | 🔐 **Server** (encrypted, hashed) |
| Your grades, personal info | ❌ **Never sent to server** |

You can even export a full backup of your data as a JSON file and restore it anytime.

---

## 📱 How to Use

### Option 1: Web Browser (Easiest)
Just open the app URL in any browser on your phone or laptop. Sign up, and start using it immediately.

### Option 2: Install as PWA (Recommended for Mobile)
1. Open the app in **Chrome** on your Android phone
2. Tap the **⋮** menu → **"Install app"** or **"Add to Home Screen"**
3. The app icon appears on your home screen — works like a real app, even offline!

### Option 3: Android APK (Coming Soon)
A standalone Android app will be available for direct installation and eventually on the Google Play Store.

---

## ✨ Key Highlights

- 🌙 **Dark & Light Mode** — Switch themes or let it follow your system preference
- 📴 **Works Offline** — Once loaded, the app works without internet (except login/signup)
- 👥 **Multi-User Support** — Multiple students can use the same device with separate accounts and isolated data
- 🔄 **Backup & Restore** — Export all your data as JSON and import it back anytime
- ⚡ **Fast & Lightweight** — Built with modern tech for instant loading
- 📱 **Mobile-First Design** — Designed primarily for phone screens, also works great on desktop

---

## 🛠️ For Developers

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Client Database | [Dexie.js](https://dexie.org/) (IndexedDB) |
| Server Database | [Neon PostgreSQL](https://neon.tech/) (auth only) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | bcryptjs + HTTP-only session cookies |
| Charts | [Recharts](https://recharts.org/) |
| Mobile | [Capacitor](https://capacitorjs.com/) (Android) |

### Quick Start

```bash
# Clone
git clone https://github.com/MehediHasanTsx/Student-Academic-Dashboard.git
cd Student-Academic-Dashboard

# Install
bun install    # or npm install

# Run (demo mode — no database needed)
bun run dev
```

The app runs in **demo mode** by default (no database setup required). To enable multi-user authentication with a real database:

1. Create a free database at [neon.tech](https://neon.tech)
2. Create `.env.local`:
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```
3. Push the schema: `bunx drizzle-kit push`
4. Restart the dev server

### Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add `DATABASE_URL` environment variable
4. Deploy — done!

### Documentation

- [AUTHENTICATION.md](AUTHENTICATION.md) — How auth works (sessions, passwords, data isolation)
- [MOBILE_APP_SETUP.md](MOBILE_APP_SETUP.md) — How to build the Android APK

---

## 👨‍💻 Developer

Built with ❤️ by [**mehedihasantsx**](https://api.whatsapp.com/send/?phone=8801521743944&text&type=phone_number&app_absent=0)

---

## 📄 License

MIT License — Free for all students and developers to use, modify, and share.
