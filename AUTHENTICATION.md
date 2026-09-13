# 🔐 Authentication Architecture

DCC CSE uses a secure, server-side authentication system while keeping all academic data local.

## Overview

| Aspect | Implementation |
|---|---|
| **Registration** | Username + Bangladesh Mobile + Password |
| **Password Storage** | bcryptjs hash (12 rounds), server-side only |
| **Sessions** | SHA-256 hashed tokens in PostgreSQL |
| **Session Cookies** | httpOnly, secure, sameSite: lax, 30-day expiry |
| **Client Storage** | Session cookie only (no tokens in localStorage) |
| **Academic Data** | IndexedDB (Dexie.js), never sent to server |

## Flows

### Registration
1. User submits username, mobile number, and password
2. Server normalizes username (lowercase) and mobile (+880 format)
3. Server checks username and mobile uniqueness
4. Password is hashed with bcryptjs (12 salt rounds)
5. User record is created in PostgreSQL
6. Session token is generated and stored (SHA-256 hash in DB)
7. httpOnly cookie is set
8. User is redirected to onboarding (profile setup)

### Login
1. User submits username and password
2. Server normalizes username and looks up user
3. Password is verified against stored hash
4. New session is created
5. Returns generic "Invalid credentials" for both wrong username and wrong password (prevents enumeration)

### Session Validation
1. On every page load, client calls `GET /api/auth/me`
2. Server reads session cookie, finds session by token hash
3. If valid and non-expired, returns user data and extends session
4. If invalid/expired, clears cookie and returns 401

### Logout
1. Client calls `POST /api/auth/logout`
2. Server deletes session from database
3. Session cookie is cleared

## Multi-User Data Isolation

Each user gets their own IndexedDB database named `dcc_cse_user_{userId}`. This ensures:

- **Complete data isolation**: User A cannot see User B's attendance, grades, or notes
- **Multiple accounts on one device**: Each user has a separate local database
- **No data leakage**: Logging out closes the database; logging in opens the correct one

## Security Notes

- Passwords are **never** stored in localStorage or IndexedDB
- Session tokens are stored as SHA-256 hashes (not plain text) in the database
- API routes return generic error messages to prevent information leakage
- The service worker never caches `/api/*` responses
- Backup exports never include authentication data

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/check-username?u=...` | Check username availability |
