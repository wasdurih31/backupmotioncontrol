# PRD — Prompt Generator Feature

## Product Name

UniverseAI MC — Prompt Generator Suite

---

# 1. Product Overview

UniverseAI MC akan menambahkan fitur baru bernama:

# Prompt Generator Suite

Fitur ini adalah sistem AI Prompt Generator khusus untuk:

* AI Affiliate Content
* TikTok UGC
* Shopee Affiliate
* Storyboard Content
* AI Video Prompt
* AI Image Prompt

Fokus utama MVP:

* Storyboard UGC
* UGC Affiliate

Future Expansion:

* Storyboard Film Maker
* Storyboard Animation
* Storyboard TV Commercial Ads
* Cinematic Multi Shot

---

# 2. Goal Product

Membantu user pemula membuat:

* Prompt gambar AI
* Prompt video AI
* Storyboard AI
* UGC affiliate content

tanpa perlu memahami prompt engineering.

System harus:

* beginner friendly
* cepat digunakan
* scalable
* model-aware
* duration-aware
* optimized untuk TikTok affiliate workflow

---

# 3. Tech Stack

| Layer       | Tech                    |
| ----------- | ----------------------- |
| Frontend    | Next.js                 |
| Database    | Neon PostgreSQL         |
| Deployment  | Vercel                  |
| AI Provider | Google AI Studio API    |
| Auth        | Existing website auth   |
| Storage     | Existing storage system |

---

# 4. AI System Architecture

## BYOK (Bring Your Own Key)

Setiap user menggunakan:

* API key Google AI Studio mereka sendiri.

User memasukkan API key di:

```text id="z7omur"
/dashboard/profile
```

---

# Supported Models

User wajib memilih model sebelum menyimpan API key.

## Available Models

| Model                         |
| ----------------------------- |
| Gemini 3.1 Flash-Lite         |
| Gemini 3.1 Flash-Lite Preview |
| Gemini 3 Flash Preview        |
| Gemini 2.5 Flash              |

---

# API Storage Rules

## Database

Table:

```sql id="f9mdki"
user_ai_settings
```

Fields:

```sql id="skqb1y"
id
user_id
provider
api_key_encrypted
selected_model
created_at
updated_at
```

---

# Security Rules

* API key wajib encrypted
* API key tidak boleh tampil full setelah tersimpan
* Gunakan masking:

```text id="8dhrm0"
AIzaSy****X92
```

---

# 5. Routing Structure

# Main Page

```text id="90v59v"
/promptgen
```

Berfungsi sebagai:

* landing page
* template selection hub

---

# Sub Pages

## Storyboard UGC

```text id="kgbx0c"
/promptgen/storyboardugc
```

---

# Future Pages

```text id="pj3p0k"
/promptgen/ugcaffiliate

/promptgen/storyboardfilm

/promptgen/storyboardanimation

/promptgen/storyboardtvads
```

---

# 6. Prompt Generator Main Menu

Halaman:

```text id="34w3s8"
/promptgen
```

Menampilkan menu card.

---

# Initial Menu

## Active

| Menu           |
| -------------- |
| Storyboard UGC |
| UGC Affiliate  |

---

# Future Locked Menu

| Menu                 |
| -------------------- |
| Storyboard Film      |
| Storyboard Animation |
| Storyboard Ads TV    |
| Cinematic Multi Shot |

---

# 7. Core Feature — Storyboard UGC

## Goal

Generate:

* storyboard image prompt
* storyboard video prompt
* continuation storyboard
* continuation video prompt

khusus affiliate content.

---

# 8. Storyboard Rules

## IMPORTANT RULE

1 storyboard prompt:

```text id="4o1w8v"
MAX 6 scenes
MAX 15 seconds
```

---

# If User Selects 12 Scenes

System otomatis membagi menjadi:

## PART 1

Scene 1–6

## PART 2

Scene 7–12

---

# Continuation System

PART 2 wajib:

* melanjutkan visual PART 1
* melanjutkan emotion
* melanjutkan camera style
* melanjutkan character consistency
* melanjutkan product consistency

---

# 9. Storyboard Scene Structure

Setiap scene wajib memiliki:

| Field               |
| ------------------- |
| Scene Number        |
| Scene Goal          |
| Camera Angle        |
| Character Action    |
| Product Interaction |
| Environment         |
| Dialogue            |
| Motion              |
| Duration            |

---

# 10. Storyboard Flow Structure

AI wajib mengikuti struktur affiliate pacing.

---

# Short Duration Structure

## 5–8 Seconds

```text id="y3zfgz"
Hook
Problem
Solution
CTA
```

---

# Medium Duration Structure

## 10–15 Seconds

```text id="lhzt57"
Hook
Problem
Reaction
Solution
Result
CTA
```

---

# 11. Prompt Length Optimization

## IMPORTANT

Sebagian besar AI image/video model memiliki limit:

```text id="w25cw9"
~2000 characters
```

---

# Solution

Gunakan:

# Compressed Prompt Syntax

---

# Prompt Style Rules

## Use:

* short descriptive phrases
* modular structure
* compressed scene descriptions

---

# Avoid:

* cinematic paragraphs panjang
* novel-style prompting
* overly descriptive prose

---

# 12. Reference Lock System

## User Upload

### Character Reference

### Product Reference

---

# AI MUST ADD

## Character Lock

```text id="0o07vk"
Use the exact same person from reference image.
Maintain identical facial features and appearance.
```

---

## Product Lock

```text id="mf31i9"
Use the exact same product from reference image.
Maintain identical packaging and label design.
```

---

# 13. UGC Affiliate Feature

## Goal

Generate:

* single shot affiliate prompt
* 4 image prompt variations
* duration-aware video prompt

---

# 14. UGC Affiliate Variant System

Generate:

```text id="o3g6rj"
4 optimized variations
```

---

# Locked Variables

| Variable     |
| ------------ |
| Character    |
| Product      |
| Visual Style |
| Environment  |

---

# Flexible Variables

| Variable     |
| ------------ |
| Pose         |
| Camera Angle |
| Expression   |
| Interaction  |
| Framing      |

---

# 15. UGC Variation Logic

## Example — Skincare

### Variant 1

mirror selfie holding product

### Variant 2

applying skincare close-up

### Variant 3

product near camera smiling

### Variant 4

natural candid lifestyle shot

---

# 16. Video Prompt System

## IMPORTANT

Output website:

* ONLY prompt
* NOT generated image/video

---

# Video Prompt Output

Generate:

* duration-aware prompt
* model-aware structure
* dialogue-aware pacing

---

# 17. Supported Video Models

| Model      | Duration |
| ---------- | -------- |
| Veo 3.1    | 8s       |
| Seedance 2 | 5–15s    |
| Grok AI    | 6–10s    |
| Sora 2     | 12s      |

---

# 18. Duration Engine Rules

| Duration | Ideal Scene Count |
| -------- | ----------------- |
| 5s       | 1–2               |
| 8s       | 2–3               |
| 10s      | 3–4               |
| 15s      | 4–6               |

---

# 19. Dialogue System

User dapat memilih:

| Mode           |
| -------------- |
| Auto AI Script |
| Manual Script  |

---

# 20. Dialogue Rules

## IMPORTANT

Natural speaking pace:

```text id="6gz2jg"
1 second ≈ 2–3 words
```

---

# Max Word Rules

| Duration | Max Words |
| -------- | --------- |
| 6s       | 12        |
| 8s       | 20        |
| 10s      | 28        |
| 15s      | 45        |

---

# If Exceeded

System harus:

* show warning
* offer auto optimize

---

# 21. Auto Script Structure

AI wajib generate script berdasarkan affiliate flow.

---

# Example Structure

```text id="e4jlwm"
Hook
Problem
Reaction
Solution
Result
CTA
```

---

# 22. Environment Preset System

Dropdown preset realistis.

---

# IMPORTANT

Avoid:

* fantasy
* abstract
* cartoon
* sci-fi

---

# Example Presets

## Beauty

| Preset                |
| --------------------- |
| Bathroom Mirror       |
| Bedroom Natural Light |
| Vanity Table          |
| Luxury Hotel Bathroom |
| Minimalist Room       |

---

## Fashion

| Preset         |
| -------------- |
| Cafe Lifestyle |
| City Walk      |
| Bedroom Mirror |
| Rooftop Casual |
| Shopping Mall  |

---

# Manual Background Input

User dapat menambahkan:

```text id="k0x3t7"
custom environment prompt
```

---

# 23. Camera Device System

## Goal

Generate visual style berdasarkan device.

---

# Casual UGC Devices

| Device        |
| ------------- |
| iPhone 13     |
| iPhone 15 Pro |
| iPhone 16 Pro |
| Samsung S24   |

---

# Professional Creator Devices

| Device       |
| ------------ |
| Sony A7S III |
| Sony FX3     |
| Canon R5     |
| Fujifilm XT5 |

---

# AI Prompt Enhancement

## Smartphone Style

Tambahkan:

```text id="6d94fd"
smartphone realism,
social media exposure,
front camera feel
```

---

## Professional Camera Style

Tambahkan:

```text id="2d91xg"
cinematic depth of field,
professional lighting response
```

---

# 24. Output Formats

Generate 2 formats:

---

# Markdown Output

Human readable.

---

# JSON Output

Machine readable.

Digunakan untuk:

* future editing
* API
* continuation
* regeneration
* export

---

# 25. Suggested JSON Structure

```json id="a6h8o2"
{
  "project": {},
  "settings": {},
  "reference_lock": {},
  "scenes": [],
  "dialogue": {},
  "video_prompt": {},
  "negative_prompt": {}
}
```

---

# 26. UI/UX Design Rules

## IMPORTANT

Target user:

* beginner
* affiliate creator
* non technical users

---

# UX PRINCIPLE

# “Preset First UX”

User tidak perlu memahami prompting.

---

# 27. Workflow UI

# STEP 1

Choose Template

---

# STEP 2

Upload Reference

* Character Reference
* Product Reference

---

# STEP 3

Content Style

| Example          |
| ---------------- |
| Soft Sell        |
| Problem Solution |
| Beauty Creator   |
| Testimonial      |

---

# STEP 4

Environment

Dropdown + custom input

---

# STEP 5

Camera Device

Device preset dropdown

---

# STEP 6

Video Duration

| Option |
| ------ |
| 6s     |
| 8s     |
| 10s    |
| 15s    |

---

# STEP 7

Script

| Option         |
| -------------- |
| Auto AI Script |
| Manual Script  |

---

# STEP 8

Generate Prompt

---

# 28. Output UI

For Storyboard:

* Part 1
* Part 2 (if needed)

---

# Each Part Contains

Tabs:

```text id="x4tq4t"
[ Storyboard Prompt ]
[ Video Prompt ]
[ JSON ]
```

---

# 29. Prompt Generation Pipeline

```text id="x6t4zf"
User Input
    ↓
Scene Planner
    ↓
Scene Chunker
    ↓
Reference Lock Layer
    ↓
Continuation Engine
    ↓
Duration Engine
    ↓
Prompt Formatter
    ↓
Markdown Output
    ↓
JSON Output
```

---

# 30. Future Expansion

Future system support:

* storyboard chaining
* cinematic transitions
* saved character presets
* saved product presets
* AI prompt optimizer
* AI continuation generation
* model-specific formatting
* advanced negative prompts
* affiliate hook analyzer

---

# 31. Success Criteria

MVP dianggap berhasil jika user dapat:

* generate affiliate storyboard prompts
* generate UGC variations
* generate duration-aware video prompts
* maintain character consistency
* maintain product consistency
* generate continuation storyboard prompts
* export markdown + JSON outputs
* use personal Google AI Studio API key successfully
