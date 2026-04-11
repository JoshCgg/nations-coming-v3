# The Nations Are Coming
## 2026 FIFA World Cup Missions Resource App
### Global Gates — globalgates.info

> *"Ask of me, and I will make the nations your heritage." — Psalm 2:8*

**Project Context Document · April 11, 2026**

---

## Project Overview

| Field | Detail |
|---|---|
| **App Name** | The Nations Are Coming |
| **Campaign Name** | **"Pray for the Cup"** — confirmed. Name = logo = trophy mechanic. Domain pending. |
| **Organization** | Global Gates — globalgates.info |
| **Purpose** | 2026 FIFA World Cup missions engagement resource for prayer and mobilization |
| **Tournament Coverage** | Full tournament: June 11 – July 19, 2026 |
| **Tech Stack** | React (single JSX file) |
| **Testing** | StackBlitz — stackblitz.com/fork/react — paste into App.js |
| **Production (v2)** | Live on Vercel — `nations-coming-87fx.vercel.app` |
| **Production Target** | `nations.globalgates.info` (DNS not yet pointed) |
| **GitHub (v2 — stable)** | `JoshCgg/nations-coming` — do not touch |
| **GitHub (v3 — sandbox)** | `JoshCgg/nations-coming-v3` — private, gamification branch |
| **Primary Audience** | Evangelical Christians **35–70**, iPhone users. Mobile-first, large text, simplified UX. Younger cohort (35–45) is a specific growth target via gamification + social sharing. |

---

## Repository Structure

Two separate GitHub repos — intentional, keep them separate:

| Repo | Branch | Status | Purpose |
|---|---|---|---|
| `JoshCgg/nations-coming` | main | Live on Vercel | Stable v2 — never touch during v3 work |
| `JoshCgg/nations-coming-v3` | main | Private, not on Vercel | Gamification sandbox |

**Working file for v3:** `worldcup-missions_v3.jsx` (in `/src/App.js` in the repo)

---

## What Changed April 11, 2026 (this session)

### 1. Gamification System Fully Designed

#### Core Mechanic
- **Journey Mode toggle** — on/off switch stored in localStorage. Off by default (`JOURNEY_MODE_DEFAULT = false`). Lets focused users skip gamification entirely (Focus Mode) while younger users opt into the full experience (Journey Mode).
- **Daily check-in button** — "I prayed today ✓" at bottom of each devotional
- **Streak counter** — visible in app header when Journey Mode is on
- **Achievement system** — 9 soccer-themed milestones, framed as spiritual markers not game levels

#### Achievement Definitions (all 9)

| ID | Label | Icon | Trigger |
|---|---|---|---|
| `first_touch` | First Touch | ⚽ | Pray for 1 nation |
| `hat_trick` | Hat Trick | 🎩 | 3-day streak |
| `clean_sheet` | Clean Sheet | 🧤 | Complete a full day (devo + prayer + check-in) |
| `golden_boot` | Golden Boot | 🥇 | 7-day streak |
| `full_squad` | Full Squad | 🌍 | All nations in one region prayed for |
| `world_tour` | World Tour | 🗺️ | At least one nation on every continent prayed for |
| `through_the_groups` | Through the Groups | 📋 | All 17 group stage days checked in |
| `final_whistle` | The Final Whistle | 🏆 | All 48 nations prayed for → trophy unlocks + share card |
| `sent` | Sent | ✝️ | All 20 devotionals completed |

"Sent" is the final achievement — the Great Commission word, lands with real spiritual weight.

#### Progressive Trophy Reveal
Trophy builds piece by piece as milestones are hit:
- State 0: Nothing (no goals hit)
- State 1: Base only (`first_touch`)
- State 2: Base + stem (`hat_trick`)
- State 3: Base + stem + dark globe (`through_the_groups`)
- State 4: Full glowing gold trophy (`final_whistle`) → share card unlocks

#### Shareable Card
- Triggers on `final_whistle` achievement
- Trophy image + "I prayed for all 48 nations · #PrayForTheCup"
- Instagram Stories format (9:16)
- One-tap share — every share = brand impression + app discovery

### 2. v3 Branch Created and Pushed to GitHub

- `nations-coming-v3` repo created on GitHub (private)
- `worldcup-missions_v3.jsx` = v2 app + gamification scaffolding added at top
- App is **visually identical to v2** — scaffolding adds no UI yet
- Scaffolding includes:
  - `JOURNEY_MODE_DEFAULT` constant
  - `ACHIEVEMENTS` array — all 9 achievements with trigger logic written
  - `getTrophyState()` function — returns 0–4 based on game state
  - `useGameState()` hook — reads/writes all game data to localStorage under key `pftc_game`
  - `DEFAULT_GAME_STATE` shape fully defined

### 3. localStorage Data Model (implemented in v3 scaffolding)

```js
// stored under localStorage key "pftc_game"
{
  journeyMode:          false,    // bool — Journey Mode on/off
  prayedNations:        [],       // string[] — nation names prayed for
  checkedInDays:        [],       // string[] — ISO date strings of daily check-ins
  completedDevotionals: [],       // string[] — ISO date strings of completed devotionals
  fullDaysCompleted:    0,        // number — days where all 3 tasks completed
  streakCount:          0,        // number — current consecutive day streak
  lastCheckIn:          null,     // string|null — ISO date of last check-in
  goalsAchieved:        [],       // string[] — achievement IDs earned
}
```

---

## What Still Needs to Be Built in v3 (Next Session)

| # | Task | Notes |
|---|---|---|
| 1 | Wire `useGameState()` into Daily Digest | Add check-in button, streak display in header |
| 2 | Journey Mode toggle UI | Settings or first-launch screen |
| 3 | Achievement toast/notification | Brief popup when an achievement is earned |
| 4 | My Journey tab (Tab 3) | Streak display, goals list, progressive trophy SVG |
| 5 | Trophy SVG component | 4 states, driven by `getTrophyState()` |
| 6 | Shareable card generator | Trophy + text, Instagram Stories format, one-tap share |

---

## Current App Status (v2 — stable, live)

### Completed
- 50-nation `RAW_COUNTRIES` with full mission profiles *(8 new nation profiles are drafts in planner, not yet finalized in JSX)*
- `TBD_SLOTS` cleared — all 48 qualifiers confirmed
- Full 17-day group stage schedule (Groups A–L, correct venues/times/ET)
- Devotionals and prayer prompts for all 17 group stage days
- Two-tab PWA: Daily Digest + All Nations
- Search + region filter on All Nations tab
- Clickable team names → bottom-sheet country profile modal
- Global Gates brand applied (colors, typography)
- "Add to Home Screen" banner (orange strip + modal)
- PWA files in place (manifest.json, sw.js, index.html)
- Live on Vercel — `nations-coming-87fx.vercel.app`

### Still Pending (applies to both v2 and v3)

| # | Task | Priority |
|---|---|---|
| 1 | Design logo — praying hands lifting globe (Canva) | **High — blocks icons, campaign assets, trophy SVG** |
| 2 | Secure domain — prayforthecup.com / .org | High |
| 3 | Add knockout round weekly devotionals (Jun 29, Jul 6, Jul 13) to JSX | High |
| 4 | Finalize 8 new nation profiles via planner → paste into JSX | High |
| 5 | Assign content authors in planner, share to Google Drive | High |
| 6 | Point `nations.globalgates.info` DNS to Vercel | High |
| 7 | Design app icons from logo (192×192, 512×512, 1024×1024px) | High |
| 8 | Build gamification layer in v3 (streak, goals, trophy SVG, check-in) | Medium |
| 9 | Build shareable trophy card (Instagram Stories format) | Medium |
| 10 | Install Capacitor, generate iOS/Android projects | Medium |
| 11 | Submit to Apple App Store and Google Play | Medium |
| 12 | Build email signup + connect to Mailchimp | Medium |
| 13 | Upgrade emoji flags to flagcdn.com images | Medium |

---

## Brand Guidelines

### Campaign Name
**Pray for the Cup** — confirmed. Name = logo = trophy mechanic. Domain pending (check prayforthecup.com and .org on Squarespace).

### Logo Design Brief
- Gold/warm trophy cup shape with base and stem
- **Praying hands** (fingers pointed upward) where cupped hands would be on the FIFA trophy
- Globe resting above the hands, continents visible
- Works at 192×192px AND as a hero image
- Must work in full color AND single-color white (for Indigo backgrounds)
- Design in Canva → export PNG at 192, 512, 1024px
- **The trophy reward in the app IS this logo** — same object, unified concept

### Color Palette

| Name | Hex | Usage |
|---|---|---|
| **Indigo** | `#1B456A` | Primary dark. Header/footer bg, page text. |
| **Blue** | `#3E67AC` | Card borders, structural elements, muted text. |
| **Blue Jeans** | `#5388F3` | Prayer focus accent, secondary highlights. |
| **Orange** | `#F38E53` | Primary accent. Buttons, CTAs, "vs" labels, featured highlights. |
| **Bright Gray** | `#ECF1EE` | Page background. |

### Typography
- **Lemon Milk** — Primary/headings (requires license from Global Gates brand team)
- **Libre Baskerville** — Secondary/body text (Google Fonts)
- **Montserrat** — UI labels, buttons, metadata (Google Fonts; web substitute for Lemon Milk)

---

## App Structure

### Tab 1: Daily Digest
1. Day label + date heading + Prev/Next navigation
2. 📖 Devotional
3. 🙏 Prayer Focus
4. ⚽ Today's Matches (clickable teams → nation modal)
5. ⭐ Featured Nations cards
6. 📅 Jump to Any Day calendar strip
7. *(v3 planned)* ✓ Daily check-in button + streak display

### Tab 2: All Nations
Grid of all 50 qualifying nations. Clicking opens bottom-sheet modal with full profile + Joshua Project/Operation World links.
Filters: search by country or people group · region filter

### Tab 3: *(v3 planned)* My Journey
- Journey Mode toggle
- Prayer streak display
- Goals/achievements progress
- Progressive trophy reveal (SVG, localStorage-driven)
- Share card trigger on trophy completion

---

## Content Plan

### 20 Total Pieces

| # | Type | Date | Focus |
|---|---|---|---|
| 1–17 | Daily | Jun 11–27 | Group stage, nation-specific (seeded in app) |
| 18 | Weekly | Jun 29 | Gateway Cities: The Nations at Our Door |
| 19 | Weekly | Jul 6 | Among Every People: The Unfinished Task |
| 20 | Weekly | Jul 13 | Until Every Nation Has Heard |

### Writing Standards
**Devotional:** 80–120 words · 2–3 paragraphs · Hook → missions insight → spiritual call · Always name a specific people group/city/movement

**Prayer Point:** 60–90 words · 1 setup sentence + exactly 2 bullet prayers · Format: `[Context]. Pray with us: • [Bullet 1] • [Bullet 2]`

---

## Nations Data Summary

| Region | Count | Notes |
|---|---|---|
| Americas | 13 | Unchanged |
| Europe | 16 | +4: Bosnia & Herzegovina, Sweden, Türkiye, Czechia |
| Africa | 12 | +3: DR Congo, Cape Verde, Ghana |
| Asia | 9 | +1: Iraq |
| Oceania | 1 | Unchanged |
| **Total** | **51** | 50 in RAW_COUNTRIES · TBD_SLOTS cleared |

---

## Key Decisions & Principles

- **"Pray for the Cup" is the campaign name** — name, logo, and trophy mechanic are unified
- **Logo = praying hands lifting a globe** — design before anything else; blocks icons, campaign assets, trophy SVG
- **Target audience is 35–70** — gamification serves younger cohort; spiritual discipline framing serves older
- **Trophy IS the logo** — the reward for completing the challenge is the brand mark itself
- **Journey Mode is off by default** — Focus Mode for older/serious users, Journey Mode opt-in for younger
- **Soccer achievement names** — Hat Trick, Clean Sheet, Golden Boot etc. — fun and thematic, not preachy
- **"Sent" is the final achievement** — Great Commission language, earned by completing all 20 devotionals
- **Shareable moment is the viral loop** — Instagram Stories format, one-tap share, #PrayForTheCup
- **All gamification runs on localStorage** — no backend needed for v1; Supabase is the upgrade path
- **v2 is untouched** — all experimentation happens in v3 only
- **Mobile-first is non-negotiable** — large text, large touch targets, simple nav
- **Content before images** — devotional images not designed until writing is finalized
- **flagcdn.com for flags** — upgrade from emoji when ready
- **Vercel for production** — needed for PWA full functionality (HTTPS, service worker, manifest)

---

## Files in This Project

| File | Description |
|---|---|
| `worldcup-missions_v2.jsx` | Stable main app — v2, live on Vercel, do not modify |
| `worldcup-missions_v3.jsx` | Gamification sandbox — v2 + scaffolding, in `nations-coming-v3` repo |
| `nations_devotional_planner_v4.xlsx` | Content planner — 3 tabs: Content Planner, Style Guide, Nation Profiles |
| `pwa-appstore-checklist.docx` | Step-by-step PWA deploy + App Store submission guide |
| `nations-context-v6_4-11.md` | This file |

---

*Global Gates — globalgates.info*
*"Go therefore and make disciples of all nations" — Matthew 28:19*
