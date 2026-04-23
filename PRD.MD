# PRD / MASTER PROMPT UNTUK AI AGENT (Antigravity Google Vibe Code)

Buatkan website fullstack bernama **UniverseAI MC**. Fokus tahap pertama adalah **frontend polished production-ready**, namun struktur project harus siap untuk backend Vercel.

---

# 1. PROJECT OVERVIEW

UniverseAI MC adalah website **AI Video Generator** berbasis **BYOK (Bring Your Own Key)**.

Setiap user login menggunakan:

* kode akses
* email atau nomor HP

Setelah login, user wajib memasukkan **API Key Freepik** milik mereka sendiri di halaman Profile Settings.

Website digunakan untuk generate video menggunakan model:

### Display Name:

**Motion Control std**

### Provider:

Freepik

### Endpoint Docs:

POST generate task:

```txt
https://api.freepik.com/v1/ai/video/kling-v2-6-motion-control-std
```

List task:

```txt
https://api.freepik.com/v1/ai/image-to-video/kling-v2-6
```

Get task detail:

```txt
https://api.freepik.com/v1/ai/image-to-video/kling-v2-6/{task-id}
```

---

# 2. TECH STACK

Gunakan:

* Next.js 15 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion
* Recharts
* Zustand (state management ringan)
* React Hook Form
* Zod validation

Deploy target:

Vercel

---

# 3. DESIGN SYSTEM

## Tema utama:

* Dominan hitam matte / black graphite
* Text putih bersih
* Border putih tipis
* Modern classic futuristic

## Style:

* clean
* elegant
* premium SaaS
* banyak line divider tipis
* rounded-xl / rounded-2xl
* subtle shadow
* spacing rapi
* desktop first + mobile responsive

## Inspirasi:

Apple + Linear + Midjourney Dashboard + old terminal elegance

---

# 4. PUBLIC PAGES

## Landing Page

Sections:

### Hero

UniverseAI MC
Motion Control Video Generator

Subheadline:

Generate cinematic AI motion videos using your own Freepik API key.

CTA:

* Login
* Learn More

### Features

* BYOK system
* Fast generation
* Private workflow
* Temporary output storage
* Motion Control model

### Pricing Note

Use your own API key. No hidden markup.

### Footer

UniverseAI MC © 2026

---

# 5. AUTH PAGES

## Login Page

Fields:

* Email / No HP
* Kode Akses

Button:

* Login

UI mewah dan simple.

Validation:

required.

---

# 6. USER DASHBOARD

Sidebar:

* Dashboard
* Generate Video
* Tasks
* Profile Settings
* Logout

Topbar:

* User identity
* Generate count
* Status API Key

---

# 7. DASHBOARD HOME

Cards:

* Total Generate
* Success Task
* Pending Task
* Failed Task

Graph modern:

Generate activity 7 hari terakhir

Use Recharts.

---

# 8. GENERATE VIDEO PAGE

Title:

Generate Motion Control Video

Subtitle:

Model: Motion Control std

## Form Input

### Upload Video Reference

accept:

mp4 mov webm

### Upload Image Reference

accept:

png jpg jpeg webp

### Prompt (optional)

textarea

### Duration (if available placeholder)

dropdown:

* auto
* 5 sec
* 10 sec

### Submit Button

Generate Video

---

# 9. TASKS PAGE

Table modern:

* Task ID
* Status
* Created
* Download
* Auto delete countdown

Status badges:

* queued
* processing
* success
* failed

If success:

button Download

Countdown example:

09:32 remaining

---

# 10. PROFILE SETTINGS

Sections:

## User Info

* email/no hp
* kode akses (readonly)

## API KEY SETTINGS

Input:

Freepik API Key

Buttons:

* Save Key
* Test Connection

Show masked key.

## Security Notice

Your API key belongs to you and is encrypted.

---

# 11. ADMIN PANEL

Route:

/admin

Simple secure layout.

Sidebar:

* Dashboard
* Users
* Create User
* Logout

---

# 12. ADMIN DASHBOARD

Cards:

* Total Users
* Total Generate
* Active Today
* Success Rate

Charts modern:

* Generate trend
* New users trend

---

# 13. ADMIN USERS PAGE

Searchable table:

* User ID
* Email/HP
* Kode Akses
* Total Generate
* Last Login
* Created Date
* Action View/Edit

---

# 14. ADMIN CREATE USER PAGE

Form:

* Email / No HP

Button:

Generate Access Code

Format wajib:

```txt
KEY-XXXX
```

4 karakter random uppercase alphanumeric.

Examples:

* KEY-A82K
* KEY-XP9Q
* KEY-M4TZ

Then Save User button.

---

# 15. BACKEND REQUIREMENTS (STRUCTURE ONLY)

Gunakan arsitektur siap implementasi:

## Hosting

Vercel

## Storage

Vercel Blob

## Database

PostgreSQL

## User Sync

Ambil user dari database lama.

Saat login:

1. cek DB baru
2. jika tidak ada
3. cek DB lama
4. copy user:

   * kode akses
   * email/no hp
5. login sukses

---

# 16. FILE STORAGE FLOW

Upload reference files ke Blob temporary.

Output video auto expire 10 menit.

UI tampilkan:

Download now before auto deletion.

---

# 17. CODE QUALITY

* reusable components
* clean folder structure
* scalable
* environment variable ready
* no dummy ugly code
* use mock data first for frontend
* loading skeletons
* empty states
* toast notifications
* dark mode fixed default

---

# 18. ROUTES

```txt
/
/login
/dashboard
/dashboard/generate
/dashboard/tasks
/dashboard/profile

/admin
/admin/users
/admin/create-user
```

---

# 19. UX DETAILS

* smooth animations
* hover border glow white subtle
* keyboard accessible
* responsive mobile sidebar drawer
* drag & drop upload zone
* progress bar fake demo for frontend stage

---

# 20. OUTPUT REQUEST

Generate complete frontend codebase first.

Gunakan mock API / local state dulu.

Semua backend endpoint disiapkan interface placeholder.

Buat tampilannya production-ready sekelas startup premium.

---

# 21. IMPORTANT NOTE

Jangan buat desain ramai warna-warni.
Gunakan dominan:

* black
* white
* grey

No neon blue overload.

Modern classic luxury interface.

---

# 22. FINAL GOAL

Saat dibuka, orang merasa ini tool premium AI generator yang mahal dan profesional.
