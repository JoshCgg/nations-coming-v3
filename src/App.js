import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { auth, db } from './firebase';
import SoccerBallKit from './SoccerBallKit';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signInWithCredential, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut } from 'firebase/auth';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, deleteField, onSnapshot } from 'firebase/firestore';
const triggerHaptic = async (style = 'medium') => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium });
  } catch (e) {}
};

const scheduleMatchDayNotifications = async () => {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') return;

    await LocalNotifications.cancel({ notifications: Array.from({length: 40}, (_, i) => ({ id: i + 1 })) });

    if (process.env.NODE_ENV === 'development') {
      const testTime = new Date(Date.now() + 15000);
      await LocalNotifications.schedule({ notifications: [{
        id: 999,
        title: 'Test Notification ⚽',
        body: 'Local notifications are working!',
        schedule: { at: testTime },
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#E06520'
      }]});
    }

    const schedule = [
      { id: 1,  date: '2026-06-11', nations: 'Mexico & South Africa' },
      { id: 2,  date: '2026-06-12', nations: 'Haiti & Scotland' },
      { id: 3,  date: '2026-06-13', nations: 'Brazil & Morocco' },
      { id: 4,  date: '2026-06-14', nations: 'Spain & Uruguay' },
      { id: 5,  date: '2026-06-15', nations: 'Iran & Iraq' },
      { id: 6,  date: '2026-06-16', nations: 'Senegal & Tunisia' },
      { id: 7,  date: '2026-06-17', nations: 'Portugal & DR Congo' },
      { id: 8,  date: '2026-06-18', nations: 'Jordan & Qatar' },
      { id: 9,  date: '2026-06-19', nations: 'Türkiye & Australia' },
      { id: 10, date: '2026-06-20', nations: 'Egypt & Saudi Arabia' },
      { id: 11, date: '2026-06-21', nations: 'France & Algeria' },
      { id: 12, date: '2026-06-22', nations: 'Argentina & Colombia' },
      { id: 13, date: '2026-06-23', nations: 'Germany & Japan' },
      { id: 14, date: '2026-06-24', nations: 'South Africa & South Korea' },
      { id: 15, date: '2026-06-25', nations: 'Norway & New Zealand' },
      { id: 16, date: '2026-06-26', nations: 'Netherlands & Sweden' },
      { id: 17, date: '2026-06-27', nations: 'all 48 nations 🌍' },
      { id: 18, date: '2026-06-28', nations: null },
      { id: 19, date: '2026-06-29', nations: null },
      { id: 20, date: '2026-06-30', nations: null },
      { id: 21, date: '2026-07-01', nations: null },
      { id: 22, date: '2026-07-02', nations: null },
      { id: 23, date: '2026-07-03', nations: null },
      { id: 24, date: '2026-07-04', nations: null },
      { id: 25, date: '2026-07-05', nations: null },
      { id: 26, date: '2026-07-06', nations: null },
      { id: 27, date: '2026-07-07', nations: null },
      { id: 28, date: '2026-07-08', nations: null },
      { id: 29, date: '2026-07-09', nations: null },
      { id: 30, date: '2026-07-10', nations: null },
      { id: 31, date: '2026-07-11', nations: null },
      { id: 32, date: '2026-07-12', nations: null },
      { id: 33, date: '2026-07-13', nations: null },
      { id: 34, date: '2026-07-14', nations: null },
      { id: 35, date: '2026-07-15', nations: null },
      { id: 36, date: '2026-07-16', nations: null },
      { id: 37, date: '2026-07-17', nations: null },
      { id: 38, date: '2026-07-18', nations: null },
      { id: 39, date: '2026-07-19', nations: null },
    ];

    const savedTime = localStorage.getItem('notificationTime') || '08:00';
    const [hh, mm] = savedTime.split(':');
    const today = new Date();
    const cutoff = new Date('2026-07-20');

    const notifications = schedule
      .filter(s => {
        const d = new Date(s.date);
        return d >= today && d < cutoff;
      })
      .map(s => ({
        id: s.id,
        title: 'Time to Pray for the Cup ⚽',
        body: s.nations
          ? `Today: pray for ${s.nations} 🙏`
          : 'Pray for the nations still in the tournament 🏆',
        schedule: { at: new Date(`${s.date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`) },
        sound: null,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#E06520',
      }));

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {}
};


const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400;1,700&display=swap');
`;

/* ─── BRAND COLORS ─── */
const C = {
  indigo:     "#1B456A",
  blue:       "#3E67AC",
  blueJeans:  "#5388F3",
  orange:     "#F38E53",
  brightGray: "#ECF1EE",
  white:      "#FFFFFF",
  text:       "#1B2B3A",
};

/* ═══════════════════════════════════════════════════════════════
   ─── GAMIFICATION SCAFFOLDING (v3) ───────────────────────────
   
   JOURNEY MODE TOGGLE
   -------------------
   Set JOURNEY_MODE_DEFAULT to true to turn the gamification
   layer ON by default. Set to false to ship it off by default
   (Focus Mode). The user can toggle this inside the app later —
   this just controls the out-of-box experience.

   Nothing in the UI changes yet — this is just the on/off switch
   and the data model, ready to be wired up in a future session.
   ═══════════════════════════════════════════════════════════════ */


/* ─── GAME STATE — localStorage HOOK ────────────────────────────
   useGameState() reads and writes all gamification data.
   Returns [gameState, updater function].

   The data shape stored in localStorage under key "pftc_game":
   {
     journeyMode:         boolean   — is Journey Mode on?
     prayedNations:       string[]  — nation names prayed for
     checkedInDays:       string[]  — date strings of daily check-ins (e.g. "2026-06-11")
     completedDevotionals: string[] — date strings of completed devotionals
     fullDaysCompleted:   number    — count of days where all 3 tasks done
     streakCount:         number    — current consecutive day streak
     lastCheckIn:         string|null — ISO date of last check-in
     goalsAchieved:       string[]  — achievement IDs earned
   }

   NOTE: Nothing calls this hook yet — it's defined and ready,
   but not connected to any UI. That happens next session.
   ──────────────────────────────────────────────────────────────── */

const DEFAULT_GAME_STATE = {
  hasOnboarded: false,
  journeyMode: false,
  prayedNations: [],
  checkedInDays: [],
  completedDevotionals: [],
  streakCount: 0,
  lastCheckIn: null,
  goalsAchieved: [],
  teams: [],
};

function useGameState() {
  const [gameState, setGameState] = useState(DEFAULT_GAME_STATE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pftc_game");
      if (stored) setGameState({ ...DEFAULT_GAME_STATE, ...JSON.parse(stored) });
    } catch {}
  }, []);

  useEffect(() => {
    async function restoreFromFirestore() {
      try {
        const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        if (!profile.uid) return;
        const snap = await getDoc(doc(db, "users", profile.uid));
        if (!snap.exists()) return;
        const fsState = snap.data().gameState;
        if (!fsState) return;
        const localRaw = localStorage.getItem("pftc_game");
        const localState = localRaw ? JSON.parse(localRaw) : DEFAULT_GAME_STATE;
        const fsNations = (fsState.prayedNations || []).length;
        const localNations = (localState.prayedNations || []).length;
        if (fsNations > localNations) {
          setGameState({ ...DEFAULT_GAME_STATE, ...fsState });
          try { localStorage.setItem("pftc_game", JSON.stringify({ ...DEFAULT_GAME_STATE, ...fsState })); } catch {}
        }
      } catch (err) {
        console.error("Firestore restore error:", err);
      }
    }
    restoreFromFirestore();
  }, []);

  function updateGameState(changes) {
    setGameState(prev => {
      const next = { ...prev, ...changes };
      try {
        localStorage.setItem("pftc_game", JSON.stringify(next));
      } catch {}
      try {
        const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        if (profile.uid) {
          const sanitized = JSON.parse(JSON.stringify(next));
          updateDoc(doc(db, "users", profile.uid), { gameState: sanitized }).catch(err =>
            console.error("Firestore sync error:", err)
          );
        }
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
      return next;
    });
  }

  return [gameState, updateGameState];
}

async function syncMemberToTeam(teamCode, uid, memberData) {
  const resolvedUid = uid || auth.currentUser?.uid;
  if (!resolvedUid) return;
  try {
    const teamRef = doc(db, "teams", teamCode);
    const snap = await getDoc(teamRef);
    const existing = snap.exists() ? (snap.data().members || {}) : {};
    const merged = { ...existing, [resolvedUid]: memberData };
    await setDoc(teamRef, {
      members: merged,
      memberCount: Object.keys(merged).length,
    }, { merge: true });
  } catch {}
}

function calcScore(gameState) {
  const nations = Math.min((gameState.prayedNations || []).length, 48);
  const days    = Math.min((gameState.checkedInDays || []).length, 17);
  const devos   = Math.min((gameState.completedDevotionals || []).length, 20);
  const streak  = gameState.streakCount || 0;
  const bonus   = (streak >= 3 ? 3 : 0) + (streak >= 7 ? 7 : 0) + (streak >= 17 ? 15 : 0);
  return nations + days + devos + bonus;
}

const ACHIEVEMENT_RULES = [
  { id: 'first_touch',        check: g => g.prayedNations.length >= 1 },
  { id: 'hat_trick',          check: g => g.streakCount >= 3 },
  { id: 'clean_sheet',        check: g => g.checkedInDays.length >= 1 && g.completedDevotionals.length >= 1 },
  { id: 'golden_boot',        check: g => g.streakCount >= 7 },
  { id: 'full_squad',         check: (gs) => gs.teams && gs.teams.length > 0 && gs.prayedNations.length >= 48 },
  { id: 'world_tour',         check: g => {
      const regions = ['Americas','Europe','Africa','Asia','Oceania'];
      return regions.every(r =>
        RAW_COUNTRIES.filter(c => c.r === r).some(c => g.prayedNations.includes(c.n))
      );
  }},
  { id: 'through_the_groups', check: g => g.checkedInDays.length >= 17 },
  { id: 'final_whistle',      check: g => g.prayedNations.length >= 48 },
  { id: 'sent',               check: g => g.completedDevotionals.length >= 20 },
];

const ACHIEVEMENT_LABELS = {
  first_touch:        { label: 'First Touch',           icon: '⚽', desc: 'Prayed for your first nation' },
  hat_trick:          { label: 'Hat Trick',              icon: '🎩', desc: '3-day prayer streak' },
  clean_sheet:        { label: 'Clean Sheet',            icon: '🧤', desc: 'Completed a full day' },
  golden_boot:        { label: 'Golden Boot',            icon: '🥇', desc: '7-day prayer streak' },
  full_squad:         { label: 'Full Squad',             icon: '🌍', desc: 'Prayed for every nation in a region' },
  world_tour:         { label: 'World Tour',             icon: '🗺️', desc: 'Prayed for a nation on every continent' },
  through_the_groups: { label: 'Through the Groups',    icon: '📋', desc: 'Checked in for all 17 group stage days' },
  final_whistle:      { label: 'The Final Whistle',     icon: '🏆', desc: 'Prayed for all 48 nations' },
  sent:               { label: 'Sent',                   icon: '✝️', desc: 'Completed all 20 devotionals' },
};

function checkAchievements(gameState) {
  return ACHIEVEMENT_RULES
    .filter(r => r.check(gameState) && !(gameState.goalsAchieved || []).includes(r.id))
    .map(r => r.id);
}

/* ─── TEAM KITS ─── */
const BLOCKED_TEAM_NAMES = [
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'whore', 'slut',
  'bastard', 'damn', 'hell', 'piss', 'crap', 'porn', 'sex', 'nazi',
  'hitler', 'rape', 'kill', 'terror', 'jihad', 'satan', 'hate'
];

function containsBlockedWord(name) {
  const lower = name.toLowerCase();
  return BLOCKED_TEAM_NAMES.some(word => lower.includes(word));
}

const TEAM_KITS = [
  { id:'brazil',      label:'Brazil',       primary:'#009C3B', accent:'#FFDF00', bgCircle:'white' },
  { id:'argentina',   label:'Argentina',    primary:'#74ACDF', accent:'#FFFFFF', bgCircle:'navy' },
  { id:'france',      label:'France',       primary:'#002395', accent:'#ED2939', bgCircle:'white' },
  { id:'germany',     label:'Germany',      primary:'#FFFFFF', accent:'#000000', bgCircle:'navy' },
  { id:'spain',       label:'Spain',        primary:'#AA151B', accent:'#F1BF00', bgCircle:'white' },
  { id:'usa',         label:'USA',          primary:'#002868', accent:'#BF0A30', bgCircle:'white' },
  { id:'mexico',      label:'Mexico',       primary:'#006847', accent:'#FFFFFF', bgCircle:'white' },
  { id:'canada',      label:'Canada',       primary:'#FF0000', accent:'#FFFFFF', bgCircle:'white' },
  { id:'portugal',    label:'Portugal',     primary:'#CC0000', accent:'#006600', bgCircle:'white' },
  { id:'nigeria',     label:'Nigeria',      primary:'#008751', accent:'#FFFFFF', bgCircle:'white' },
  { id:'morocco',     label:'Morocco',      primary:'#C1272D', accent:'#006233', bgCircle:'white' },
  { id:'senegal',     label:'Senegal',      primary:'#FFFFFF', accent:'#00853F', bgCircle:'navy' },
  { id:'japan',       label:'Japan',        primary:'#003087', accent:'#BC002D', bgCircle:'white' },
  { id:'saudi',       label:'Saudi Arabia', primary:'#006C35', accent:'#FFFFFF', bgCircle:'white' },
  { id:'netherlands', label:'Netherlands',  primary:'#FF6600', accent:'#003DA5', bgCircle:'navy' },
  { id:'jordan',      label:'Jordan',       primary:'#CE1126', accent:'#000000', bgCircle:'white' },
  { id:'australia',   label:'Australia',    primary:'#FFD700', accent:'#00843D', bgCircle:'navy' },
  { id:'southkorea',  label:'S. Korea',     primary:'#FFFFFF', accent:'#CD2E3A', bgCircle:'navy' },
  { id:'england',     label:'England',      primary:'#FFFFFF', accent:'#CF091D', bgCircle:'navy' },
  { id:'scotland',    label:'Scotland',     primary:'#FFFFFF', accent:'#003F87', bgCircle:'navy' },
];

const TEAM_ACHIEVEMENTS = [
  { id:'kickoff',       label:'Kickoff',         icon:'🤝', desc:'First member joins' },
  { id:'full_squad',    label:'Full Squad',       icon:'🌍', desc:'All 48 nations covered' },
  { id:'on_fire',       label:'On Fire',          icon:'🔥', desc:'Everyone has a 3-day streak' },
  { id:'chapter_verse', label:'Chapter & Verse',  icon:'📖', desc:'All 20 devotionals collectively' },
  { id:'around_world',  label:'Around the World', icon:'🗺️', desc:'Every region covered' },
  { id:'house_prayer',  label:'House of Prayer',  icon:'⛪', desc:'All members check in same day' },
  { id:'sent_together', label:'Sent Together',    icon:'🏆', desc:'Every member prays 10+ nations' },
];

/* ═══════════════════════════════════════════════════════════════
   END OF GAMIFICATION SCAFFOLDING
   Everything below this line is identical to v2.
   ═══════════════════════════════════════════════════════════════ */

/* ─── ALL NATIONS DATA ─── */
const FlagImg = ({ iso, f, size = 32 }) => {
  if (!iso) return <span style={{ fontSize: size * 0.75 }}>{f}</span>;
  const validWidths = [20, 40, 80, 160, 320, 640, 1280];
  const w = validWidths.reduce((prev, curr) =>
    Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
  );
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/w${w}/${iso}.png`}
      srcSet={`https://flagcdn.com/w${w * 2 <= 1280 ? w * 2 : w}/${iso}.png 2x`}
      width={size}
      height={h}
      alt=""
      style={{ objectFit:"cover", borderRadius:2, display:"inline-block", verticalAlign:"middle" }}
    />
  );
};
// Country shape: { n, f, iso, r, cf, pop, rel, u, ug, cap, lang, m, diaspora?, contenders?, ujp?, ujp_unreached? }
const RAW_COUNTRIES = [
  {
    n: "Mexico", f: "🇲🇽", iso: "mx",
    r: "Americas", cf: "CONCACAF", pop: "130M",
    rel: "Christianity", cap: "Mexico City", lang: "Spanish",
    ug: ["Huichol", "Jewish, Spanish-speaking", "Japanese"],
    m: "Mexico is one of Latin America's top missionary-sending nations and has a vibrant evangelical movement — yet dozens of indigenous peoples in Oaxaca, Chiapas, and the Sierra Madre remain unreached. In North America, millions of Mexican immigrants fill cities from Los Angeles to New York, carrying both gospel need and gospel potential.",
    ujp: 333, ujp_unreached: 4, jp: "MX",
  },
  {
    n: "South Africa", f: "🇿🇦", iso: "za",
    r: "Africa", cf: "CAF", pop: "60M",
    rel: "Christianity", cap: "Pretoria", lang: "Zulu, Xhosa, Afrikaans, English",
    ug: ["Cape Malay Muslims", "Zulu traditionalists", "Indian South Africans"],
    m: "South Africa has one of Africa's largest and most resourced churches — yet significant Muslim and traditional communities remain unreached. The Cape Malay Muslim community in Cape Town, descended from Southeast Asian slaves, has seen almost no gospel engagement for centuries. South Africa is both a sending nation and a mission field.",
    ujp: 63, ujp_unreached: 9, jp: "SF",
  },
  {
    n: "South Korea", f: "🇰🇷", iso: "kr",
    r: "Asia", cf: "AFC", pop: "52M",
    rel: "Christianity", cap: "Seoul", lang: "Korean",
    ug: ["Korean non-religious", "Joseonjok (ethnic Koreans in China)", "North Koreans"],
    m: "South Korea has sent over 20,000 missionaries worldwide — second only to the United States. Yet at home, the church faces declining attendance among younger generations, and the 2.5 million Koreans in North America include many who are culturally Christian but spiritually distant. And yet the nation most on the hearts of South Korean believers — North Korea — remains one of the world's most closed and unreachable.",
    ujp: 30, ujp_unreached: 13, jp: "KS",
  },
  {
    n: "Czechia", f: "🇨🇿", iso: "cz",
    r: "Europe", cf: "UEFA", pop: "10.9M",
    rel: "Secular", cap: "Prague", lang: "Czech",
    ug: ["Jewish, Czech", "Deaf", "Roma Czechs"],
    m: "Czechia is statistically the least religious country in Europe — decades of communist rule left a deep spiritual vacuum that consumerism has not filled. Prague is a gospel frontier: beautiful, post-Christian, and quietly searching. A small evangelical movement is growing, but most Czechs have never had a meaningful encounter with the gospel.",
    ujp: 16, ujp_unreached: 2, jp: "EZ",
  },
  {
    n: "Canada", f: "🇨🇦", iso: "ca",
    r: "Americas", cf: "CONCACAF", pop: "38M",
    rel: "Christianity", cap: "Ottawa", lang: "English, French",
    ug: ["Punjabi Sikhs in Vancouver", "Ismaili Muslims", "Secular Québécois"],
    m: "Canada is home to one of the world's largest Sikh diaspora communities, concentrated in Vancouver and Toronto, as well as hundreds of thousands of Muslims from South Asia, the Middle East, and East Africa. Canada's multicultural cities are extraordinary mission fields — and Canadian churches are only beginning to recognize the unreached peoples living next door. Global Gates Canada is engaging unreached diaspora peoples in cities across Canada.",
    diasporaLink: { text: "gatewaycities.ca", url: "https://gatewaycities.ca" },
    diaspora: "",
    ujp: 244, ujp_unreached: 53, jp: "CA",
  },
  {
    n: "Bosnia & Herzegovina", f: "🇧🇦", iso: "ba",
    r: "Europe", cf: "UEFA", pop: "3.3M",
    rel: "Islam", cap: "Sarajevo", lang: "Bosnian",
    ug: ["Bosniak", "Roma Bosnians", "Albanian Muslims"],
    m: "Sarajevo is one of Europe's most Muslim cities — the legacy of Ottoman rule still shapes daily life. A small but growing evangelical church is quietly taking root in the Balkans, one of the last Protestant frontiers on the continent. The scars of the 1990s war run deep across Bosnian society — making the gospel of reconciliation uniquely compelling in this context.",
    diaspora: "An estimated 350,000 Bosniaks live in the US and Canada, many of them refugees still processing war, displacement, and identity. Learn more: https://upgnorthamerica.com/project/bosniaks-in-north-america/",
    ujp: 8, ujp_unreached: 3, jp: "BK",
  },
  {
    n: "Qatar", f: "🇶🇦", iso: "qa",
    r: "Asia", cf: "AFC", pop: "2.9M",
    rel: "Islam", cap: "Doha", lang: "Arabic",
    ug: ["Arab, Arabic Gulf Spoken", "Arab, Palestinian", "Persian"],
    m: "Qatar's population is over 85% migrant workers — Nepalis, Filipinos, Indians, and Pakistanis who built the World Cup stadiums and now fill the city of Doha. Many come from Hindu, Buddhist, and Muslim backgrounds with little gospel access at home. Qatar is a temporary gathering of nations: workers who carry what they encounter back to their home countries.",
    ujp: 25, ujp_unreached: 14, jp: "QA",
  },
  {
    n: "Brazil", f: "🇧🇷", iso: "br",
    r: "Americas", cf: "CONMEBOL", pop: "215M",
    rel: "Christianity", cap: "Brasília", lang: "Portuguese",
    ug: ["Jewish, Portuguese", "Satere-Mawe", "Turk"],
    m: "Brazil now sends more missionaries than any other country in the Global South — a remarkable shift in the center of gravity of world mission. Yet Brazil's own Amazon basin contains dozens of indigenous peoples who have never heard the gospel, and Brazilian cities have growing Muslim and Jewish communities largely untouched by the church.",
    ujp: 321, ujp_unreached: 52, jp: "BR",
  },
  {
    n: "Morocco", f: "🇲🇦", iso: "ma",
    r: "Africa", cf: "CAF", pop: "37M",
    rel: "Islam", cap: "Rabat", lang: "Arabic, Amazigh (Berber)",
    ug: ["Arab, Moroccan", "Berber, Southern Shilha", "Berber, Tamazight"],
    m: "Morocco is 99.9% Muslim, yet a quiet movement of Moroccans coming to faith in Jesus has been growing for decades — primarily through media, dreams, and personal witness. The Amazigh people of the Atlas Mountains have seen some of the most remarkable gospel movements in North Africa. In North America, Moroccan communities in Montreal, New York, and beyond represent an extraordinary access point.",
    diaspora: "Over 320,000 Moroccan Arabs and Berbers live across North America — concentrated in New York, Montreal, and Los Angeles. Meet them at UPG North America: https://upgnorthamerica.com/project/moroccan-arabs-in-north-america/",
    ujp: 29, ujp_unreached: 27, jp: "MO",
  },
  {
    n: "Haiti", f: "🇭🇹", iso: "ht",
    r: "Americas", cf: "CONCACAF", pop: "11M",
    rel: "Christianity", cap: "Port-au-Prince", lang: "Haitian Creole, French",
    ug: ["Haitian Vodou practitioners", "Rural Haitian poor", "Haitian diaspora (secular)"],
    m: "Haiti is one of the most spiritually complex nations in the Western Hemisphere — a majority Christian country where Vodou is deeply woven into cultural and spiritual life. Despite extraordinary suffering, the Haitian church is remarkably resilient. The Haitian diaspora in Miami, New York, and Montreal carries both deep faith and deep need for wholeness.",
    ujp: 5, ujp_unreached: 1, jp: "HA",
  },
  {
    n: "Scotland", f: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", iso: "gb-sct",
    r: "Europe", cf: "UEFA", pop: "5.5M",
    rel: "Secular", cap: "Edinburgh", lang: "English, Scottish Gaelic",
    ug: ["Secular Scots", "Pakistani Scots", "Polish migrants in Scotland"],
    m: "Scotland once sent missionaries to the ends of the earth — David Livingstone, Eric Liddell, and thousands more. Today Scotland is one of the most post-Christian nations in the UK, with church attendance in steep decline. Yet Pakistani Muslim communities in Glasgow and Edinburgh represent a significant and largely unreached diaspora population right in the heart of historic missionary sending country.",
    ujp: 124, ujp_unreached: 42, jp: "UK",
  },
  {
    n: "USA", f: "🇺🇸", iso: "us",
    r: "Americas", cf: "CONCACAF", pop: "335M",
    rel: "Christianity", cap: "Washington D.C.", lang: "English",
    ug: ["Arab Americans", "Jewish Americans", "Somali Americans"],
    m: "The United States is simultaneously the world's largest missionary-sending nation and home to millions of unreached peoples. Over 400 people groups live in American cities with little or no gospel witness in their own language and culture. Arab, Somali, Afghan, and South Asian Muslim communities in New York, Minneapolis, Houston, and Dearborn represent some of the greatest mission opportunities on earth.",
    ujp: 498, ujp_unreached: 92, jp: "US",
  },
  {
    n: "Paraguay", f: "🇵🇾", iso: "py",
    r: "Americas", cf: "CONMEBOL", pop: "7.4M",
    rel: "Christianity", cap: "Asunción", lang: "Spanish, Guaraní",
    ug: ["Guaraní indigenous", "Guaraní, Eastern Bolivian", "Chamacoco Tomaraho"],
    m: "Paraguay is one of only two countries in the Americas where an indigenous language — Guaraní — is spoken by the majority of the population. The Guaraní people carry a deep spiritual hunger, and the Paraguayan evangelical church is growing. Smaller indigenous groups in the Chaco region remain largely unreached and face significant pressure from land development.",
    ujp: 36, ujp_unreached: 6, jp: "PA",
  },
  {
    n: "Australia", f: "🇦🇺", iso: "au",
    r: "Asia", cf: "AFC", pop: "26M",
    rel: "Christianity", cap: "Canberra", lang: "English",
    ug: ["Aboriginal Australians", "Afghan Australians", "Chinese Australians"],
    m: "Australia is home to Aboriginal and Torres Strait Islander peoples whose spiritual landscape is complex and whose historical relationship with Christianity is painful. At the same time, Sydney and Melbourne host some of the world's largest diaspora communities — Chinese, Lebanese, Afghan, and Vietnamese — many of whom are Muslim or Buddhist and have little church contact.",
    ujp: 208, ujp_unreached: 41, jp: "AS",
  },
  {
    n: "Türkiye", f: "🇹🇷", iso: "tr",
    r: "Europe", cf: "UEFA", pop: "85M",
    rel: "Islam", cap: "Ankara", lang: "Turkish, Kurdish",
    ug: ["Turk", "Kurd, Kurmanji", "Turk, Alevi"],
    m: "Türkiye is home to 15 million Kurds — one of the world's largest unreached people groups — and hosts over 3 million Syrian refugees. The tiny Turkish church faces significant legal and social pressure, yet continues to grow. Türkiye is both a mission field and a strategic bridge between Europe, Central Asia, and the Arab world.",
    diaspora: "Around 425,000 Turks and tens of thousands of Kurds live across North America, in cities from New York to Chicago to Toronto. Explore their communities: https://upgnorthamerica.com/project/turks-in-north-america/",
    ujp: 85, ujp_unreached: 61, jp: "TU",
  },
  {
    n: "Germany", f: "🇩🇪", iso: "de",
    r: "Europe", cf: "UEFA", pop: "84M",
    rel: "Christianity", cap: "Berlin", lang: "German",
    ug: ["Turk", "Bosniak", "Arab, Iraqi"],
    m: "Germany is home to over 5 million Muslims, making it one of Europe's largest Muslim-majority diaspora contexts. The Turkish community — over 3 million strong — has been in Germany for generations with minimal evangelical engagement. Berlin, Hamburg, and Frankfurt are also home to growing Kurdish, Afghan, and Arab communities. German churches are beginning to wake up to the unreached peoples in their own cities.",
    ujp: 104, ujp_unreached: 38, jp: "GM",
  },
  {
    n: "Curaçao", f: "🇨🇼", iso: "cw",
    r: "Americas", cf: "CONCACAF", pop: "155K",
    rel: "Christianity", cap: "Willemstad", lang: "Papiamentu, Dutch, English",
    ug: ["East Indian", "Jewish, Dutch", "Deaf"],
    m: "Curaçao makes a rare World Cup appearance for this small Caribbean island — a Dutch territory with a warm, syncretic Christian heritage. The island has seen a wave of Venezuelan and Haitian migrants in recent years, many in precarious conditions. Curaçao's diaspora in the Netherlands represents a bridge community with gospel potential in both directions.",
    ujp: 16, ujp_unreached: 3, jp: "UC",
  },
  {
    n: "Côte d'Ivoire", f: "🇨🇮", iso: "ci",
    r: "Africa", cf: "CAF", pop: "27M",
    rel: "Islam", cap: "Yamoussoukro", lang: "French",
    ug: ["Jula (Dioula)", "Hausa", "Fulani, Maasina"],
    m: "Côte d'Ivoire is evenly divided between Muslim north and Christian south — a spiritual and cultural fault line that has fueled decades of political tension. The Dioula Muslim people are one of the largest unreached groups in West Africa, spread across the Sahel. Yet the Ivorian church is vibrant, growing, and increasingly mission-minded toward its own unreached north.",
    ujp: 105, ujp_unreached: 32, jp: "IV",
  },
  {
    n: "Ecuador", f: "🇪🇨", iso: "ec",
    r: "Americas", cf: "CONMEBOL", pop: "18M",
    rel: "Christianity", cap: "Quito", lang: "Spanish, Kichwa",
    ug: ["Kichwa indigenous", "Shuar", "Afro-Ecuadorian"],
    m: "Ecuador's Amazon and Andes regions are home to numerous indigenous peoples, including the Kichwa and Shuar, where significant gospel movements have taken root in recent decades. Ecuador also has a growing evangelical church that is increasingly engaged in missions. Ecuadorian migrants in New York and New Jersey form one of the largest South American diaspora communities in the US.",
    ujp: 33, ujp_unreached: 1, jp: "EC",
  },
  {
    n: "Netherlands", f: "🇳🇱", iso: "nl",
    r: "Europe", cf: "UEFA", pop: "17.9M",
    rel: "Non-religious", cap: "Amsterdam", lang: "Dutch",
    ug: ["Arab, Moroccan", "Turk", "Berber, Rif"],
    m: "The Netherlands is home to over a million Muslims, predominantly Moroccan and Turkish, many of whom have been in the country for two or three generations with minimal gospel engagement. Amsterdam is post-Christian and philosophically secular — yet Dutch Reformed missionary movements shaped global Christianity for centuries. The Netherlands is both a legacy sending nation and a new mission field.",
    ujp: 71, ujp_unreached: 20, jp: "NL",
  },
  {
    n: "Japan", f: "🇯🇵", iso: "jp",
    r: "Asia", cf: "AFC", pop: "125M",
    rel: "Buddhism", cap: "Tokyo", lang: "Japanese",
    ug: ["Japanese", "Okinawan, Ryukyuan", "Burakumin"],
    m: "Japan is one of the most gospel-resistant nations on earth — less than 1% Christian after centuries of missionary work. The spiritual stronghold of ancestor veneration and the social pressure against standing out make conversion costly. Yet Japanese diaspora communities in Brazil, the US, and Canada — often more open than those at home — represent a unique access point for the Japanese church.",
    ujp: 43, ujp_unreached: 28, jp: "JA",
  },
  {
    n: "Sweden", f: "🇸🇪", iso: "se",
    r: "Europe", cf: "UEFA", pop: "10.5M",
    rel: "Secular", cap: "Stockholm", lang: "Swedish",
    ug: ["Arab, Iraqi", "Hazara", "Somali"],
    m: "Sweden sent missionaries across the globe for two centuries — now the mission field has come home. Stockholm and Gothenburg are home to hundreds of thousands of Muslim refugees from Somalia, Iraq, and Afghanistan. Swedish churches that once sent workers abroad are now discovering their unreached neighbors next door.",
    ujp: 74, ujp_unreached: 24, jp: "SW",
  },
  {
    n: "Tunisia", f: "🇹🇳", iso: "tn",
    r: "Africa", cf: "CAF", pop: "12M",
    rel: "Islam", cap: "Tunis", lang: "Arabic",
    ug: ["Arab, Tunisian", "Arab, Libyan", "Algerian, Arabic-speaking"],
    m: "Tunisia is 99% Muslim, yet since the Arab Spring of 2011 there has been a measurable increase in Tunisians exploring Christianity — particularly through online media and satellite TV. The Tunisian church is tiny but growing, and a number of Tunisians have come to faith through dreams and visions. Tunisian diaspora communities in France and Italy are also seeing quiet gospel movement.",
    diaspora: "Around 80,000 Tunisian Arabs have settled across North America, carrying both Islamic identity and growing spiritual openness. Explore their story: https://upgnorthamerica.com/project/tunisian-arabs-in-north-america/",
    ujp: 19, ujp_unreached: 17, jp: "TS",
  },
  {
    n: "Belgium", f: "🇧🇪", iso: "be",
    r: "Europe", cf: "UEFA", pop: "11.6M",
    rel: "Non-religious", cap: "Brussels", lang: "Dutch, French, German",
    ug: ["Arab, Moroccan", "Turk", "Berber, Kabyle"],
    m: "Brussels is the administrative capital of the EU and home to one of Europe's most diverse Muslim populations — Moroccan, Turkish, and Congolese communities concentrated in neighborhoods like Molenbeek. Belgium's Catholic heritage has largely evaporated, leaving a post-Christian population alongside a growing Muslim community with little evangelical engagement. Belgian churches are small but missionally motivated.",
    ujp: 56, ujp_unreached: 27, jp: "BE",
  },
  {
    n: "Egypt", f: "🇪🇬", iso: "eg",
    r: "Africa", cf: "CAF", pop: "105M",
    rel: "Islam", cap: "Cairo", lang: "Arabic",
    ug: ["Arab, Egyptian Muslim", "Arab, Saidi - Muslim", "Arab, Sudanese"],
    m: "Egypt is home to the Coptic Church — one of the oldest Christian communities on earth, dating to the Apostle Mark. Yet 90% of Egypt's 105 million people are Muslim, and Coptic believers face significant discrimination. In recent years, an extraordinary number of Egyptian Muslims have come to faith through satellite television and online media, making Egypt one of the most dynamic gospel movements in the Arab world.",
    diaspora: "Egyptian Arab communities have established themselves across North American cities — a people with ancient Christian roots and a growing diaspora hunger. Discover more: https://upgnorthamerica.com/project/egyptian-arabs-in-north-america/",
    ujp: 46, ujp_unreached: 33, jp: "EG",
  },
  {
    n: "Iran", f: "🇮🇷", iso: "ir",
    r: "Asia", cf: "AFC", pop: "87M",
    rel: "Islam", cap: "Tehran", lang: "Farsi (Persian)",
    ug: ["Persian", "Azerbaijani, Azeri Turk", "Kurd, Southern"],
    m: "Iran is experiencing one of the fastest-growing church movements in the world — estimates suggest hundreds of thousands of Iranians have come to faith in the past two decades, primarily through underground house churches and satellite media. The Islamic Republic's restrictions have paradoxically fueled spiritual hunger. Iranian diaspora communities in Los Angeles, Toronto, and London are also seeing significant gospel movement.",
    diaspora: "Over 580,000 Persians live in the US and Canada — in Los Angeles, Toronto, and beyond — many more spiritually open in diaspora than at home. Explore their story: https://upgnorthamerica.com/project/persians-in-north-america/",
    ujp: 91, ujp_unreached: 85, jp: "IR",
  },
  {
    n: "New Zealand", f: "🇳🇿", iso: "nz",
    r: "Oceania", cf: "OFC", pop: "5.1M",
    rel: "Christianity", cap: "Wellington", lang: "English, Māori",
    ug: ["Māori people", "Pacific Islander migrants", "Indian New Zealanders"],
    m: "New Zealand's indigenous Māori people have a complex relationship with Christianity — the gospel arrived alongside colonization, and reclaiming a distinctly Māori expression of faith is an ongoing journey. Auckland is one of the world's most Polynesian cities and home to growing South Asian and Chinese communities. New Zealand churches are small but engaged in cross-cultural mission both locally and across the Pacific.",
    ujp: 60, ujp_unreached: 19, jp: "NZ",
  },
  {
    n: "Spain", f: "🇪🇸", iso: "es",
    r: "Europe", cf: "UEFA", pop: "47M",
    rel: "Non-religious", cap: "Madrid", lang: "Spanish",
    ug: ["Arab, Moroccan", "Romani (Gitano)", "Wolof"],
    m: "Spain's Catholic heritage is deep but its church attendance has collapsed — Spain is now one of Europe's most secular nations. At the same time, Spain has Europe's fastest-growing Muslim population, with Moroccan, Senegalese, and Pakistani communities concentrated in Madrid, Barcelona, and Catalonia. The Romani (Gitano) people of Spain have seen one of Europe's most remarkable gospel movements through the Filadelfia Church.",
    ujp: 77, ujp_unreached: 11, jp: "SP",
  },
  {
    n: "Cabo Verde", f: "🇨🇻", iso: "cv",
    r: "Africa", cf: "CAF", pop: "560K",
    rel: "Christianity", cap: "Praia", lang: "Portuguese, Cape Verdean Creole",
    ug: ["Fulani, Adamawa", "Deaf"],
    m: "Cabo Verde makes its first-ever World Cup appearance — a tiny island nation of 560,000 with a diaspora larger than its home population scattered across Portugal, the Netherlands, and New England. The diaspora carries gospel potential: Cape Verdean believers in Boston and Lisbon are uniquely positioned to reach their own communities and beyond.",
    ujp: 5, ujp_unreached: 2, jp: "CV",
  },
  {
    n: "Saudi Arabia", f: "🇸🇦", iso: "sa",
    r: "Asia", cf: "AFC", pop: "35M",
    rel: "Islam", cap: "Riyadh", lang: "Arabic",
    ug: ["Arab, Saudi - Najdi", "Arab, Saudi - Hijazi", "Arab, Bedouin"],
    m: "Saudi Arabia is the birthplace of Islam and one of the most restricted nations for gospel witness — yet something remarkable is happening. Reports of Saudis coming to faith through dreams, visions, and online media have multiplied in recent years. The young population, shaken by rapid modernization and the contradictions of Saudi Arabia's Vision 2030 modernization agenda, is spiritually searching in ways previous generations were not.",
    diaspora: "Saudi Arab communities are present across North America, often students and professionals with rare access to the gospel in their home country. Learn more: https://upgnorthamerica.com/project/saudi-arab-muslims-in-north-america/",
    ujp: 57, ujp_unreached: 43, jp: "SA",
  },
  {
    n: "Uruguay", f: "🇺🇾", iso: "uy",
    r: "Americas", cf: "CONMEBOL", pop: "3.5M",
    rel: "Non-religious", cap: "Montevideo", lang: "Spanish",
    ug: ["Secular Uruguayans", "Jewish, Spanish-speaking", "Afro-Uruguayans"],
    m: "Uruguay is the most secular nation in Latin America — over 40% of Uruguayans identify as non-religious, a legacy of early state secularization. The evangelical church is small but growing, and youth movements are creating new openings. Uruguay's Jewish community — one of the largest per capita in South America — has historically been resistant to the gospel but is increasingly open to conversation.",
    ujp: 24, ujp_unreached: 2, jp: "UY",
  },
  {
    n: "France", f: "🇫🇷", iso: "fr",
    r: "Europe", cf: "UEFA", pop: "68M",
    rel: "Non-religious", cap: "Paris", lang: "French",
    ug: ["Berber, Kabyle", "Algerian, Arabic-speaking", "Arab, Moroccan"],
    m: "France has the largest Muslim population in Western Europe — 5 to 6 million, predominantly North African — concentrated in the banlieues of Paris, Lyon, and Marseille. France is also deeply post-Christian, with the Catholic Church in significant decline. Yet a growing evangelical movement is finding traction in immigrant communities, and French-speaking North Africans are among the most responsive to the gospel in the diaspora.",
    ujp: 118, ujp_unreached: 41, jp: "FR",
  },
  {
    n: "Senegal", f: "🇸🇳", iso: "sn",
    r: "Africa", cf: "CAF", pop: "17M",
    rel: "Islam", cap: "Dakar", lang: "French, Wolof",
    ug: ["Wolof", "Fulani, Fulakunda", "Maninka, Western"],
    m: "Senegal is 96% Muslim, dominated by powerful Sufi brotherhoods — the Mourides and Tijaniyya — whose influence shapes every aspect of social and spiritual life. The Wolof people, Senegal's largest ethnic group, are considered one of the least-reached in West Africa. Yet Senegalese diaspora communities in New York, Paris, and Italy are often more spiritually open than those at home.",
    diaspora: "Around 60,000 Wolof and other Senegalese live in North America, with New York City holding the largest concentration. Explore their communities: https://upgnorthamerica.com/project/wolof-in-north-america/",
    ujp: 54, ujp_unreached: 28, jp: "SG",
  },
  {
    n: "Iraq", f: "🇮🇶", iso: "iq",
    r: "Asia", cf: "AFC", pop: "42M",
    rel: "Islam", cap: "Baghdad", lang: "Arabic, Kurdish",
    ug: ["Yazidis", "Arab, Iraqi", "Kurd, Sorani"],
    m: "Iraq's ancient Assyrian Church — one of Christianity's oldest — was devastated by ISIS and decades of conflict. Yet the Yazidi people, who survived genocide, represent an extraordinary gospel opportunity: a community in trauma, open to spiritual conversation in ways rarely seen before. Iraq is a nation marked by suffering — and by an unexpected openness that suffering has created.",
    diaspora: "Around 344,000 Iraqi Arabs live in North America — with major communities in Detroit, Chicago, Toronto, and Nashville. Explore their story: https://upgnorthamerica.com/project/iraqi-arabs-in-north-america/",
    ujp: 33, ujp_unreached: 27, jp: "IZ",
  },
  {
    n: "Norway", f: "🇳🇴", iso: "no",
    r: "Europe", cf: "UEFA", pop: "5.4M",
    rel: "Secular", cap: "Oslo", lang: "Norwegian",
    ug: ["Somali", "Tigre, Eritrean", "Persian"],
    m: "Norway sent extraordinary missionaries across the globe — including to China, Madagascar, and Ethiopia. Today, Oslo is home to one of Europe's largest Pakistani Muslim communities, as well as significant Somali and Iraqi populations. Norwegian churches that once supported foreign missions are now finding the mission field on their doorstep, in apartment blocks around the corner from historic Lutheran churches.",
    ujp: 53, ujp_unreached: 17, jp: "NO",
  },
  {
    n: "Argentina", f: "🇦🇷", iso: "ar",
    r: "Americas", cf: "CONMEBOL", pop: "46M",
    rel: "Christianity", cap: "Buenos Aires", lang: "Spanish",
    ug: ["Jewish, Spanish-speaking", "Wichi indigenous", "Mapuche"],
    m: "Argentina has one of the largest Jewish populations outside Israel and the United States — concentrated in Buenos Aires — as well as dozens of indigenous peoples in Patagonia and the Gran Chaco who remain unreached. Argentina's evangelical church has grown dramatically in recent decades and now sends missionaries across Latin America and beyond. The country is both a mission field and a sending force.",
    ujp: 79, ujp_unreached: 3, jp: "AR",
  },
  {
    n: "Algeria", f: "🇩🇿", iso: "dz",
    r: "Africa", cf: "CAF", pop: "45M",
    rel: "Islam", cap: "Algiers", lang: "Arabic, Tamazight (Berber)",
    ug: ["Algerian, Arabic-speaking", "Berber, Kabyle", "Berber, Shawiya"],
    m: "Algeria has seen one of the most dramatic church growth stories in North Africa — the Kabyle Berber people in the mountainous Kabylie region have experienced a remarkable movement to Christ over the past 30 years, with tens of thousands coming to faith. The Algerian government has responded with increased restrictions, making fellowship costly. Algerian diaspora communities in France carry extraordinary gospel potential.",
    diaspora: "An estimated 120,000+ Algerians live in North America, including a significant Kabyle Berber diaspora in Montreal and Toronto. Learn more: https://upgnorthamerica.com/project/algerian-arabs-in-north-america/",
    ujp: 37, ujp_unreached: 34, jp: "AG",
  },
  {
    n: "Austria", f: "🇦🇹", iso: "at",
    r: "Europe", cf: "UEFA", pop: "9.1M",
    rel: "Christianity", cap: "Vienna", lang: "German",
    ug: ["Turk", "Bosniak", "Chechen"],
    m: "Vienna is one of Europe's great gateway cities — home to significant Chechen, Afghan, and Turkish Muslim communities, many of whom are refugees with complex trauma histories. Austria's Catholic heritage is largely nominal, and evangelical churches are small but growing. Vienna's position at the crossroads of Central Europe makes it a strategic hub for diaspora ministry.",
    ujp: 46, ujp_unreached: 13, jp: "AU",
  },
  {
    n: "Jordan", f: "🇯🇴", iso: "jo",
    r: "Asia", cf: "AFC", pop: "10M",
    rel: "Islam", cap: "Amman", lang: "Arabic",
    ug: ["Arab, Jordanian", "Arab, Palestinian", "Arab, Bedouin"],
    m: "Jordan hosts more refugees per capita than almost any nation on earth — Palestinians, Syrians, and Iraqis — creating an extraordinary and complex mission context. Amman has become a refuge for Arab Christians displaced by regional conflict, and also a place where displaced Muslims are asking deep questions about faith and identity. Jordan's tiny evangelical church quietly serves across these communities.",
    diaspora: "Around 55,000 Jordanian Arabs live in North America, with communities in Chicago, Detroit, New York, and Los Angeles. Explore their communities: https://upgnorthamerica.com/project/jordanian-arabs-in-north-america/",
    ujp: 26, ujp_unreached: 20, jp: "JO",
  },
  {
    n: "Portugal", f: "🇵🇹", iso: "pt",
    r: "Europe", cf: "UEFA", pop: "10.3M",
    rel: "Christianity", cap: "Lisbon", lang: "Portuguese",
    ug: ["Cape Verdean Portuguese", "Angolan Portuguese", "Brazilian migrants"],
    m: "Portugal once launched the Age of Exploration and sent the gospel to Brazil, Angola, and Mozambique. Today, Lisbon is post-Catholic and post-colonial — a city rediscovering its identity as immigration reshapes its demographics. Cape Verdean, Angolan, and Brazilian communities have brought vibrant evangelical Christianity back to Portugal's streets. Lisbon may be one of Europe's most quietly spiritually dynamic cities.",
    ujp: 35, ujp_unreached: 5, jp: "PO",
  },
  {
    n: "DR Congo", f: "🇨🇩", iso: "cd",
    r: "Africa", cf: "CAF", pop: "100M",
    rel: "Christianity", cap: "Kinshasa", lang: "French, Lingala, Swahili",
    ug: ["Mongo", "Luba", "Pygmy (Mbuti) peoples"],
    m: "DR Congo has over 200 distinct people groups and Africa's fourth-largest population. While Christianity is widespread, deep syncretism with traditional religion means millions have never encountered an undiluted gospel. Remote frontier communities in the Congo Basin remain among the least-reached in sub-Saharan Africa.",
    ujp: 231, ujp_unreached: 4, jp: "CG",
  },
  {
    n: "Uzbekistan", f: "🇺🇿", iso: "uz",
    r: "Asia", cf: "AFC", pop: "36M",
    rel: "Islam", cap: "Tashkent", lang: "Uzbek, Russian",
    ug: ["Uzbek, Northern", "Tajik", "Kazakh"],
    m: "Uzbekistan is a Central Asian nation of 36 million with one of the smallest and most persecuted Christian communities in the world — evangelical believers face imprisonment and severe social pressure. The Uzbek people are one of the largest unreached people groups on earth. Despite this, a quiet house church movement persists, and Uzbek diaspora communities in Russia and the West are more accessible than those at home.",
    diaspora: "Around 68,000 Uzbeks live in North America — one of the most accessible pockets of a people group that faces severe persecution at home. Meet them at UPG North America: https://upgnorthamerica.com/project/uzbeks-in-north-america/",
    ujp: 44, ujp_unreached: 26, jp: "UZ",
  },
  {
    n: "Colombia", f: "🇨🇴", iso: "co",
    r: "Americas", cf: "CONMEBOL", pop: "52M",
    rel: "Christianity", cap: "Bogotá", lang: "Spanish",
    ug: ["Wayuu indigenous", "Kogi", "Wiwa"],
    m: "Colombia's church grew through decades of conflict — narco violence, guerrilla war, and displacement forged a resilient evangelical movement that now reaches across social classes. Colombia is increasingly a missionary-sending nation, with churches planting across Latin America. Colombian migrants in the US and Spain carry deep faith and significant gospel potential in their diaspora communities.",
    ujp: 120, ujp_unreached: 15, jp: "CO",
  },
  {
    n: "England", f: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", iso: "gb-eng",
    r: "Europe", cf: "UEFA", pop: "57M",
    rel: "Non-religious", cap: "London", lang: "English",
    ug: ["British Pakistanis", "British Bangladeshis", "British Somalis"],
    m: "London is one of the most ethnically diverse cities on earth and home to Europe's largest Pakistani and Bangladeshi Muslim communities. British South Asian Muslims — nearly 4 million across England — represent one of the most significant unreached diaspora populations in the Western world. England's evangelical churches are growing, increasingly multicultural, and waking up to the mission field on their own streets.",
    ujp: 124, ujp_unreached: 42, jp: "UK",
  },
  {
    n: "Croatia", f: "🇭🇷", iso: "hr",
    r: "Europe", cf: "UEFA", pop: "4M",
    rel: "Christianity", cap: "Zagreb", lang: "Croatian",
    ug: ["Bosniak", "Roma Croats", "Jewish, Croatian-speaking"],
    m: "Croatia is deeply Catholic — over 85% identify as Catholic — yet genuine evangelical presence is tiny. The Roma people spread across the Balkans are one of Europe's most significant unreached groups, facing profound marginalization. Croatia also shares a border with Bosnia, and Croatian churches have a unique opportunity to engage both their own post-Catholic population and Muslim neighbors across the region.",
    ujp: 17, ujp_unreached: 3, jp: "HR",
  },
  {
    n: "Ghana", f: "🇬🇭", iso: "gh",
    r: "Africa", cf: "CAF", pop: "33M",
    rel: "Christianity", cap: "Accra", lang: "English, Akan, Hausa",
    ug: ["Mamprusi", "Gonja", "Hausa"],
    m: "Ghana's evangelical church in the south is one of Africa's most vibrant — sending missionaries and planting churches across the continent. Yet Ghana's Muslim-majority north remains largely unreached, home to the Dagomba, Konkomba, and Fulani peoples. Ghana is simultaneously a sending nation and a nation with its own frontier.",
    ujp: 108, ujp_unreached: 16, jp: "GH",
  },
  {
    n: "Panama", f: "🇵🇦", iso: "pa",
    r: "Americas", cf: "CONCACAF", pop: "4.4M",
    rel: "Christianity", cap: "Panama City", lang: "Spanish",
    ug: ["Guna (Kuna) indigenous", "Emberá", "Jewish, Spanish-speaking"],
    m: "Panama is a crossroads nation — geographically and spiritually. The Panama Canal connects oceans; Panama's growing evangelical church is beginning to see its role connecting gospel movements across the Americas. Indigenous peoples including the Guna and Emberá have seen significant gospel movement. Panama City's Chinese community, one of the oldest in Latin America, remains largely unreached by local churches.",
    ujp: 26, ujp_unreached: 2, jp: "PM",
  },
  {
    n: "Switzerland", f: "🇨🇭", iso: "ch",
    r: "Europe", cf: "UEFA", pop: "8.7M",
    rel: "Christianity", cap: "Bern", lang: "German, French, Italian",
    ug: ["Turk", "Bosniak", "Arab, Syrian"],
    m: "Switzerland's Reformed heritage shaped global Protestantism — Calvin's Geneva was a city of refuge and theological renewal. Today Switzerland is thoroughly post-Christian, yet Zurich, Geneva, and Basel host significant Turkish, Kosovar, and North African Muslim communities with minimal gospel engagement. Switzerland is both a historic center of world mission and a new mission field at home.",
    ujp: 58, ujp_unreached: 17, jp: "SZ",
  }
];

/* ─── PLAYOFF TBD SLOTS ─── */
/* ─── SCHEDULE DATA ─── */
const RAW_SCHEDULE = [
  { d:"Jun 11", full:"Thursday, June 11", img:"/images/day-01.png", feat:["Mexico","South Africa"], dev:`The World Cup is one of the greatest celebrations of the nations, thanks to the global sport of soccer. This year, more nations than ever will participate as the field of teams expands to 48, and for the first time, the tournament will be held in 3 host nations (U.S., Mexico, & Canada). Truly, the eyes of the world will be focused on soccer over the next month, and some have estimated that the 104 matches will bring between 1.5 and 2.5 million international visitors to North America. This means the story of this year's World Cup is the story of the nations coming to us, and that is a story that God set in motion from the beginning. Read Acts 17:26-27.`, pray:`Prayer for the nations to know and experience God through this year's World Cup. • Pray that people will see and experience God's heart for the nations, and many will come to know him as Lord and Savior. • Pray for the nations represented in this year's World Cup who are considered unreached by the Gospel. Ask the Lord to bring them into contact with believers, so they can hear the Good News.`, matches:[{t:"3:00 PM",a:"Mexico",b:"South Africa",g:"A",v:"Mexico City Stadium"},{t:"10:00 PM",a:"South Korea",b:"Czechia",g:"A",v:"Guadalajara Stadium"}] },
  { d:"Jun 12", full:"Friday, June 12", img:"/images/day-02.png", feat:["Haiti","Scotland"], dev:`Their joyful singing filled the historic church building. These Haitian believers who had immigrated to the US were training to share the Good News with the unreached in their metro area. Despite its tragic history of slavery, violence, and corruption, the small island country of Haiti has produced a strong core of believers. They face an uphill task, taking the light of Jesus into communities dominated by fear, Vodou spiritism, and gang culture. But many Haitians, like those believers above, have embraced the calling of 2 Corinthians 5:18-20. They are living as ambassadors for Christ!`, pray:`Both Haiti and Scotland are countries with fervent Christian believers. • Pray for Haitian believers to bring light into a land troubled by spiritual darkness from those practicing Vodou and cultural darkness from centuries of poverty and oppression. • Pray for believers in Scotland to bear witness to Christ in a region struggling with poverty and alcoholism, even among the greater wealth of Great Britain.`, matches:[{t:"3:00 PM",a:"Canada",b:"Bosnia & Herzegovina",g:"B",v:"BMO Field, Toronto"},{t:"9:00 PM",a:"USA",b:"Paraguay",g:"D",v:"SoFi Stadium, Los Angeles"}] },
  { d:"Jun 13", full:"Saturday, June 13", img:"/images/day-03.png", feat:["Brazil","Morocco"], dev:`When it comes to Jesus, there are two teams with competing beliefs. Is Jesus truly the Son of God or merely human? This match is not about humans trying to defeat each other, but a spiritual battle about who Jesus really is and how we should respond to him. Thankfully, over the decades, millions in Brazil have embraced Jesus as their Lord and Redeemer and are now taking the Gospel to other nations! We should pray that this same spiritual response would echo across the Atlantic in the Muslim nation of Morocco, where many currently only see Jesus as a good prophet. In this match to redeem the souls of men, the outcome truly matters for eternity.`, pray:`Brazil was once a missionary receiver but now is sending the Gospel around the globe. Morocco remains a very closed land to the Gospel. • Pray for Brazil's large Evangelical population to continue its missions focus to the unreached worldwide while not ignoring the unreached people groups in the country's Amazon basin. • Pray for the spread of the Good News among the Berber people groups of Morocco. Church planting movements have happened in neighboring Algeria, but have not yet spread into similar groups in Morocco.`, matches:[{t:"3:00 PM",a:"Qatar",b:"Switzerland",g:"B",v:"Levi's Stadium, San Francisco"},{t:"6:00 PM",a:"Brazil",b:"Morocco",g:"C",v:"MetLife Stadium, New York/NJ"},{t:"9:00 PM",a:"Haiti",b:"Scotland",g:"C",v:"Gillette Stadium, Boston"}] },
  { d:"Jun 14", full:"Sunday, June 14", img:"/images/day-04.png", feat:["Spain","Uruguay"], dev:`Uruguay is one of the most secular countries in South America. Spain was once the center of European Catholicism, but many historical churches sit empty. In the book of Acts, we see the Apostle Paul on his travels sharing Christ with the religious leaders of his day and then proclaiming the Gospel to pagan Greeks and Romans in the marketplace, often in the same city! The same Gospel can give new life to hearts struggling with any kind of belief as well as hearts trying to break free from dead religious practices. It truly is "the power of God for salvation to everyone who believes"! (Romans 1:16-17)`, pray:`A Gospel for the religious and the irreligious is what Spain and Uruguay truly need! • Pray for Latin American missionaries who are working in Spain to be Spirit-filled and a light for the Gospel. • Pray especially for Christian writers and Bible distribution to fill Uruguay's highly literate but secular population with Gospel resources that can open hearts and minds to the light of Jesus.`, matches:[{t:"12:00 AM",a:"Australia",b:"Türkiye",g:"D",v:"BC Place, Vancouver"},{t:"1:00 PM",a:"Germany",b:"Curaçao",g:"E",v:"Shell Energy Stadium, Houston"},{t:"4:00 PM",a:"Netherlands",b:"Japan",g:"F",v:"AT&T Stadium, Dallas"},{t:"7:00 PM",a:"Côte d'Ivoire",b:"Ecuador",g:"E",v:"Lincoln Financial Field, Philadelphia"},{t:"10:00 PM",a:"Sweden",b:"Tunisia",g:"F",v:"Estadio BBVA, Monterrey"}] },
  { d:"Jun 15", full:"Monday, June 15", img:"/images/day-05.png", feat:["Iran","Iraq"], dev:`Question: What does a country that was an early center of Christianity have in common with the country in which the Church is growing the fastest today? Answer: they're each playing in the 2026 World Cup: Iraq and Iran! Having both fallen to seventh-century Islamic conquests, these countries more recently have garnered attention for the trauma of their peoples as well as the persecution of local believers. While God is undoubtedly at work in each of these neighboring (yet distinct) nations, Iraq and Iran desperately need our prayers today.`, pray:`Iraq and Iran need the Gospel of Jesus proclaimed throughout their borders. • Pray that the people of Iraq would hear the Good News that Jesus has paid their debt to rescue them from trying to earn their own salvation. • Pray for bold witness from the Iranian church as well as reception of the Good News by Iranians throughout the country. Pray for the Persian diaspora around the world to search for true hope during this current season.`, matches:[{t:"12:00 PM",a:"Spain",b:"Cabo Verde",g:"H",v:"Mercedes-Benz Stadium, Atlanta"},{t:"3:00 PM",a:"Belgium",b:"Egypt",g:"G",v:"Lumen Field, Seattle"},{t:"6:00 PM",a:"Saudi Arabia",b:"Uruguay",g:"H",v:"Hard Rock Stadium, Miami"},{t:"9:00 PM",a:"Iran",b:"New Zealand",g:"G",v:"SoFi Stadium, Los Angeles"}] },
  { d:"Jun 16", full:"Tuesday, June 16", img:"/images/day-06.png", feat:["Senegal","Algeria"], dev:`Africans can clearly understand the reason Jesus said the Kingdom of Heaven is like a great tree where the birds find rest in its great branches (Matthew 13:31-32). In both West Africa and North Africa, the people live and thrive under the African sun by utilizing the shade of great trees for refuge from the searing heat! We as followers of Jesus are to seek God's Kingdom's growth; it should occupy our prayers, our actions, our finances. It is only in this great Kingdom that all the nations on Earth will find the rest they long for. Christ desires all people including the Senegalese and Tunisians to experience life in this Kingdom, and Christ wants to use us to invite them!`, pray:`The Church in Senegal and Tunisia is small, and there is great resistance to its growth. • Pray that new believers would be protected against family pressure against Christianity and fully commit to follow Jesus. • Pray for the Senegalese and Tunisian diaspora in North America and Europe to be befriended by Christians and hear the Gospel.`, matches:[{t:"3:00 PM",a:"France",b:"Senegal",g:"I",v:"MetLife Stadium, New York/NJ"},{t:"6:00 PM",a:"Iraq",b:"Norway",g:"I",v:"Gillette Stadium, Boston"},{t:"9:00 PM",a:"Argentina",b:"Algeria",g:"J",v:"Arrowhead Stadium, Kansas City"}] },
  { d:"Jun 17", full:"Wednesday, June 17", img:"/images/day-07.png", feat:["Portugal","DR Congo"], dev:`The Democratic Republic of the Congo (formerly Zaire) is actually the second largest country in Africa, filled with rainforests, mountains, volcanos and rivers. Its natural riches have contributed to its tragic history though. King Leopold II of Belgium exploited its people as slaves, leading to millions of deaths in the early 1900s. Congo's mountains are filled with rare earth materials and diamonds, but very few of its people have profited from the export of these over the years. Its intense geography makes it difficult for a central government to adequately resource and protect its citizens from regional rebel groups and militias. Despite such darkness, God has raised up many Congolese believers, both in the DRC and in places like the US, to be his treasured possessions! (1 Peter 2:9)`, pray:`Portugal and the Democratic Republic of the Congo are an odd pairing: a former colonial power and a country looted by colonial powers. • Pray for healthy churches to be planted in Portugal. Brazilian missionaries have made progress since 2001 but many of these church plants close and lack staying power. • Pray for Congolese believers to be more fully equipped to take the Gospel into the hardest-to-reach places of their country and for an end to the regional violence there.`, matches:[{t:"12:00 AM",a:"Austria",b:"Jordan",g:"J",v:"Levi's Stadium, San Francisco"},{t:"1:00 PM",a:"Portugal",b:"DR Congo",g:"K",v:"Shell Energy Stadium, Houston"},{t:"4:00 PM",a:"England",b:"Croatia",g:"L",v:"AT&T Stadium, Dallas"},{t:"7:00 PM",a:"Ghana",b:"Panama",g:"L",v:"BMO Field, Toronto"},{t:"10:00 PM",a:"Uzbekistan",b:"Colombia",g:"K",v:"Estadio Azteca, Mexico City"}] },
  { d:"Jun 18", full:"Thursday, June 18", img:"/images/day-08.png", feat:["Jordan","Qatar"], dev:`Jordan has long been a land where paths converge — refugees, pilgrims, and trade routes. Qatar draws the world's workforce to its shores on the Persian Gulf. Both are crossroads nations, full of people far from home. Countries that look like Islamic strongholds from the outside are often a mission field in motion. At Pentecost, God first gathered the nations into Jerusalem, so that they could carry the Gospel back home. Let's pray that the people groups living, working, and passing through Jordan and Qatar can hear the Gospel and be transformed by it. "Parthians, Medes, Elamites… we hear them telling the mighty works of God." — Acts 2:9,11`, pray:`Both the Arab populations in Qatar and Jordan are in desperate need of the Gospel, as well as Qatar's large South Asian population. • Ask that God opens hearts and minds of Arab Muslims in Jordan and Qatar so that they hear the Gospel and accept it. • Ask the Lord to send laborers with a vision of reaching South Asia so that Qatar becomes a place where Indians, Bangladeshis, and more receive the Gospel and are trained to make disciples back home.`, matches:[{t:"12:00 PM",a:"Czechia",b:"South Africa",g:"A",v:"Mercedes-Benz Stadium, Atlanta"},{t:"3:00 PM",a:"Switzerland",b:"Bosnia & Herzegovina",g:"B",v:"SoFi Stadium, Los Angeles"},{t:"6:00 PM",a:"Canada",b:"Qatar",g:"B",v:"BC Place, Vancouver"},{t:"9:00 PM",a:"Mexico",b:"South Korea",g:"A",v:"Guadalajara Stadium"}] },
  { d:"Jun 19", full:"Friday, June 19", img:"/images/day-09.png", feat:["Türkiye","Australia"], dev:`The world is coming to Türkiye and Australia. Both are major destinations for refugees fleeing violence and persecution in their home countries. God is behind this. Acts 17:26-27 tells us that God determines the times and places of people's dwelling "that they should seek God." The Holy Spirit is working in Türkiye, bringing Muslim refugees to faith in Jesus as their God and Savior. Refugees from Iraq, Syria, Iran, Afghanistan, and other countries are being introduced to Christ, following him, and leading others to him. In Australia too, as local believers love and share the Gospel with refugees, many are trusting in Jesus. The Gospel is then spreading back to refugees' home countries as they share their new life in Christ.`, pray:`Praise God for how he is saving many refugees in Türkiye and Australia. • Pray for Christians in Türkiye and Australia to love refugees in practical ways and to share the Gospel boldly with them, calling them to repentance and faith. • Pray for the new believers, that they will have courage to meet with other Christians and the boldness and love to share the Gospel with their friends and family members, even though they may be ostracized by their families.`, matches:[{t:"3:00 PM",a:"USA",b:"Australia",g:"D",v:"Lumen Field, Seattle"},{t:"6:00 PM",a:"Scotland",b:"Morocco",g:"C",v:"Gillette Stadium, Boston"},{t:"8:30 PM",a:"Brazil",b:"Haiti",g:"C",v:"Lincoln Financial Field, Philadelphia"},{t:"11:00 PM",a:"Türkiye",b:"Paraguay",g:"D",v:"Levi's Stadium, San Francisco"}] },
  { d:"Jun 20", full:"Saturday, June 20", img:"/images/day-10.png", feat:["Egypt","Saudi Arabia"], dev:`Just as God spoke to Moses through the burning bush in Midian (modern day Saudi Arabia) and displayed his awesome power in Egypt, God is still speaking in the heart of the Middle East today. Though the spiritual landscape of Saudi Arabia has long mirrored its physical deserts, God is fulfilling his promise in Isaiah 43:19 to bring streams to the desert. Even in these two influential Islamic countries, God is drawing the hearts of Muslims to follow Jesus despite the harsh opposition surrounding them. Through them, he is raising up fountains of living water, oases of hope in the desert of Islam.`, pray:`God is revealing himself to Muslims in Egypt and Saudi Arabia in many ways including the internet, conversations with believers, and even dreams and visions. • Pray that Egyptian Christians would be a light to Muslims in their country and throughout the Middle East and that Muslims would embrace the hope of the Gospel. • Pray that God would break through the walls of centuries of Islamic doctrine and culture to reveal the Gospel to Saudis and that they would turn to Christ.`, matches:[{t:"1:00 PM",a:"Netherlands",b:"Sweden",g:"F",v:"Shell Energy Stadium, Houston"},{t:"4:00 PM",a:"Germany",b:"Côte d'Ivoire",g:"E",v:"BMO Field, Toronto"},{t:"8:00 PM",a:"Ecuador",b:"Curaçao",g:"E",v:"Arrowhead Stadium, Kansas City"}] },
  { d:"Jun 21", full:"Sunday, June 21", img:"/images/day-11.png", feat:["France","Algeria"], dev:`In view of historic churches like Notre Dame de Paris, Muslim immigrants from North Africa and Bangladesh sell toy Eiffel Towers to tourists. France has Europe's largest Muslim population (around 10%), largely from its former colonial territories in Africa like Algeria. The Good News is that God is at work! Algeria is home to one of the most recent moves of God, the spread of the Gospel through the Kabyle Berber people. Driven by radio and satellite Gospel media as well as the bold witness of local believers, the Kabyle Berber church has grown from zero to over 100,000 people! Could immigrant believers from North Africa lead to a new spiritual awakening in France as well?`, pray:`France and Algeria have a shared history and language but face unique challenges. • Pray for France's increasingly secular population to see their need for Jesus and for the Muslim minorities there to see the Gospel move among them with the religious freedom allowed in Europe. • Pray for groups in Algeria like the Kabyle Berber to continue to grow in faith and plant churches among their people and their neighbors. Pray against government attempts to curtail religious freedoms.`, matches:[{t:"12:00 AM",a:"Tunisia",b:"Japan",g:"F",v:"Estadio BBVA, Monterrey"},{t:"12:00 PM",a:"Spain",b:"Saudi Arabia",g:"H",v:"Mercedes-Benz Stadium, Atlanta"},{t:"3:00 PM",a:"Belgium",b:"Iran",g:"G",v:"SoFi Stadium, Los Angeles"},{t:"6:00 PM",a:"Uruguay",b:"Cabo Verde",g:"H",v:"Hard Rock Stadium, Miami"},{t:"9:00 PM",a:"New Zealand",b:"Egypt",g:"G",v:"BC Place, Vancouver"}] },
  { d:"Jun 22", full:"Monday, June 22", img:"/images/day-12.png", feat:["Argentina","Colombia"], dev:`The most liked Instagram post of all time comes from an Argentinian. Lionel Messi's post celebrating their country's 2022 World Cup win currently has over 70 million likes, almost double the population of Argentina! Messi's signature goal celebration of pointing to the sky in gratitude to God has been immortalized in soccer history. This can be a reminder to us of the ultimate motivation for missions: we live in reliance and gratitude to our Heavenly Father and long for others to also experience him in their lives! As it says in 1 Corinthians 10:31, "So whether you eat or drink or whatever you do, do it all for the glory of God."`, pray:`Argentina and Colombia have both become missionary senders due to their large Evangelical growth. • Pray for believers in Argentina to adequately train the leaders who will sustain the growth of the Church and shepherd it into a long-term missionary force. • Pray for believers in Colombia who face challenges of violence and poverty within that country. Pray for these Christians to seek to reach smaller people groups within their country with the Good News.`, matches:[{t:"1:00 PM",a:"Argentina",b:"Austria",g:"J",v:"AT&T Stadium, Dallas"},{t:"5:00 PM",a:"France",b:"Iraq",g:"I",v:"Lincoln Financial Field, Philadelphia"},{t:"8:00 PM",a:"Norway",b:"Senegal",g:"I",v:"MetLife Stadium, New York/NJ"},{t:"11:00 PM",a:"Jordan",b:"Algeria",g:"J",v:"Levi's Stadium, San Francisco"}] },
  { d:"Jun 23", full:"Tuesday, June 23", img:"/images/day-13.png", feat:["Germany","Japan"], dev:`In 1517, a German sparked a massive worldwide religious revolution when he nailed a series of 95 statements to his local church doors for community discussion. The Protestant Reformation sparked by Martin Luther would change the next centuries of Christian history and renew a rightful focus on taking the message of Jesus to all people groups in the world. Today, Germany is a mix of decreasing church attendance, increasing secularism, and an influx of immigrants and refugees from places like Turkey and Syria. While Gospel witness is illegal or punished in the homelands of these people, there is currently an open door in Germany to reach them, if the Church is ready and willing.`, pray:`Germany and Japan have very different histories with Christianity but both need prayer. • Pray for believers in Germany to stay strong despite increasing secularism, and for the global Christian community to respond to the opportunity to reach millions of Turks and Arabs who have come as refugees to Germany from the violence in the Middle East. • Pray for fruit for missionaries in Japan. Despite Japan being "open" to missionaries for decades, Japan's language, culture, and wealth have remained significant obstacles for its people to embrace the Gospel.`, matches:[{t:"1:00 PM",a:"Portugal",b:"Uzbekistan",g:"K",v:"Shell Energy Stadium, Houston"},{t:"4:00 PM",a:"England",b:"Ghana",g:"L",v:"Gillette Stadium, Boston"},{t:"7:00 PM",a:"Panama",b:"Croatia",g:"L",v:"BMO Field, Toronto"},{t:"10:00 PM",a:"Colombia",b:"DR Congo",g:"K",v:"Guadalajara Stadium"}] },
  { d:"Jun 24", full:"Wednesday, June 24", img:"/images/day-14.png", feat:["Bosnia & Herzegovina","South Korea"], dev:`"Never Forget, Never Forgive." It's a popular slogan found among graffiti in towns and villages in Bosnia and inscribed upon t-shirts worn at Srebrenica genocide memorial marches held annually in North America. It is an attitude which resides in the hearts of Bosnian Muslims whose loved ones were slaughtered by Serbian Orthodox "Christians" during the 1992-1995 war. A missionary once said trying to reach Bosnians is like "plowing concrete". Yet, believers who seek to sow Gospel seed can have confidence in knowing that the "Gospel is the power of God" (Romans 1:16) which can plow through and take root in any heart, even Bosnians.`, pray:`After WW2, South Korea recovered from the horrors inflicted upon them by embracing the Gospel of Jesus in an amazing move of God. Perhaps the same will be true for the people of Bosnia-Herzegovina. • Pray that Bosnians will know the forgiveness that only comes through Jesus, which then enables them to forgive others as well and that the first Bosnian church in North America would become a reality in 2026. • Pray for South Korea to continue being a local sender of missionaries, especially with the increasing global influence of Korean culture through K-Pop and film/television.`, matches:[{t:"3:00 PM",a:"Switzerland",b:"Canada",g:"B",v:"BC Place, Vancouver"},{t:"3:00 PM",a:"Bosnia & Herzegovina",b:"Qatar",g:"B",v:"Lumen Field, Seattle"},{t:"6:00 PM",a:"Scotland",b:"Brazil",g:"C",v:"Hard Rock Stadium, Miami"},{t:"6:00 PM",a:"Morocco",b:"Haiti",g:"C",v:"Mercedes-Benz Stadium, Atlanta"},{t:"9:00 PM",a:"Czechia",b:"Mexico",g:"A",v:"Estadio Azteca, Mexico City"},{t:"9:00 PM",a:"South Africa",b:"South Korea",g:"A",v:"Estadio BBVA, Monterrey"}] },
  { d:"Jun 25", full:"Thursday, June 25", img:"/images/day-15.png", feat:["Norway","New Zealand"], dev:`Two nations represent the opposite sides of the globe: Norway in the far north, where Christianity replaced Norse mythology 1000 years ago, and New Zealand, where the Good News arrived in 1814. The growth of Christianity among the Māori of New Zealand was directly related to the translation of the Bible into their language. We are reminded of the power of God's Word in the mission task. In Isaiah 55:11, we see God's promise: "So is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it." God's Word is always at work, both in the nations of the world and in your life and mine.`, pray:`Norway and New Zealand need a fresh revival that overflows to the unreached around them. • Pray for Norway's young believers to experience a fresh move of God that fills them with boldness to make disciples of their fellow Norwegians and immigrant groups like Pakistanis. • Pray for New Zealand's current indigenous cultural revival to become a spiritual one, leading many Māori and Pacific peoples to Christ.`, matches:[{t:"4:00 PM",a:"Curaçao",b:"Côte d'Ivoire",g:"E",v:"Lincoln Financial Field, Philadelphia"},{t:"4:00 PM",a:"Ecuador",b:"Germany",g:"E",v:"MetLife Stadium, New York/NJ"},{t:"7:00 PM",a:"Japan",b:"Sweden",g:"F",v:"AT&T Stadium, Dallas"},{t:"7:00 PM",a:"Tunisia",b:"Netherlands",g:"F",v:"Arrowhead Stadium, Kansas City"},{t:"10:00 PM",a:"Türkiye",b:"USA",g:"D",v:"SoFi Stadium, Los Angeles"},{t:"10:00 PM",a:"Paraguay",b:"Australia",g:"D",v:"Levi's Stadium, San Francisco"}] },
  { d:"Jun 26", full:"Friday, June 26", img:"/images/day-16.png", feat:["Netherlands","Sweden"], dev:`We had traveled throughout many small towns and villages in a forgotten part of South Asia. In one location, our team noticed that there was a friendliness and lack of hostility to our Gospel message. We asked what was so unique to this place. "It was the Swedish missionaries. They lived here many years. They built our school. They taught us medicine. They loved our people." Sweden and its free church tradition was a powerful missionary force for decades. Though in recent decline, many Swedish believers continue to share Jesus in their homeland and abroad. The testimony of Christians opening the doors to the Gospel through faithful love serves as a powerful reminder to us of what happens when the message of Christ is shared through both word and action. (1 John 3:18)`, pray:`The Netherlands and Sweden were two countries of great significance to Protestantism. • Pray for the Netherlands as its reputation as a place of drug use and pleasure-seeking makes it a popular but destructive destination for many young people. Pray for faithful Christian witness to make it a hub for the Gospel to be taken home instead. • Pray for the current generation of Swedish believers to take up the cause of the Great Commission and be faithful to sharing the love of Christ in their country and to nations beyond.`, matches:[{t:"3:00 PM",a:"Norway",b:"France",g:"I",v:"Gillette Stadium, Boston"},{t:"3:00 PM",a:"Senegal",b:"Iraq",g:"I",v:"BMO Field, Toronto"},{t:"8:00 PM",a:"Cabo Verde",b:"Saudi Arabia",g:"H",v:"Shell Energy Stadium, Houston"},{t:"8:00 PM",a:"Uruguay",b:"Spain",g:"H",v:"Guadalajara Stadium"},{t:"11:00 PM",a:"Egypt",b:"Iran",g:"G",v:"Lumen Field, Seattle"},{t:"11:00 PM",a:"New Zealand",b:"Belgium",g:"G",v:"BC Place, Vancouver"}] },
  { d:"Jun 27", full:"Saturday, June 27", img:"/images/day-17.png", feat:[], dev:`In Matthew 28:19, Jesus gives a final command to his first disciples: "Therefore go and make disciples of all nations." We have highlighted this World Cup's 48 countries throughout the group stage. But this is just the beginning. While the United Nations recognizes 195 countries of the world, these countries are not equivalent to the "nations" mentioned in Scripture. Sometimes we use the phrase "people group" to describe this, a group defined by a shared language and culture. Joshua Project, a leading Christian research organization, estimates there are around 16,000 people groups in the world! Around 7,000 of these are still considered unreached with little Christian presence among them. Let's pray today that we might make disciples of all people groups as Jesus commanded!`, pray:`Today as we close the group stage, we have now focused on 32 of the 48 countries in this year's World Cup. But there are more! Go visit some of the nation profiles to find a country you haven't prayed for yet. • Pray for any believers there to be filled with God's love today. • Pray for those who don't know Christ to feel their need for him today.`, matches:[{t:"5:00 PM",a:"Panama",b:"England",g:"L",v:"MetLife Stadium, New York/NJ"},{t:"5:00 PM",a:"Croatia",b:"Ghana",g:"L",v:"Lincoln Financial Field, Philadelphia"},{t:"7:30 PM",a:"Colombia",b:"Portugal",g:"K",v:"Hard Rock Stadium, Miami"},{t:"7:30 PM",a:"DR Congo",b:"Uzbekistan",g:"K",v:"Mercedes-Benz Stadium, Atlanta"},{t:"10:00 PM",a:"Algeria",b:"Austria",g:"J",v:"Arrowhead Stadium, Kansas City"},{t:"10:00 PM",a:"Jordan",b:"Argentina",g:"J",v:"AT&T Stadium, Dallas"}] },
  { d:"Jun 29", full:"Monday, June 29", img:"/images/day-18.png", feat:[], dev:`In Revelation 3:8, the Lord Jesus tells the Church "See, I have placed before you an open door that no one can shut." Today, our world has been flattened. Before the Gospel's journey to all nations looked like lines across the globe representing boat or plane travel to far-off lands. Now, people from many nations surround us on a daily basis in our cities and towns here in North America. The Church can choose to see this as the opportunity to fulfill the Great Commission by crossing the street rather than only crossing an ocean. Our neighbors from Muslim, Hindu, Sikh, or Buddhist backgrounds might be an open door to their people groups and homelands. Will we meet them with the love and hope of Jesus?`, pray:`This week's focus is the nations next door. • Pray for someone you know by name who is from another part of the world. Pray for God's working in their life and for them to know his love and peace. • Pray for God to give you eyes to see the people around you as he does, people for whom Christ died, who are important to him and his story of redemption.`, matches:[] },
  { d:"Jul 6", full:"Monday, July 6", img:"/images/day-19.png", feat:[], dev:`Revelation 7:9 "After this I looked, and there before me was a great multitude that no one could count, from every nation, tribe, people and language, standing before the throne and before the Lamb." The apostle John's vision looks a lot like the stadium crowds of the World Cup! People from nations all over the globe have represented and cheered their countries with passion and song over the last few weeks. One day, we are promised that representatives of all people groups will stand before God's throne and their lips will be filled with a song to the Lamb, Jesus, who gave his life as a worthy sacrifice for us all. Let our hearts even now join them in praise!`, pray:`This week's focus is all nations worshipping around the throne of God! • Think of a country that stands out to you from this last month. Pray that God would redeem someone from all people groups in that country. • Find a favorite worship song or hymn to listen to or sing with. As you do so, imagine yourself surrounded by believers from all nations!`, matches:[] },
  { d:"Jul 13", full:"Monday, July 13", img:"/images/day-20.png", feat:[], dev:`The World Cup final is this week. At the end, one team will lift the trophy above their head in victory and their homeland will erupt in celebration. In Ephesians 2:4-10, Paul says that one day God himself will also display a trophy...us. "It is by grace you have been saved...in order that in the coming ages he might show the incomparable riches of his grace, expressed in his kindness to us in Christ Jesus." One day, God will take the redeemed of all nations and present us as the trophy of his amazing and boundless love and grace. Let us embrace our identity as his people and play our role in leading others to experience his grace for themselves!`, pray:`This week, it's time to think about your role in reaching the nations. • Pray for God to show you what role he would have you play in the fulfillment of the Great Commission. • Pray for courage from the Holy Spirit to take the steps necessary to obey what God is leading you to do.`, matches:[] },
];

const VERSE_LOOKUP = {
  "Acts 17:26-27": "From one man he made all the nations, that they should inhabit the whole earth; and he marked out their appointed times in history and the boundaries of their lands. God did this so that they would seek him and perhaps reach out for him and find him, though he is not far from any one of us. (NIV)",
  "2 Corinthians 5:18-20": "All this is from God, who reconciled us to himself through Christ and gave us the ministry of reconciliation: that God was reconciling the world to himself in Christ, not counting people's sins against them. And he has committed to us the message of reconciliation. We are therefore Christ's ambassadors, as though God were making his appeal through us. We implore you on Christ's behalf: Be reconciled to God. (NIV)",
  "Romans 1:16-17": "For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile. For in the gospel the righteousness of God is revealed—a righteousness that is by faith from first to last, just as it is written: \"The righteous will live by faith.\" (NIV)",
  "Romans 1:16": "For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile. For in the gospel the righteousness of God is revealed—a righteousness that is by faith from first to last, just as it is written: \"The righteous will live by faith.\" (NIV)",
  "Matthew 13:31-32": "He told them another parable: \"The kingdom of heaven is like a mustard seed, which a man took and planted in his field. Though it is the smallest of all seeds, yet when it grows, it is the largest of garden plants and becomes a tree, so that the birds come and perch in its branches.\" (NIV)",
  "1 Peter 2:9-10": "But you are a chosen people, a royal priesthood, a holy nation, God's special possession, that you may declare the praises of him who called you out of darkness into his wonderful light. Once you were not a people, but now you are the people of God; once you had not received mercy, but now you have received mercy. (NIV)",
  "Acts 2:9-11": "Parthians, Medes and Elamites; residents of Mesopotamia, Judea and Cappadocia, Pontus and Asia, Phrygia and Pamphylia, Egypt and the parts of Libya near Cyrene; visitors from Rome (both Jews and converts to Judaism); Cretans and Arabs—we hear them declaring the wonders of God in our own tongues! (NIV)",
  "Isaiah 43:19": "See, I am doing a new thing! Now it springs up; do you not perceive it? I am making a way in the wilderness and streams in the wasteland. (NIV)",
  "Isaiah 55:10-11": "As the rain and the snow come down from heaven, and do not return to it without watering the earth and making it bud and flourish, so that it yields seed for the sower and bread for the eater, so is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it. (NIV)",
  "1 Corinthians 10:31": "So whether you eat or drink or whatever you do, do it all for the glory of God. (NIV)",
  "1 John 3:18": "Dear children, let us not love with words or speech but with actions and in truth. (NIV)",
  "Matthew 28:18-20": "Then Jesus came to them and said, \"All authority in heaven and on earth has been given to me. Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you. And surely I am with you always, to the very end of the age.\" (NIV)",
  "Revelation 3:8": "I know your deeds. See, I have placed before you an open door that no one can shut. I know that you have little strength, yet you have kept my word and have not denied my name. (NIV)",
  "Revelation 7:9-10": "After this I looked, and there before me was a great multitude that no one could count, from every nation, tribe, people and language, standing before the throne and before the Lamb. They were wearing white robes and were holding palm branches in their hands. And they cried out in a loud voice: \"Salvation belongs to our God, who sits on the throne, and to the Lamb!\" (NIV)",
  "Ephesians 2:4-10": "But because of his great love for us, God, who is rich in mercy, made us alive with Christ even when we were dead in transgressions—it is by grace you have been saved. And God raised us up with Christ and seated us with him in the heavenly realms in Christ Jesus, in order that in the coming ages he might show the incomparable riches of his grace, expressed in his kindness to us in Christ Jesus. For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast. For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do. (NIV)",
};

const REGIONS = ["All","Americas","Europe","Africa","Asia","Oceania"];

/* ─── SCRIPTURE LINK ─── */
function ScriptureLink({ reference }) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const verseText = VERSE_LOOKUP[reference];

  return (
    <span style={{ position: "relative", display: "inline" }}>
      <span
        onClick={() => setOpen(o => !o)}
        style={{
          color: "#00BAF8",
          borderBottom: "1.5px dashed #00BAF8",
          cursor: "pointer",
          textDecoration: "none",
          display: "inline",
        }}
      >
        {reference}
      </span>
      {open && (
        <span
          ref={tooltipRef}
          style={{
            position: "fixed",
            bottom: 80,
            left: 16,
            right: 16,
            zIndex: 9999,
            background: "#00476B",
            border: "1.5px solid #00BAF8",
            borderRadius: 14,
            padding: 16,
            display: "block",
            boxSizing: "border-box",
            transition: "transform 0.2s ease, opacity 0.2s ease",
          }}
        >
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, color: "#00BAF8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              {reference}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              style={{ color: "#00BAF8", cursor: "pointer", fontSize: 14, lineHeight: 1, marginLeft: 8, flexShrink: 0 }}
            >
              ✕
            </span>
          </span>
          {verseText ? (
            <span style={{ fontFamily: "Libre Baskerville, serif", fontSize: 17, fontStyle: "normal", color: "#ffffff", lineHeight: 1.7, display: "block" }}>
              {verseText}
            </span>
          ) : (
            <a
              href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=NIV`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#00BAF8", fontFamily: "Montserrat, sans-serif", fontSize: 13 }}
            >
              Read {reference} →
            </a>
          )}
        </span>
      )}
    </span>
  );
}

const SCRIPTURE_RE = /\b((?:1|2|3)\s)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s(\d+:\d+(?:[–-]\d+)?(?:,\s*\d+)*)\b/g;

function renderDevotionalText(text) {
  const elements = [];
  let lastIndex = 0;
  let match;
  const re = new RegExp(SCRIPTURE_RE.source, "g");

  while ((match = re.exec(text)) !== null) {
    const fullMatch = match[0];
    const start = match.index;

    let prefix = "";
    let ref = fullMatch;
    if (ref.startsWith("Read ")) { prefix = "Read "; ref = ref.slice(5); }
    else if (ref.startsWith("In ")) { prefix = "In "; ref = ref.slice(3); }

    if (start > lastIndex) {
      elements.push(<span key={lastIndex}>{text.slice(lastIndex, start)}</span>);
    }
    if (prefix) {
      elements.push(<span key={`${start}-pre`}>{prefix}</span>);
    }
    if (VERSE_LOOKUP[ref]) {
      elements.push(<ScriptureLink key={start} reference={ref} />);
    } else {
      elements.push(<span key={start}>{ref}</span>);
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }
  return elements;
}

/* ─── NATION INTEGRITY NUDGE ─── */
function NationIntegrityNudge({ nation, onConfirm, onCancel }) {
  if (!nation) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,28,46,0.72)",
        zIndex: 3100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#00476B",
          border: "1.5px solid #00BAF8",
          borderRadius: 20,
          padding: "28px 24px 22px",
          width: "100%",
          maxWidth: 320,
          textAlign: "center",
        }}
      >
        <div style={{
          width: 64, height: 64,
          background: "#E06520",
          border: "3px solid #FF8844",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          margin: "0 auto 16px",
        }}>
          ⚽
        </div>
        <div style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800, fontSize: 20,
          color: "#ffffff",
          marginBottom: 10,
        }}>
          Still praying?
        </div>
        <div style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: 15,
          color: "#8ADBFF",
          lineHeight: 1.5,
          marginBottom: 22,
        }}>
          Each tap represents a prayer. Take a moment with {nation.n} before moving on.
        </div>
        <button
          onClick={onConfirm}
          style={{
            display: "block", width: "100%",
            background: "#E06520", border: "none",
            borderRadius: 12, padding: "14px 0",
            fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16,
            color: "#ffffff", cursor: "pointer", marginBottom: 10,
          }}
        >
          I prayed 🙏
        </button>
        <button
          onClick={onCancel}
          style={{
            display: "block", width: "100%",
            background: "transparent",
            border: "1.5px solid #00BAF8",
            borderRadius: 12, padding: "14px 0",
            fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16,
            color: "#ffffff", cursor: "pointer",
          }}
        >
          Let me slow down
        </button>
      </div>
    </div>
  );
}

/* ─── HOME SCREEN BANNER ─── */
function HomeScreenBanner({ onDismiss }) {
  const [platform, setPlatform] = useState("ios");
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) setPlatform("android");
    else setPlatform("ios");
  }, []);
  return (
    <>
      {/* Compact banner strip */}
      <div style={{
        background: C.orange,
        color: "#fff",
        padding: "11px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>📲</span>
        <button onClick={() => setShowModal(true)} style={{
          flex: 1, background: "none", border: "none", color: "#fff",
          fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14,
          cursor: "pointer", textAlign: "left", padding: 0,
        }}>
          Add to Your Home Screen
          <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.85, marginLeft: 6 }}>— tap to learn how</span>
        </button>
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "#fff",
          fontSize: 20, cursor: "pointer", flexShrink: 0,
          padding: "0 2px", lineHeight: 1, opacity: 0.85,
        }} aria-label="Dismiss">✕</button>
      </div>

      {/* Instructions modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(27,45,58,0.7)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.white, borderRadius: 20, padding: 28, maxWidth: 380, width: "100%",
          }}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>📲</div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 20, color: C.indigo, textAlign: "center", marginBottom: 16 }}>
              Add to Home Screen
            </div>
            {platform === "ios" ? (
              <div>
                {[
                  { step: "1", text: 'Tap the Share button ⬆️ at the bottom of Safari' },
                  { step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
                  { step: "3", text: 'Tap "Add" — done! Open it like any app.' },
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div style={{ background: C.orange, color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{s.step}</div>
                    <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 16, color: C.text, lineHeight: 1.5, paddingTop: 4 }}>{s.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {[
                  { step: "1", text: 'Tap the three dots ⋮ in the top-right corner of Chrome' },
                  { step: "2", text: 'Tap "Add to Home Screen"' },
                  { step: "3", text: 'Tap "Add" — done! Open it like any app.' },
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div style={{ background: C.orange, color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{s.step}</div>
                    <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 16, color: C.text, lineHeight: 1.5, paddingTop: 4 }}>{s.text}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowModal(false)} style={{
              display: "block", width: "100%", marginTop: 8,
              background: C.indigo, border: "none", borderRadius: 12,
              padding: 16, fontFamily: "Montserrat, sans-serif", fontWeight: 700,
              fontSize: 16, color: "#fff", cursor: "pointer",
            }}>Got it!</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── NATION MODAL ─── */
function NationModal({ nation, onClose, gameState, updateGameState, onPray }) {
  const [dragStartY, setDragStartY] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (!nation) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [nation]);

  if (!nation) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%",
        maxWidth: "520px",
        maxHeight: "80vh",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        background: "white",
        overflow: "hidden",
        transform: isDismissing ? "translateY(110vh)" : `translateY(${dragOffsetY}px)`,
        transition: (isDismissing || dragOffsetY === 0) ? "transform 0.45s ease" : "none",
      }}>
        {/* Drag handle — above header, touch target for dismiss */}
        <div
          onTouchStart={(e) => {
            e.stopPropagation();
            setDragStartY(e.touches[0].clientY);
            setDragOffsetY(0);
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            if (dragStartY !== null) {
              const delta = e.touches[0].clientY - dragStartY;
              if (delta > 0) setDragOffsetY(delta);
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (dragOffsetY > 80) {
              setIsDismissing(true);
              setTimeout(() => {
                onClose();
                setIsDismissing(false);
                setDragOffsetY(0);
              }, 450);
            } else {
              setDragOffsetY(0);
            }
            setDragStartY(null);
          }}
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 4px",
            background: "white",
            borderRadius: "20px 20px 0 0",
            touchAction: "none",
            cursor: "grab",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#ccc" }} />
        </div>

        {/* Header — outside scroll container, always visible */}
        <div
          onTouchStart={(e) => {
            e.stopPropagation();
            setDragStartY(e.touches[0].clientY);
            setDragOffsetY(0);
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            if (dragStartY !== null) {
              const delta = e.touches[0].clientY - dragStartY;
              if (delta > 0) setDragOffsetY(delta);
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (dragOffsetY > 80) {
              setIsDismissing(true);
              setTimeout(() => {
                onClose();
                setIsDismissing(false);
                setDragOffsetY(0);
              }, 450);
            } else {
              setDragOffsetY(0);
            }
            setDragStartY(null);
          }}
          style={{
            flexShrink: 0,
            background: "#00476B",
            padding: "16px",
            borderRadius: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            touchAction: "none",
          }}
        >
          <FlagImg iso={nation.iso} f={nation.f} size={52} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", lineHeight: 1.2 }}>
              {nation.n}
            </div>
            {(() => {
              const nationMatches = RAW_SCHEDULE.filter(d =>
                d.matches && d.matches.some(m => m.a === nation.n || m.b === nation.n)
              );
              const group = nationMatches.length > 0 ? nationMatches[0].matches.find(m => m.a === nation.n || m.b === nation.n)?.g : null;
              const dates = nationMatches.map(d => d.d);
              return (
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
                  {group ? `Group ${group}` : nation.r}
                  {dates.length > 0 && (
                    <span style={{ opacity: 0.8 }}> · {dates.join(" · ")}</span>
                  )}
                </div>
              );
            })()}
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, color: "#fff", fontSize: 18, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div key={nation.n} style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px", paddingBottom: 24 }}>
          {nation.contenders ? (
            <div style={{ background: C.brightGray, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.indigo, marginBottom: 6 }}>PLAYOFF CONTENDERS</div>
              <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, color: C.text }}>{nation.contenders}</div>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 8 }}>Results expected April 1, 2026</div>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Capital", value: nation.cap },
                  { label: "Population", value: nation.pop },
                  { label: "Religion", value: nation.rel },
                  { label: "Languages", value: nation.lang },
                ].map(item => (
                  <div key={item.label} style={{ background: C.brightGray, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.text, fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Unreached Groups */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 12, color: C.blue, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Top Unreached People Groups</div>
                {nation.ug.map((g, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, flexShrink: 0 }} />
                    <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, color: C.text }}>{g}</div>
                  </div>
                ))}
                {nation.ujp && (
                  <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, fontStyle: "italic", color: C.blue, marginTop: 8, lineHeight: 1.5 }}>
                    Out of {nation.ujp} people groups in {nation.n}, {nation.ujp_unreached} are currently listed as unreached by{" "}
                    <a href="https://joshuaproject.net" target="_blank" rel="noopener noreferrer" style={{ color: C.orange, textDecoration: "underline" }}>Joshua Project</a>.
                  </div>
                )}
              </div>

              {/* Mission Insight */}
              <div style={{ background: `${C.indigo}10`, borderLeft: `4px solid ${C.indigo}`, borderRadius: "0 10px 10px 0", padding: 14, marginBottom: 16 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11, color: C.indigo, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Mission Insight</div>
                <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, lineHeight: 1.6, color: C.text, fontStyle: "italic" }}>{nation.m}</div>
              </div>

              {(nation.diasporaLink || nation.diaspora) && (
                <div style={{ background: "#EEF3FA", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11, color: C.indigo, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Diaspora Presence</div>
                  <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, lineHeight: 1.6, color: C.text }}>
                    {nation.diasporaLink ? (
                      <a href={nation.diasporaLink.url} target="_blank" rel="noreferrer" style={{ color: "#E06520", fontWeight: 600 }}>{nation.diasporaLink.text}</a>
                    ) : (() => {
                      const lm = nation.diaspora.match(/\[([^\]]+)\]\(([^)]+)\)/);
                      if (!lm) return nation.diaspora;
                      return <>{nation.diaspora.slice(0, lm.index)}<a href={lm[2]} target="_blank" rel="noreferrer" style={{ color: C.blue, fontWeight: 600 }}>{lm[1]}</a></>;
                    })()}
                  </div>
                </div>
              )}

              {/* Links */}
              <div style={{ display: "flex", gap: 10 }}>
                <a href={`https://joshuaproject.net/countries/${nation.jp || nation.n.replace(/\s/g,"-")}`} target="_blank" rel="noreferrer" style={{
                  flex: 1, background: C.indigo, color: "#fff",
                  borderRadius: 10, padding: "12px 8px", textAlign: "center",
                  fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13,
                  textDecoration: "none", display: "block",
                }}>Joshua Project</a>
                <a href={`https://operationworld.org/locations/`} target="_blank" rel="noreferrer" style={{
                  flex: 1, background: C.orange, color: "#fff",
                  borderRadius: 10, padding: "12px 8px", textAlign: "center",
                  fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13,
                  textDecoration: "none", display: "block",
                }}>Operation World</a>
              </div>

              {/* Prayer */}
              {gameState && (gameState.prayedNations || []).includes(nation.n) ? (
                <div style={{ marginTop: 12, textAlign: "center", fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.blue, fontWeight: 600 }}>
                  ✓ You prayed for {nation.n}
                </div>
              ) : (
                <button
                  onClick={() => { triggerHaptic('medium'); onPray ? onPray(nation) : updateGameState({ prayedNations: [...(gameState?.prayedNations || []), nation.n] }); }}
                  style={{
                    display: "block", width: "100%", marginTop: 12,
                    background: C.orange, color: C.white, border: "none",
                    borderRadius: 12, padding: 16,
                    fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  I prayed for this nation ✓
                </button>
              )}
            </>
          )}
        </div>
        <div style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 40, paddingTop: 8, backgroundColor: "#fff" }}>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
            display: "block", width: "100%",
            background: C.brightGray, border: "none",
            borderRadius: 12, paddingTop: 18, paddingBottom: 18, paddingLeft: 16, paddingRight: 16,
            minHeight: 44, minWidth: 44,
            fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 17,
            color: C.indigo, cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── DAILY DIGEST TAB ─── */
function DailyDigest({ gameState, updateGameState, initialDay, onBack, onPray, userProfile, onSignIn }) {
  const today = new Date();
  const startOfTournament = new Date('2026-06-11');
  let defaultDay = 0;
  if (today >= startOfTournament) {
    const diff = Math.floor((today - startOfTournament) / 86400000);
    defaultDay = Math.min(diff, RAW_SCHEDULE.length - 1);
  }
  const [dayIdx, setDayIdx] = useState(initialDay ?? defaultDay);
  const [selectedNation, setSelectedNation] = useState(null);
  const day = RAW_SCHEDULE[dayIdx];
  const matchesToShow = day.matches;
  const isLastDay = dayIdx === RAW_SCHEDULE.length - 1;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isFutureDay = dayIdx > defaultDay;
  const nextLocked = !isLastDay && gameState.journeyMode && scheduleToISO(RAW_SCHEDULE[dayIdx + 1].d) > todayStr;
  const unlockDate = !isLastDay
    ? new Date(scheduleToISO(RAW_SCHEDULE[dayIdx + 1].d) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div style={{ paddingBottom: 100 }}>
      <NationModal nation={selectedNation} onClose={() => setSelectedNation(null)} gameState={gameState} updateGameState={updateGameState} onPray={onPray} />

      {onBack && (
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          width: "100%", minHeight: 48, padding: "16px 16px",
          fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16,
          color: C.indigo,
        }}>← All Days</button>
      )}

      {/* Date heading */}
      <div style={{ background: C.indigo, padding: "14px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { if (dayIdx > 0) { setDayIdx(dayIdx - 1); } }} disabled={dayIdx === 0} style={{
          background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
          borderRadius: 10, padding: "10px 18px", fontSize: 18, cursor: "pointer",
          opacity: dayIdx === 0 ? 0.3 : 1, fontFamily: "Montserrat, sans-serif", fontWeight: 700,
        }}>← Prev</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17, color: "#fff" }}>{day.full}</div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Day {dayIdx + 1} of 17</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
          {!isLastDay ? (
            <>
              <button onClick={() => setDayIdx(dayIdx + 1)} style={{
                background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                borderRadius: 10, padding: "10px 18px", fontSize: 18, cursor: "pointer",
                fontFamily: "Montserrat, sans-serif", fontWeight: 700,
                opacity: nextLocked ? 0.4 : 1,
                pointerEvents: nextLocked ? 'none' : 'auto',
              }}>Next →</button>
              {nextLocked && (
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  Unlocks {unlockDate}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: 80 }} />
          )}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Devotional */}
        <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${C.blue}30`, boxShadow: "0 4px 20px rgba(27,69,106,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.indigo }}>Today's Devotional</div>
            {userProfile?.uid && (
              <button
                onClick={async () => {
                  const text = 'I just prayed for the nations today using Pray for the Cup 🌍⚽ Join me at prayforthecup.com';
                  try {
                    if (navigator.share) { await navigator.share({ text }); }
                    else { await navigator.clipboard.writeText(text); }
                  } catch {}
                }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: C.indigo, display: 'flex', alignItems: 'center' }}
                title="Share"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            )}
          </div>
          {day.img && (
            <img
              src={day.img}
              alt=""
              style={{
                width: "100%",
                borderRadius: 12,
                maxHeight: 200,
                objectFit: "cover",
                marginBottom: 14,
                display: "block",
              }}
            />
          )}
          <p style={{ fontFamily: "Libre Baskerville, serif", fontSize: 17, lineHeight: 1.75, color: C.text, position: "relative", margin: 0 }}>
            {renderDevotionalText(day.dev)}
          </p>
        </div>

        {/* Prayer */}
        <div style={{ background: `${C.blueJeans}20`, borderRadius: 16, padding: 18, marginBottom: 14, border: `2px solid ${C.blueJeans}`, boxShadow: "0 4px 20px rgba(27,69,106,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🙏</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.blueJeans }}>Prayer Focus</div>
          </div>
          {(() => {
            const parts = (day.pray || "").split(/•/).map(s => s.trim()).filter(Boolean);
            if (parts.length <= 1) {
              return <div style={{ fontFamily:"Libre Baskerville", fontSize:15, lineHeight:1.7, color:C.indigo }}>{day.pray}</div>;
            }
            const [intro, ...bullets] = parts;
            return (
              <div>
                <div style={{ fontFamily:"Libre Baskerville", fontSize:15, lineHeight:1.7, color:C.indigo, marginBottom:10 }}>{intro}</div>
                {bullets.map((b, i) => (
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ color:C.orange, fontWeight:800, fontSize:18, lineHeight:1.4, flexShrink:0 }}>•</div>
                    <div style={{ fontFamily:"Libre Baskerville", fontSize:15, lineHeight:1.7, color:C.indigo }}>{b}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Matches */}
        <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${C.blue}30`, boxShadow: "0 4px 20px rgba(27,69,106,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>⚽</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.indigo }}>Today's Matches</div>
          </div>
          {matchesToShow.map((m, i) => {
            const teamA = RAW_COUNTRIES.find(c => c.n === m.a);
            const teamB = RAW_COUNTRIES.find(c => c.n === m.b);
            return (
              <div key={i} style={{ marginBottom: i < matchesToShow.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.orange }}>{m.t} ET</div>
                  <div style={{ background: C.brightGray, borderRadius: 6, padding: "3px 8px", fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: C.blue }}>Group {m.g}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <button onClick={() => teamA && setSelectedNation(teamA)} style={{
                    flex: 1, background: C.brightGray, border: "none", borderRadius: "10px 0 0 10px",
                    padding: "12px 10px", cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 26 }}>
                      {teamA ? <FlagImg iso={teamA.iso} f={teamA.f} size={26} /> : "🏆"}
                    </div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.indigo, marginTop: 4 }}>{m.a}</div>
                  </button>
                  <div style={{ background: C.orange, color: "#fff", fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 14, padding: "16px 10px", flexShrink: 0 }}>VS</div>
                  <button onClick={() => teamB && setSelectedNation(teamB)} style={{
                    flex: 1, background: C.brightGray, border: "none", borderRadius: "0 10px 10px 0",
                    padding: "12px 10px", cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 26 }}>
                      {teamB ? <FlagImg iso={teamB.iso} f={teamB.f} size={26} /> : "🏆"}
                    </div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.indigo, marginTop: 4 }}>{m.b}</div>
                  </button>
                </div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 5, textAlign: "center" }}>📍 {m.v}</div>
              </div>
            );
          })}
        </div>

        {/* Featured Nations */}
        {day.feat && day.feat[0] !== "All Nations" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 15, color: C.indigo, marginBottom: 10 }}>
              ⭐ Featured Nations Today
            </div>
            {day.feat.map(fn => {
              const nation = RAW_COUNTRIES.find(c => c.n === fn);
              if (!nation) return null;
              return (
                <button key={fn} onClick={() => setSelectedNation(nation)} style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%",
                  background: C.white, border: `2px solid ${C.orange}`,
                  borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                  textAlign: "left", marginBottom: 10, boxShadow: "0 4px 20px rgba(27,69,106,0.12)",
                }}>
                  <FlagImg iso={nation.iso} f={nation.f} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17, color: C.indigo }}>{nation.n}</div>
                    <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 14, color: C.text, marginTop: 3, lineHeight: 1.4 }}>{nation.m.substring(0, 70)}…</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Calendar — Jump to Any Day */}
        <div style={{ background: C.white, borderRadius: 16, padding: "16px 0 16px", marginBottom: 14, border: `1px solid ${C.blue}30`, boxShadow: "0 4px 20px rgba(27,69,106,0.12)" }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 14, color: C.indigo, padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span> Jump to Any Day
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <div style={{ display: "flex", gap: 8, padding: "0 16px", width: "max-content" }}>
              {RAW_SCHEDULE.map((s, i) => {
                const isFutureDate = scheduleToISO(s.d) > todayStr;
                return (
                  <button key={i} onClick={() => { if (!isFutureDate) { setDayIdx(i); window.scrollTo(0,0); } }} disabled={isFutureDate} style={{
                    background: i === dayIdx ? C.indigo : C.brightGray,
                    color: i === dayIdx ? "#fff" : isFutureDate ? "#bbb" : C.indigo,
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: isFutureDate ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    minWidth: 64,
                    opacity: isFutureDate ? 0.4 : 1,
                    pointerEvents: isFutureDate ? 'none' : 'auto',
                  }}>{s.d}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Check-in */}
        {(() => {
          if (!userProfile?.uid) {
            return (
              <div style={{ marginBottom: 14 }}>
                <button
                  onClick={onSignIn}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: `2px solid ${C.indigo}`,
                    borderRadius: 14,
                    padding: 18,
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    color: C.indigo,
                  }}
                >
                  Sign in to track your prayer journey →
                </button>
              </div>
            );
          }

          if (!gameState.journeyMode) return null;
          if (isFutureDay) return null;

          const todayISO = new Date().toISOString().split('T')[0];
          const alreadyCheckedIn = gameState.checkedInDays.includes(todayISO);

          if (alreadyCheckedIn) {
            return (
              <div style={{ background: "#e8f5e9", borderRadius: 16, padding: 18, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }}>✅</span>
                <div>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "#2e7d32" }}>Prayed ✓</div>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#388e3c", marginTop: 2 }}>{todayISO}</div>
                </div>
              </div>
            );
          }

          return (
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={async () => {
                  triggerHaptic('light');
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const yesterdayISO = yesterday.toISOString().split('T')[0];
                  let newStreak;
                  if (gameState.lastCheckIn === yesterdayISO) {
                    newStreak = gameState.streakCount + 1;
                  } else if (gameState.lastCheckIn === todayISO) {
                    newStreak = gameState.streakCount;
                  } else {
                    newStreak = 1;
                  }
                  updateGameState({
                    checkedInDays: [...gameState.checkedInDays, todayISO],
                    completedDevotionals: [...gameState.completedDevotionals, todayISO],
                    streakCount: newStreak,
                    lastCheckIn: todayISO,
                  });
                }}
                style={{
                  width: "100%",
                  background: C.orange,
                  color: C.white,
                  border: "none",
                  borderRadius: 14,
                  padding: 18,
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 700,
                  fontSize: 17,
                  cursor: "pointer",
                  display: "block",
                }}
              >
                I prayed today ✓
              </button>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#888", textAlign: "center", marginTop: 8 }}>
                Marks today's prayer focus and devotional as complete
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

/* ─── DIGEST HOME (carousel — Tab 1 primary view) ─── */
function DigestHome({ gameState, onCardTap, onOpenSettings }) {
  const carouselRef = useRef(null);
  const skipScrollRef = useRef(false);

  const today = new Date();
  const startOfTournament = new Date("2026-06-11");
  let todayIdx = 0;
  if (today >= startOfTournament) {
    const diff = Math.floor((today - startOfTournament) / 86400000);
    todayIdx = Math.min(diff, RAW_SCHEDULE.length - 1);
  }

  const [activeCard, setActiveCard] = useState(todayIdx);
  const score = calcScore(gameState);
  const earned = gameState.goalsAchieved || [];

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    function centerToday() {
      skipScrollRef.current = true;
      requestAnimationFrame(() => {
        const cards = Array.from(container.children);
        const card = cards[todayIdx];
        if (!card) { skipScrollRef.current = false; return; }

        // Apply dynamic padding so first/last cards have enough scroll runway to center
        const containerWidth = container.offsetWidth;
        const firstCard = cards[0];
        const lastCard = cards[cards.length - 1];
        if (firstCard && lastCard) {
          const leftPad = Math.max(16, Math.round((containerWidth - firstCard.offsetWidth) / 2));
          const rightPad = Math.max(16, Math.round((containerWidth - lastCard.offsetWidth) / 2));
          container.style.paddingLeft = leftPad + 'px';
          container.style.paddingRight = rightPad + 'px';
        }

        // Re-measure after padding settles, then set scroll position
        requestAnimationFrame(() => {
          const containerRect = container.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const cardFromScrollOrigin = cardRect.left - containerRect.left + container.scrollLeft;
          const scrollLeft = cardFromScrollOrigin - (container.offsetWidth - card.offsetWidth) / 2;
          container.scrollLeft = Math.max(0, scrollLeft);
          requestAnimationFrame(() => { skipScrollRef.current = false; });
        });
      });
    }

    setActiveCard(todayIdx);
    centerToday();
    window.addEventListener('resize', centerToday);
    return () => window.removeEventListener('resize', centerToday);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIdx, gameState.journeyMode]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <style>{JOURNEY_CSS}</style>

      {gameState.journeyMode && (
        <div className="jny-stats">
          <div className="jny-stat-block">
            <div className="jny-stat-num jny-clr-orange">🔥 {gameState.streakCount}</div>
            <div className="jny-stat-label">Day Streak</div>
          </div>
          <div className="jny-stat-block">
            <div className="jny-stat-num jny-clr-jeans">{gameState.prayedNations.length}</div>
            <div className="jny-stat-label">Nations</div>
          </div>
          <div className="jny-stat-block">
            <div className="jny-stat-num jny-clr-blue">{gameState.completedDevotionals.length}</div>
            <div className="jny-stat-label">Devotionals</div>
          </div>
        </div>
      )}

      {gameState.journeyMode && (
        <button className="jny-mission-btn" onClick={() => onCardTap(todayIdx)}>
          <span>⚡ Today's Mission — Day {todayIdx + 1}</span>
          <span style={{ fontSize: 16 }}>›</span>
        </button>
      )}

      <div className="jny-section-label">
        Your Prayer Journey
        <div className="jny-section-sub">
          {gameState.journeyMode
            ? "Today's devotional is centered · past days completed · future days locked"
            : "Tap any day to read its devotional"}
        </div>
      </div>

      <div
        className="carousel-scroll-wrap"
        ref={carouselRef}
        onScroll={(e) => {
          if (skipScrollRef.current) return;
          const el = e.currentTarget;
          const containerRect = el.getBoundingClientRect();
          const viewCenter = containerRect.left + el.offsetWidth / 2;
          let closest = 0, minDist = Infinity;
          Array.from(el.children).forEach((child, i) => {
            const childRect = child.getBoundingClientRect();
            const dist = Math.abs(childRect.left + childRect.width / 2 - viewCenter);
            if (dist < minDist) { minDist = dist; closest = i; }
          });
          setActiveCard(closest);
        }}
      >
        {RAW_SCHEDULE.map((d, i) => {
          const isToday  = i === todayIdx;
          const isPast   = i < todayIdx;
          const isFuture = i > todayIdx;
          const locked    = isFuture && gameState.journeyMode;
          const isActive  = i === activeCard && !isFuture;
          const cardClass = isFuture ? "future" : (isActive ? "today" : "past");
          const cardStyle = isFuture
            ? { opacity: 0.4, pointerEvents: 'none' }
            : isActive ? {} : { opacity: 0.5, transform: 'scale(0.92)' };
          const featNations = (d.feat || [])
            .filter(name => name !== "All Nations")
            .map(name => RAW_COUNTRIES.find(c => c.n === name))
            .filter(Boolean);
          const flag = featNations.length > 0 ? featNations[0].f : "🌍";
          const nationName = featNations.length > 0
            ? featNations.map(n => n.n).join(" · ")
            : (d.feat && d.feat[0] === "All Nations" ? "All Nations" : "The Nations");
          const theme = d.dev.length > 44 ? d.dev.substring(0, 44) + "…" : d.dev;
          const isPrayed = isPast && (gameState.checkedInDays || []).includes(scheduleToISO(d.d));

          const innerStyle = d.img ? {
            background: locked
              ? `linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 100%), url('${d.img}') center / cover no-repeat`
              : `linear-gradient(to top, rgba(10,20,40,0.88) 0%, rgba(10,20,40,0.35) 65%, rgba(10,20,40,0.15) 100%), url('${d.img}') center / cover no-repeat`,
            overflow: 'hidden',
          } : {};

          return (
            <div
              key={i}
              className={`devo-card ${cardClass}`}
              style={cardStyle}
              onClick={isFuture ? undefined : () => onCardTap(i)}
              {...(isFuture ? { 'data-locked': 'true' } : {})}
            >
              {isFuture && <div className="devo-lock">🔒</div>}
              <div className="devo-card-inner" style={{ ...innerStyle, ...(!isActive && !locked ? { filter: 'brightness(0.75)' } : {}) }}>
                {d.img && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '55%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)',
                    pointerEvents: 'none',
                    borderRadius: 'inherit',
                  }} />
                )}
                <div className="devo-flag-bg">{flag}</div>
                {!locked && (isPrayed ? (
                  <div className="devo-checked-badge">✓ Prayed</div>
                ) : (
                  <div className="devo-day-badge">
                    {isToday ? `Today · Day ${i + 1}` : `Day ${i + 1}`}
                  </div>
                ))}
                <span className="devo-flag-main" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {featNations.length > 0
                    ? featNations.map(n => <FlagImg key={n.n} iso={n.iso} f={n.f} size={28} />)
                    : flag}
                </span>
                <div className="devo-nation">{nationName}</div>
                <div className="devo-theme">{theme}</div>
                <div className="devo-date">{d.d} · Day {i + 1}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="carousel-dots">
        {RAW_SCHEDULE.map((_, i) => (
          <div key={i} className={`carousel-dot ${i === activeCard ? "active" : ""}`} />
        ))}
      </div>

      {!gameState.journeyMode && (
        <div style={{
          margin: '16px 16px 0', padding: '16px',
          background: 'rgba(0,0,0,0.04)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif', fontSize: 13,
            color: '#8899AA', lineHeight: 1.5, flex: 1,
          }}>
            Turn on Journey Mode in Settings to track your prayer streak and nations.
          </div>
          <button
            onClick={onOpenSettings}
            style={{
              background: 'transparent', border: '1px solid #CDD5DE', borderRadius: 8,
              padding: '6px 10px', fontFamily: 'Montserrat, sans-serif', fontSize: 12,
              color: '#8899AA', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ⚙ Settings
          </button>
        </div>
      )}

      {gameState.journeyMode && (
        <>
          <div className="jny-section-label" style={{ paddingBottom: 8 }}>Achievements</div>
          <div className="jny-achieve-strip">
            {Object.entries(ACHIEVEMENT_LABELS).map(([id, info]) => {
              const isEarned = earned.includes(id);
              return (
                <div key={id} className={`achieve-chip ${isEarned ? "" : "locked"}`}>
                  <span className="achieve-icon">{info.icon}</span>
                  <span className="achieve-label">{info.label}</span>
                  {isEarned && <div className="achieve-earned-dot" />}
                </div>
              );
            })}
          </div>
        </>
      )}

      {gameState.journeyMode && (
        <div className="jny-score-row">
          <div>
            <div className="jny-score-label">Your Score</div>
            <div className="jny-score-num">{score} pts</div>
            <div className="jny-score-sub">
              {gameState.prayedNations.length} nations · {gameState.checkedInDays.length} days · {gameState.completedDevotionals.length} devotionals
            </div>
          </div>
          <div className="jny-trophy-thumb">🏆</div>
        </div>
      )}

    </div>
  );
}

/* ─── ALL NATIONS TAB ─── */
function AllNations({ gameState, updateGameState, onPray }) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [selectedNation, setSelectedNation] = useState(null);

  const filtered = [...RAW_COUNTRIES].sort((a, b) => a.n.localeCompare(b.n)).filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.n.toLowerCase().includes(q) || c.ug.some(g => g.toLowerCase().includes(q));
    const matchRegion = region === "All" || c.r === region;
    return matchSearch && matchRegion;
  });

  return (
    <div style={{ paddingBottom: 100 }}>
      <NationModal nation={selectedNation} onClose={() => setSelectedNation(null)} gameState={gameState} updateGameState={updateGameState} onPray={onPray} />

      {/* Search & Filter */}
      <div style={{ background: C.indigo, padding: "14px 16px 16px" }}>
        <input
          type="text"
          placeholder="🔍  Search countries or people groups…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "14px 16px",
            fontFamily: "Montserrat, sans-serif", fontSize: 16,
            borderRadius: 12, border: "none",
            background: "rgba(255,255,255,0.95)",
            color: C.text,
            outline: "none",
            marginBottom: 10,
          }}
        />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: 2 }}>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)} style={{
              background: r === region ? C.orange : "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{ padding: "12px 16px 6px", fontFamily: "Montserrat, sans-serif", fontSize: 13, color: C.blue, fontWeight: 600 }}>
        {filtered.length} nation{filtered.length !== 1 ? "s" : ""} found
      </div>

      {/* Nation Cards */}
      <div style={{ padding: "0 16px" }}>
        {filtered.map((c, i) => (
          <button key={c.n} onClick={() => setSelectedNation(c)} style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            background: C.white, border: `1px solid ${C.blue}25`,
            borderRadius: 14, padding: "14px 16px", cursor: "pointer",
            textAlign: "left", marginBottom: 10,
            boxShadow: "0 2px 8px rgba(27,69,106,0.07)",
          }}>
            <FlagImg iso={c.iso} f={c.f} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17, color: C.indigo }}>{c.n}</div>
              {(() => {
                const nationMatches = RAW_SCHEDULE.filter(d =>
                  d.matches && d.matches.some(m => m.a === c.n || m.b === c.n)
                );
                const group = nationMatches.length > 0
                  ? nationMatches[0].matches.find(m => m.a === c.n || m.b === c.n)?.g
                  : null;
                const dates = nationMatches.map(d => d.d);
                return (
                  <>
                    <div style={{ fontSize:13, color:C.blue }}>
                      {c.r} · {c.cf}{group ? ` · Group ${group}` : ""}
                    </div>
                    {dates.length > 0 && (
                      <div style={{ fontSize:12, color:C.blueJeans, marginTop:2 }}>
                        {dates.join(" · ")}
                      </div>
                    )}
                  </>
                );
              })()}
              {(gameState?.prayedNations || []).includes(c.n) && (
                <span style={{ display: "inline-block", marginTop: 3, background: "#e8f5e9", color: "#2e7d32", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11, borderRadius: 999, padding: "2px 8px" }}>
                  ✓ Prayed
                </span>
              )}
            </div>
          </button>
        ))}

      </div>
    </div>
  );
}

/* ─── MY JOURNEY TAB ─── */
function scheduleToISO(dateStr) {
  const m = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const [mon, day] = dateStr.split(' ');
  return `2026-${String(m[mon]).padStart(2,'0')}-${String(parseInt(day)).padStart(2,'0')}`;
}

const JOURNEY_CSS = `
  .jny-stats {
    background: white;
    margin: 12px 16px 0;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    box-shadow: 0 2px 8px rgba(27,69,106,0.08);
  }
  .jny-stat-block {
    flex: 1;
    display: flex; flex-direction: column; align-items: center;
  }
  .jny-stat-block + .jny-stat-block { border-left: 1px solid #E5EAF0; }
  .jny-stat-num { font-size: 22px; font-weight: 800; line-height: 1; margin-bottom: 3px; font-family: 'Montserrat', sans-serif; }
  .jny-stat-label { font-size: 10px; font-weight: 600; color: #8899AA; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Montserrat', sans-serif; }
  .jny-clr-orange { color: #F38E53; }
  .jny-clr-jeans  { color: #5388F3; }
  .jny-clr-blue   { color: #3E67AC; }

  .jny-mission-btn {
    margin: 10px 16px 0;
    background: linear-gradient(90deg, #F38E53, #e07840);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
    color: white;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase;
    cursor: pointer; border: none;
    width: calc(100% - 32px);
  }

  .jny-section-label {
    padding: 16px 16px 10px;
    font-family: 'Montserrat', sans-serif;
    font-size: 17px; font-weight: 800;
    color: #1B456A; letter-spacing: -0.2px;
  }
  .jny-section-sub { font-size: 12px; font-weight: 500; color: #8899AA; margin-top: 1px; }

  .carousel-scroll-wrap {
    overflow-x: auto;
    padding: 0 16px 16px;
    display: flex; gap: 12px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .carousel-scroll-wrap::-webkit-scrollbar { display: none; }

  .devo-card {
    scroll-snap-align: center;
    flex-shrink: 0; width: 200px;
    border-radius: 18px; overflow: hidden;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
    position: relative;
  }
  .devo-card:active { transform: scale(0.97); }
  .devo-card.today { width: 220px; box-shadow: 0 8px 28px rgba(27,69,106,0.22); transform: translateY(-4px); }
  .devo-card.today:active { transform: translateY(-4px) scale(0.97); }
  .devo-card.past  { opacity: 0.85; box-shadow: 0 2px 8px rgba(27,69,106,0.08); }
  .devo-card.future { cursor: not-allowed; box-shadow: none; -webkit-tap-highlight-color: transparent; user-select: none; pointer-events: none; }
  .devo-card.future:active { transform: none; }

  .devo-card-inner {
    height: 260px; display: flex; flex-direction: column;
    justify-content: flex-end; padding: 16px; position: relative;
  }
  .devo-card.today  .devo-card-inner { background: linear-gradient(160deg, #1B456A 0%, #2a6ea6 60%, #1B456A 100%); }
  .devo-card.past   .devo-card-inner { background: linear-gradient(160deg, #2a5a8a 0%, #3E67AC 100%); }
  .devo-card.future .devo-card-inner { background: linear-gradient(160deg, #5a7a9a 0%, #8899AA 100%); opacity: 0.45; filter: grayscale(1); pointer-events: none; }

  .devo-flag-bg { position: absolute; top: 12px; right: 14px; font-size: 64px; opacity: 0.25; line-height: 1; user-select: none; }
  .devo-card.today .devo-flag-bg { font-size: 72px; opacity: 0.3; }

  .devo-day-badge {
    position: absolute; top: 12px; left: 12px;
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px; padding: 3px 9px;
    font-size: 10px; font-weight: 700; color: white;
    letter-spacing: 0.5px; text-transform: uppercase;
    backdrop-filter: blur(4px); font-family: 'Montserrat', sans-serif;
  }
  .devo-card.today .devo-day-badge { background: #F38E53; border-color: #F38E53; }

  .devo-checked-badge {
    position: absolute; top: 12px; left: 12px;
    background: #2ecc71; border-radius: 20px; padding: 3px 9px;
    font-size: 10px; font-weight: 700; color: white;
    letter-spacing: 0.3px; font-family: 'Montserrat', sans-serif;
  }

  .devo-lock { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 28px; z-index: 2; }

  .devo-flag-main { font-size: 28px; margin-bottom: 6px; display: block; }
  .devo-nation { color: rgba(255,255,255,0.7); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; font-family: 'Montserrat', sans-serif; }
  .devo-theme  { color: white; font-size: 13px; font-weight: 700; line-height: 1.3; font-family: 'Libre Baskerville', serif; }
  .devo-card.today .devo-theme { font-size: 15px; }
  .devo-date   { color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.8); font-size: 10px; font-weight: 500; margin-top: 6px; font-family: 'Montserrat', sans-serif; }

  .devo-card.today::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 4px; background: #F38E53; border-radius: 0 0 18px 18px;
  }

  .carousel-dots { display: flex; justify-content: center; gap: 5px; margin: -8px 0 4px; }
  .carousel-dot { width: 6px; height: 6px; border-radius: 50%; background: #CDD5DE; transition: all 0.2s; }
  .carousel-dot.active { width: 18px; border-radius: 3px; background: #F38E53; }

  .jny-achieve-strip { padding: 0 16px 16px; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
  .jny-achieve-strip::-webkit-scrollbar { display: none; }
  .achieve-chip {
    flex-shrink: 0; background: white; border-radius: 12px;
    padding: 10px 12px; display: flex; align-items: center; gap: 7px;
    box-shadow: 0 2px 6px rgba(27,69,106,0.07); min-width: 120px;
  }
  .achieve-chip.locked { opacity: 0.4; filter: grayscale(1); }
  .achieve-icon { font-size: 20px; }
  .achieve-label { font-size: 11px; font-weight: 700; color: #1B456A; font-family: 'Montserrat', sans-serif; }
  .achieve-earned-dot { width: 6px; height: 6px; background: #2ecc71; border-radius: 50%; margin-left: auto; }

  .jny-score-row {
    margin: 0 16px 16px; background: #1B456A;
    border-radius: 14px; padding: 16px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .jny-score-label { color: rgba(255,255,255,0.65); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; font-family: 'Montserrat', sans-serif; }
  .jny-score-num   { color: white; font-size: 28px; font-weight: 800; font-family: 'Montserrat', sans-serif; }
  .jny-score-sub   { color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 500; margin-top: 1px; font-family: 'Montserrat', sans-serif; }
  .jny-trophy-thumb { font-size: 44px; }
`;

// eslint-disable-next-line no-unused-vars
function MyJourney({ gameState, setTab }) {
  const score = calcScore(gameState);
  const earned = gameState.goalsAchieved || [];
  const carouselRef = useRef(null);

  const today = new Date();
  const startOfTournament = new Date("2026-06-11");
  let todayIdx = 0;
  if (today >= startOfTournament) {
    const diff = Math.floor((today - startOfTournament) / 86400000);
    todayIdx = Math.min(diff, RAW_SCHEDULE.length - 1);
  }

  const [activeCard, setActiveCard] = useState(todayIdx);

  useEffect(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cards = container.children;
    if (cards[todayIdx]) {
      const card = cards[todayIdx];
      const offset = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: 'auto' });
    }
  }, [todayIdx]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <style>{JOURNEY_CSS}</style>

      {/* Stats bar */}
      <div className="jny-stats">
        <div className="jny-stat-block">
          <div className="jny-stat-num jny-clr-orange">🔥 {gameState.streakCount}</div>
          <div className="jny-stat-label">Day Streak</div>
        </div>
        <div className="jny-stat-block">
          <div className="jny-stat-num jny-clr-jeans">{gameState.prayedNations.length}</div>
          <div className="jny-stat-label">Nations</div>
        </div>
        <div className="jny-stat-block">
          <div className="jny-stat-num jny-clr-blue">{gameState.completedDevotionals.length}</div>
          <div className="jny-stat-label">Devotionals</div>
        </div>
      </div>

      {/* Today's Mission CTA */}
      <button className="jny-mission-btn" onClick={() => setTab("digest")}>
        <span>⚡ Today's Mission — Day {todayIdx + 1}</span>
        <span style={{ fontSize: 16 }}>›</span>
      </button>

      {/* Section label */}
      <div className="jny-section-label">
        Teams
        <div className="jny-section-sub">Today's devotional is centered · past days completed · future days locked</div>
      </div>

      {/* Devotional Carousel */}
      <div
        className="carousel-scroll-wrap"
        ref={carouselRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const center = el.scrollLeft + el.offsetWidth / 2;
          let closest = 0, minDist = Infinity;
          Array.from(el.children).forEach((child, i) => {
            const dist = Math.abs(child.offsetLeft + child.offsetWidth / 2 - center);
            if (dist < minDist) { minDist = dist; closest = i; }
          });
          setActiveCard(closest);
        }}
      >
        {RAW_SCHEDULE.map((d, i) => {
          const isToday  = i === todayIdx;
          const isPast   = i < todayIdx;
          const isFuture = i > todayIdx;
          const cardClass = isToday ? "today" : isPast ? "past" : "future";
          const featNations = (d.feat || [])
            .filter(name => name !== "All Nations")
            .map(name => RAW_COUNTRIES.find(c => c.n === name))
            .filter(Boolean);
          const nationName = featNations.length > 0
            ? featNations.map(n => n.n).join(" · ")
            : (d.feat && d.feat[0] === "All Nations" ? "All Nations" : "The Nations");
          const theme = d.dev.length > 44 ? d.dev.substring(0, 44) + "…" : d.dev;
          const isPrayed = isPast && (gameState.checkedInDays || []).includes(scheduleToISO(d.d));

          return (
            <div
              key={i}
              className={`devo-card ${cardClass}`}
              onClick={isFuture ? undefined : () => setTab("digest")}
              {...(isFuture ? { 'data-locked': 'true' } : {})}
              style={d.img ? {
                backgroundImage: `linear-gradient(rgba(10,20,40,0.55) 0%, rgba(10,20,40,0.88) 100%), url(${d.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              } : undefined}
            >
              {isFuture && <div className="devo-lock">🔒</div>}
              <div className="devo-card-inner">
                <div className="devo-flag-bg">
                  {featNations.length > 0
                    ? <FlagImg iso={featNations[0].iso} f={featNations[0].f} size={64} />
                    : <span style={{ fontSize: 64 }}>🌍</span>}
                </div>
                {!isFuture && (isPrayed ? (
                  <div className="devo-checked-badge">✓ Prayed</div>
                ) : (
                  <div className="devo-day-badge">
                    {isToday ? `Today · Day ${i + 1}` : `Day ${i + 1}`}
                  </div>
                ))}
                <span className="devo-flag-main" style={{ display:"flex", gap:4, alignItems:"center" }}>
                  {featNations.length > 0
                    ? featNations.map(n => <FlagImg key={n.n} iso={n.iso} f={n.f} size={28} />)
                    : <span style={{ fontSize: 28 }}>🌍</span>}
                </span>
                <div className="devo-nation">{nationName}</div>
                <div className="devo-theme">{theme}</div>
                <div className="devo-date">{d.d} · Day {i + 1}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Carousel dots */}
      <div className="carousel-dots">
        {RAW_SCHEDULE.map((_, i) => (
          <div key={i} className={`carousel-dot ${i === activeCard ? "active" : ""}`} />
        ))}
      </div>

      {/* Achievements */}
      <div className="jny-section-label" style={{ paddingBottom: 8 }}>Achievements</div>
      <div className="jny-achieve-strip">
        {Object.entries(ACHIEVEMENT_LABELS).map(([id, info]) => {
          const isEarned = earned.includes(id);
          return (
            <div key={id} className={`achieve-chip ${isEarned ? "" : "locked"}`}>
              <span className="achieve-icon">{info.icon}</span>
              <span className="achieve-label">{info.label}</span>
              {isEarned && <div className="achieve-earned-dot" />}
            </div>
          );
        })}
      </div>

      {/* Score card */}
      <div className="jny-score-row">
        <div>
          <div className="jny-score-label">Your Score</div>
          <div className="jny-score-num">{score} pts</div>
          <div className="jny-score-sub">
            {gameState.prayedNations.length} nations · {gameState.checkedInDays.length} days · {gameState.completedDevotionals.length} devotionals
          </div>
        </div>
        <div className="jny-trophy-thumb">🏆</div>
      </div>

    </div>
  );
}

/* ─── ACHIEVEMENT TOAST ─── */
const BIG_ACHIEVEMENTS = new Set([
  'hat_trick', 'golden_boot', 'world_tour',
  'through_the_groups', 'final_whistle', 'sent', 'full_squad'
]);

function AchievementToast({ achievement, onDismiss }) {
  const isNudge = achievement && typeof achievement === 'object' && achievement.type === 'nudge';

  useEffect(() => {
    if (!achievement) return;
    if (isNudge) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
    const duration = BIG_ACHIEVEMENTS.has(achievement) ? 0 : 3500;
    if (duration === 0) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss, isNudge]);

  if (!achievement) return null;

  if (isNudge) {
    return (
      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3000,
          width: "calc(100% - 48px)",
          maxWidth: 400,
          background: "#00476B",
          border: "1.5px solid #00BAF8",
          borderRadius: 20,
          padding: "10px 14px 10px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 40, height: 40,
          background: "#E06520",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}>
          👋
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800, fontSize: 13,
            color: "#fff",
          }}>
            {achievement.from} is cheering you on!
          </div>
          <div style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700, fontSize: 11,
            color: "#8ADBFF",
            marginTop: 1,
          }}>
            Your {achievement.teamName} teammate wants you to pray today
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: 16, cursor: "pointer",
            padding: "0 0 0 4px",
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  const info = ACHIEVEMENT_LABELS[achievement];
  if (!info) return null;

  if (BIG_ACHIEVEMENTS.has(achievement)) {
    return (
      <div
        onClick={onDismiss}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,28,46,0.72)",
          zIndex: 3000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "#00476B",
            border: "1.5px solid #00BAF8",
            borderRadius: 20,
            padding: "28px 24px 22px",
            width: 260,
            textAlign: "center",
          }}
        >
          <div style={{
            width: 64, height: 64,
            background: "#E06520",
            border: "3px solid #FF8844",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 14px",
          }}>
            {info.icon}
          </div>
          <div style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800, fontSize: 11,
            color: "#00BAF8",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            Achievement unlocked
          </div>
          <div style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900, fontSize: 18,
            color: "#fff",
            marginBottom: 4,
          }}>
            {info.label}
          </div>
          <div style={{
            fontFamily: "Libre Baskerville, serif",
            fontStyle: "italic",
            fontSize: 12,
            color: "#8ADBFF",
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            {info.desc}
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: "#E06520",
              border: "none",
              borderRadius: 20,
              color: "#fff",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.5px",
              padding: "9px 24px",
              cursor: "pointer",
            }}
          >
            Keep going
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 3000,
        width: "calc(100% - 48px)",
        maxWidth: 400,
        background: "#00476B",
        border: "1.5px solid #00BAF8",
        borderRadius: 20,
        padding: "10px 14px 10px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 40, height: 40,
        background: "#E06520",
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
        flexShrink: 0,
      }}>
        {info.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800, fontSize: 10,
          color: "#FF8844",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          marginBottom: 2,
        }}>
          Achievement unlocked
        </div>
        <div style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800, fontSize: 13,
          color: "#fff",
        }}>
          {info.label}
        </div>
        <div style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700, fontSize: 11,
          color: "#8ADBFF",
          marginTop: 1,
        }}>
          {info.desc}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none", border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: 16, cursor: "pointer",
          padding: "0 0 0 4px",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ─── TOGGLE SWITCH ─── */
function ToggleSwitch({ value, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      width: 50, height: 28, borderRadius: 14,
      background: value ? C.orange : "#ccc",
      position: "relative", cursor: "pointer",
      transition: "background 0.2s",
      flexShrink: 0,
    }}>
      <div style={{
        position: "absolute",
        top: 3, left: value ? 25 : 3,
        width: 22, height: 22,
        borderRadius: "50%", background: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

/* ─── KIT BADGE ─── */
const KitBadge = ({ kitId, size = 32 }) => {
  return <SoccerBallKit kitId={kitId} size={size * 0.85} />;
};

/* ─── SHARE CARD CANVAS ─── */
const KIT_SVG_SLUG = {
  brazil:'brazil', argentina:'argentina', france:'france', germany:'germany',
  spain:'spain', usa:'usa', mexico:'mexico', canada:'canada', portugal:'portugal',
  nigeria:'nigeria', morocco:'morocco', senegal:'senegal', japan:'japan',
  saudi:'saudi-arabia', netherlands:'netherlands', jordan:'jordan',
  australia:'australia', southkorea:'south-korea', england:'england', scotland:'scotland',
};
const KIT_FLAG_EMOJI_MAP = {
  brazil:'🇧🇷', argentina:'🇦🇷', france:'🇫🇷', germany:'🇩🇪', spain:'🇪🇸',
  usa:'🇺🇸', mexico:'🇲🇽', canada:'🇨🇦', portugal:'🇵🇹', nigeria:'🇳🇬',
  morocco:'🇲🇦', senegal:'🇸🇳', japan:'🇯🇵', saudi:'🇸🇦', netherlands:'🇳🇱',
  jordan:'🇯🇴', australia:'🇦🇺', southkorea:'🇰🇷', england:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', scotland:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
};
function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function generateShareCard(type, data) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  try { await document.fonts.ready; } catch {}

  ctx.fillStyle = '#00476B';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = '#E06520';
  ctx.fillRect(0, 0, 12, 1920);

  // Load logo once; used differently per type
  let logoImg = null;
  try { logoImg = await loadCanvasImage('/images/pray-cup-logo-white.png'); } catch {}

  ctx.textAlign = 'center';

  if (type === 'final_whistle') {
    if (logoImg) {
      const lW = 400, lH = Math.round(lW * logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, (1080 - lW) / 2, 120, lW, lH);
    }

    ctx.font = '220px serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🏆', 540, 680);

    ctx.font = 'bold 72px Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('I prayed for all 48 nations', 540, 940);

    ctx.font = '48px Montserrat, sans-serif';
    ctx.fillStyle = '#8ADBFF';
    ctx.fillText('2026 FIFA World Cup', 540, 1030);

    ctx.strokeStyle = '#E06520';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(390, 1100); ctx.lineTo(690, 1100); ctx.stroke();

    ctx.font = '42px Montserrat, sans-serif';
    ctx.fillStyle = '#8ADBFF';
    ctx.fillText('prayforthecup.com', 540, 1160);

    try {
      const wm = await loadCanvasImage('/images/gg-wordmark.png');
      const wmW = 180, wmH = Math.round(wmW * wm.height / wm.width);
      ctx.drawImage(wm, (1080 - wmW) / 2, 1260, wmW, wmH);
    } catch {}

  } else if (type === 'team') {
    const { teamName = '', kitNation = '', teamCode = '' } = data;

    // Logo dimensions at 280px wide
    const lW = 280;
    const lH = logoImg ? Math.round(lW * logoImg.height / logoImg.width) : 0;

    // Load kit SVG
    const slug = KIT_SVG_SLUG[kitNation] || kitNation;
    let kitImg = null;
    try {
      const svgText = await fetch(`/images/kits/${slug}.svg`).then(r => r.text());
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      try { kitImg = await loadCanvasImage(svgUrl); } finally { URL.revokeObjectURL(svgUrl); }
    } catch {}

    const kW = 480;
    const kH = kitImg ? Math.round(kW * kitImg.height / kitImg.width) : 480;
    const namePx = teamName.length > 20 ? 60 : 80;

    // Total block height = sum of all y-advances in draw order below:
    // (lH + 80) + kH + (60 + namePx) + (20 + 48) + 60 + (60 + 42) + (40 + 44) + (50 + 38)
    const logoBlock = lH > 0 ? lH + 80 : 0;
    const contentH = logoBlock + kH + 60 + namePx + 20 + 48 + 60 + 60 + 42 + 40 + 44 + 50 + 38;
    let y = Math.max(60, Math.round((1920 - contentH) / 2));

    // Logo
    if (logoImg && lH > 0) {
      ctx.drawImage(logoImg, (1080 - lW) / 2, y, lW, lH);
      y += lH + 80;
    }

    // Kit SVG or emoji fallback
    if (kitImg) {
      ctx.drawImage(kitImg, (1080 - kW) / 2, y, kW, kH);
    } else {
      ctx.font = '200px serif'; ctx.fillStyle = '#ffffff';
      ctx.fillText(KIT_FLAG_EMOJI_MAP[kitNation] || '⚽', 540, y + Math.round(kH * 0.55));
    }
    y += kH;

    // Team name
    y += 60 + namePx;
    ctx.font = `bold ${namePx}px Montserrat, sans-serif`; ctx.fillStyle = '#ffffff';
    ctx.fillText(teamName, 540, y);

    // Subtext
    y += 20 + 48;
    ctx.font = '48px Montserrat, sans-serif'; ctx.fillStyle = '#8ADBFF';
    ctx.fillText('is praying for the nations ⚽', 540, y);

    // Divider
    y += 60;
    ctx.strokeStyle = '#E06520'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(390, y); ctx.lineTo(690, y); ctx.stroke();

    // "Join us:"
    y += 60 + 42;
    ctx.font = '42px Montserrat, sans-serif'; ctx.fillStyle = '#8ADBFF';
    ctx.fillText('Join us:', 540, y);

    // Join URL
    y += 40 + 44;
    ctx.font = 'bold 44px Montserrat, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText(`prayforthecup.com/app?join=${teamCode}`, 540, y);

    // Bottom URL
    y += 50 + 38;
    ctx.font = '38px Montserrat, sans-serif'; ctx.fillStyle = '#8ADBFF';
    ctx.fillText('prayforthecup.com', 540, y);
  }

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/* ─── TEAMS TAB ─── */
const TeamsTab = ({ gameState, updateGameState, userProfile, autoJoinCode, onAutoJoinConsumed }) => {
  const teams = gameState.teams || [];
  const [view, setView] = useState(teams.length > 0 ? 'myteam' : 'empty');
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [selectedKit, setSelectedKit] = useState('brazil');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamSheetMode, setTeamSheetMode] = useState(null);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [teamShareBanner, setTeamShareBanner] = useState(null);
  const [liveTeamData, setLiveTeamData] = useState({});
  const [joinPreviewData, setJoinPreviewData] = useState(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);
  const [joinPreviewError, setJoinPreviewError] = useState('');
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editKit, setEditKit] = useState('');
  const [teamUpdateBanner, setTeamUpdateBanner] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [showRemoveSubmenu, setShowRemoveSubmenu] = useState(false);
  const [snapVersion, setSnapVersion] = useState(0);
  const [nudgedNow, setNudgedNow] = useState({});
  const [copyToast, setCopyToast] = useState(false);
  const [memberToast, setMemberToast] = useState(null);
  const prevMembersRef = useRef({});

  useEffect(() => {
    if (view === 'create') {
      setTeamCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
  }, [view]);

  useEffect(() => {
    if ((gameState.teams || []).length > 0 && view === 'empty') {
      setView('myteam');
    }
  }, [gameState.teams, view]);

  useEffect(() => {
    if (autoJoinCode) {
      setView('join');
      handleJoinTeam(autoJoinCode);
      onAutoJoinConsumed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoinCode]);

  useEffect(() => {
    if (view === 'myteam') {
      setSnapVersion(v => v + 1);
    }
  }, [view, gameState.teams]);

  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (!profile.uid || !(gameState.teams || []).length) return;
    const unsubs = [];
    try {
      for (const team of gameState.teams) {
        const unsub = onSnapshot(doc(db, 'teams', team.id), (snap) => {
          if (!snap.exists()) {
            const updatedTeams = (gameState.teams || []).filter(t => t.id !== team.id);
            updateGameState({ teams: updatedTeams });
            return;
          }
          const snapData = snap.data();
          const currentUid = userProfile?.uid || auth.currentUser?.uid;
          const teamEntry = (gameState.teams || []).find(t => t.id === team.id);
          const joinedRecently = teamEntry?.joinedAt &&
            (Date.now() - new Date(teamEntry.joinedAt).getTime()) < 15000;
          if (!joinedRecently && currentUid && snapData.members && !snapData.members[currentUid]) {
            const updatedTeams = (gameState.teams || []).filter(t => t.id !== team.id);
            updateGameState({ teams: updatedTeams });
            return;
          }
          setLiveTeamData(prev => ({
            ...prev,
            [team.id]: {
              name: snapData.name,
              kitNation: snapData.kitNation,
              members: snapData.members || {},
              memberSummaries: Object.values(snapData.members || {}),
              memberCount: Object.keys(snapData.members || {}).length,
            },
          }));

          const newMembers = snapData.members || {};
          const prev = prevMembersRef.current[team.id];
          if (prev === undefined) {
            prevMembersRef.current = { ...prevMembersRef.current, [team.id]: newMembers };
          } else {
            const prevUids = Object.keys(prev);
            const newUids = Object.keys(newMembers);
            for (const uid of newUids) {
              if (!prev[uid]) {
                const name = newMembers[uid].name || 'Someone';
                setMemberToast(`🙏 ${name} joined your team!`);
                setTimeout(() => setMemberToast(null), 3000);
                break;
              }
            }
            if (currentUid === snapData.ownerUid) {
              for (const uid of prevUids) {
                if (!newMembers[uid]) {
                  const name = prev[uid].name || 'Someone';
                  setMemberToast(`${name} left the team.`);
                  setTimeout(() => setMemberToast(null), 3000);
                  break;
                }
              }
            }
            prevMembersRef.current = { ...prevMembersRef.current, [team.id]: newMembers };
          }
        });
        unsubs.push(unsub);
      }
    } catch {}
    return () => unsubs.forEach(fn => fn());
  }, [gameState.teams, updateGameState, userProfile?.uid, snapVersion]);

  useEffect(() => {
    if (joinCodeInput.length < 6) {
      setJoinPreviewData(null);
      setJoinPreviewError('');
      setJoinPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setJoinPreviewLoading(true);
    setJoinPreviewData(null);
    setJoinPreviewError('');
    const timer = setTimeout(() => {
      getDoc(doc(db, 'teams', joinCodeInput)).then(snap => {
        if (cancelled) return;
        if (!snap.exists()) {
          setJoinPreviewError('Team not found — double-check the code and try again');
        } else {
          const d = snap.data();
          setJoinPreviewData({
            name: d.name,
            kitNation: d.kitNation,
            memberCount: Object.keys(d.members || {}).length,
            members: d.members || {},
          });
        }
      }).catch(() => {
        if (cancelled) return;
        setJoinPreviewError('Could not load team — try again');
      }).finally(() => {
        if (!cancelled) setJoinPreviewLoading(false);
      });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [joinCodeInput]);

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  function avatarColor(str) {
    const palette = ['#E06520', '#3E67AC', '#009C3B', '#CC0000', '#74ACDF', '#006847'];
    const s = str || '';
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  function copyToClipboard(text) {
    try { navigator.clipboard.writeText(text); } catch {}
  }

  const handleInvite = (team) => {
    const inviteUrl = `https://prayforthecup.com/app?join=${team.id}`;
    const shareText = `Join my prayer team "${team.name}" on Pray for the Cup — praying through all 48 nations of the 2026 World Cup. Join here:`;

    if (navigator.share) {
      navigator.share({
        title: 'Join my team on Pray for the Cup',
        text: shareText,
        url: inviteUrl,
      }).catch(() => {}); // user cancelled — silently ignore
    } else {
      navigator.clipboard.writeText(`${shareText} ${inviteUrl}`)
        .then(() => setInviteCopied(true))
        .catch(() => setInviteCopied(true)); // show feedback either way
      setTimeout(() => setInviteCopied(false), 2500);
    }
  };

  async function handleNudge(targetUid, memberName) {
    const messages = [
      `🟨 Yellow card — you've been caught missing your prayer time!\nJust kidding — but your team misses you. Hebrews 10:24 says to "spur one another on." Consider yourself spurred. 🙏 prayforthecup.com/app`,
      `⚽ Your Captain is calling you back into the game!\nGood teammates carry each other — "carry each other's burdens." — Gal 6:2. Come pray with us! 🙏 prayforthecup.com/app`,
      `🚩 Offside! You've drifted from your prayer habit — but your team needs you.\n"As iron sharpens iron, so one person sharpens another." — Prov 27:17 prayforthecup.com/app`,
      `💧 Water break! Time to pause and pray for the nations.\nYou've got a teammate cheering you on — "Let us not give up meeting together." — Heb 10:25 prayforthecup.com/app`,
    ];
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pray for the Cup', text: selectedMessage, url: 'https://prayforthecup.com/app' });
      } else {
        await navigator.clipboard.writeText(selectedMessage);
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 3000);
      }
    } catch (e) {}

    setNudgedNow(prev => ({ ...prev, [targetUid]: true }));
    setTimeout(() => setNudgedNow(prev => ({ ...prev, [targetUid]: false })), 3000);
  }

  async function handleCreateTeam() {
    if (!teamNameInput.trim()) return;
    if (containsBlockedWord(teamNameInput)) {
      setCreateError('Please choose a different team name');
      return;
    }
    setCreateError('');
    const displayName = (userProfile && userProfile.displayName) ? userProfile.displayName : 'Anonymous';
    const memberUid = (userProfile && userProfile.uid) ? userProfile.uid : 'me';
    const newTeam = {
      id: teamCode,
      name: teamNameInput.trim(),
      kitNation: selectedKit,
      role: 'Team Leader',
      createdAt: new Date().toISOString(),
      memberCount: 1,
      collectiveNations: (gameState.prayedNations || []).length,
      collectiveDays: (gameState.checkedInDays || []).length,
      memberSummaries: [{
        id: memberUid,
        name: displayName,
        role: 'Team Leader',
        initials: getInitials(displayName),
        nations: (gameState.prayedNations || []).length,
        streak: gameState.streakCount || 0,
        inactiveDays: 0,
      }],
      achievements: [],
    };
    const updatedTeams = [...teams, newTeam];
    try { updateGameState({ teams: updatedTeams }); } catch {}
    const uid = userProfile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, "teams", teamCode), {
          name: teamNameInput.trim(),
          kitNation: selectedKit,
          createdAt: new Date().toISOString(),
          ownerUid: uid,
        }, { merge: true });
        await syncMemberToTeam(teamCode, uid, {
          name: displayName,
          nations: (gameState.prayedNations || []).length,
          streak: gameState.streakCount || 0,
          inactiveDays: 0,
          initials: getInitials(displayName),
          role: "owner",
          lastUpdated: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[createTeam] Firestore error:', e);
      }
    }
    setView('myteam');
    setActiveTeamIndex(updatedTeams.length - 1);
    const createdName = teamNameInput.trim();
    const createdKit = selectedKit;
    const createdCode = teamCode;
    setTeamNameInput('');
    setSelectedKit('brazil');
    generateShareCard('team', { teamName: createdName, kitNation: createdKit, teamCode: createdCode })
      .then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setTeamShareBanner({ teamName: createdName, teamCode: createdCode, previewUrl: url, blob });
      }).catch(() => {});
  }

  async function handleJoinTeam(rawCode) {
    const teamCode = (rawCode || joinCodeInput).trim().toUpperCase();
    if (!teamCode) return;
    setJoinError('');
    setJoinSuccess('');

    const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (!profile.uid) {
      setJoinError('no_account');
      return;
    }
    if ((gameState.teams || []).length >= 3) {
      setJoinError("You're already in 3 teams — that's the maximum");
      return;
    }
    if ((gameState.teams || []).some(t => t.id === teamCode)) {
      setJoinError("You're already in this team");
      return;
    }

    setJoinLoading(true);
    try {
      let data = joinPreviewData;
      if (!data) {
        const snap = await getDoc(doc(db, 'teams', teamCode));
        if (!snap.exists()) {
          setJoinError('Team not found — double-check the code and try again');
          return;
        }
        data = snap.data();
      }
      const newTeam = {
        id: teamCode,
        name: data.name,
        kitNation: data.kitNation,
        role: 'member',
        createdAt: data.createdAt,
        joinedAt: new Date().toISOString(),
        memberCount: Object.keys(data.members || {}).length,
        collectiveNations: [],
        collectiveDays: [],
        memberSummaries: Object.values(data.members || {}),
        achievements: [],
      };
      const updatedTeams = [...(gameState.teams || []), newTeam];
      updateGameState({ teams: updatedTeams });
      const name = profile.displayName || 'Anonymous';
      const initials = name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2) || '?';
      syncMemberToTeam(teamCode, profile.uid, {
        name,
        nations: (gameState.prayedNations || []).length,
        streak: gameState.streakCount || 0,
        inactiveDays: 0,
        initials,
        role: 'member',
        lastUpdated: new Date().toISOString(),
      });
      setJoinSuccess(`You joined ${data.name}! 🙌`);
      setJoinCodeInput('');
      setView('myteam');
      setActiveTeamIndex(updatedTeams.length - 1);
      setTimeout(() => setJoinSuccess(''), 1500);
    } catch {
      setJoinError('Something went wrong — try again');
    } finally {
      setJoinLoading(false);
    }
  }

  function handleEditTeam() {
    const name = editName.trim();
    if (!name || name.length < 2 || name.length > 30) return;
    if (containsBlockedWord(name)) {
      setEditError('Please choose a different team name');
      return;
    }
    setEditError('');
    const updatedTeams = (gameState.teams || []).map(t =>
      t.id === activeTeam.id ? { ...t, name, kitNation: editKit } : t
    );
    updateGameState({ teams: updatedTeams });
    updateDoc(doc(db, 'teams', activeTeam.id), { name, kitNation: editKit }).catch(() => {});
    setShowEditSheet(false);
    setShowTeamMenu(false);
    setTeamUpdateBanner(true);
    setTimeout(() => setTeamUpdateBanner(false), 2500);
  }

  function handleDeleteTeam() {
    const updatedTeams = (gameState.teams || []).filter(t => t.id !== activeTeam.id);
    updateGameState({ teams: updatedTeams });
    deleteDoc(doc(db, 'teams', activeTeam.id)).catch(() => {});
    setShowDeleteConfirm(false);
    setShowTeamMenu(false);
    if (updatedTeams.length === 0) {
      setView('empty');
    } else {
      setActiveTeamIndex(prev => Math.min(prev, updatedTeams.length - 1));
    }
  }

  const safeIndex = Math.min(activeTeamIndex, Math.max(0, teams.length - 1));
  const activeTeam = teams.length > 0 ? (teams[safeIndex] || null) : null;
  function handleRemoveMember(uid) {
    updateDoc(doc(db, 'teams', activeTeam.id), {
      [`members.${uid}`]: deleteField(),
      memberCount: Math.max(0, (liveTeamData[activeTeam.id]?.memberCount || 1) - 1),
    }).catch(() => {});
    setConfirmRemoveMember(null);
  }

  const liveTeam = activeTeam ? liveTeamData[activeTeam.id] : null;
  const displayName = liveTeam?.name || activeTeam?.name;
  const displayKit = liveTeam?.kitNation || activeTeam?.kitNation;
  const activeKit = activeTeam ? (TEAM_KITS.find(k => k.id === displayKit) || TEAM_KITS[0]) : TEAM_KITS[0];

  /* ── EMPTY STATE ── */
  if (view === 'empty') {
    return (
      <div style={{ minHeight: '100%', background: '#F5F7F8' }}>
        {/* Hero */}
        <div style={{
          background: '#00476B',
          padding: '36px 24px 44px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          <div style={{ marginBottom: 16 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#FFFFFF', marginBottom: 8, lineHeight: 1.3 }}>
            Pray together. Go further.
          </div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 28, maxWidth: 280, lineHeight: 1.5 }}>
            Form a prayer team with friends, track collective progress, and cheer each other on.
          </div>
          <button
            onClick={() => setView('create')}
            style={{
              width: '100%', maxWidth: 320, background: '#E06520', border: 'none',
              borderRadius: 12, padding: '14px 0', fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700, fontSize: 15, color: '#FFFFFF', cursor: 'pointer', marginBottom: 12,
            }}
          >
            + Create a team
          </button>
          <button
            onClick={() => setView('join')}
            style={{
              width: '100%', maxWidth: 320, background: 'transparent',
              border: '2px solid #00BAF8', borderRadius: 12, padding: '12px 0',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
              color: '#00BAF8', cursor: 'pointer',
            }}
          >
            Enter team code
          </button>
        </div>

        {/* Locked achievements */}
        <div style={{ padding: '24px 16px' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Team Achievements
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {TEAM_ACHIEVEMENTS.map((ach, i) => (
              <div key={ach.id} style={{
                background: '#FFFFFF', borderRadius: 12, padding: '14px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                filter: 'grayscale(1)', opacity: 0.4,
                gridColumn: i === TEAM_ACHIEVEMENTS.length - 1 && TEAM_ACHIEVEMENTS.length % 2 !== 0 ? '1 / -1' : undefined,
              }}>
                <span style={{ fontSize: 22 }}>{ach.icon}</span>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#1B2B3A' }}>{ach.label}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#3E67AC', marginTop: 2 }}>{ach.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── MY TEAM STATE ── */
  if (view === 'myteam') {
    if (!activeTeam) return null;
    return (
      <div style={{ minHeight: '100%', background: '#F5F7F8' }}>
        {teamShareBanner && (
          <div style={{ background: '#00476B', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #E06520' }}>
            {teamShareBanner.previewUrl && (
              <img src={teamShareBanner.previewUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamShareBanner.teamName}</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Team created!</div>
            </div>
            <button
              onClick={async () => {
                try {
                  const file = new File([teamShareBanner.blob], 'team.png', { type: 'image/png' });
                  const text = `Join my prayer team on Pray for the Cup! Code: ${teamShareBanner.teamCode} — prayforthecup.com/app?join=${teamShareBanner.teamCode}`;
                  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], text });
                  } else if (navigator.share) {
                    await navigator.share({ text });
                  } else {
                    await navigator.clipboard.writeText(`prayforthecup.com/app?join=${teamShareBanner.teamCode}`);
                  }
                } catch {}
              }}
              style={{ background: '#E06520', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
            >Share Your Team</button>
            <button
              onClick={() => { URL.revokeObjectURL(teamShareBanner.previewUrl); setTeamShareBanner(null); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', padding: 4, flexShrink: 0 }}
            >✕</button>
          </div>
        )}

        {/* Pill switcher */}
        <div style={{ background: '#00476B', padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {teams.map((team, i) => (
            <button
              key={team.id}
              onClick={() => setActiveTeamIndex(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent',
                border: i === safeIndex ? '2px solid #FFFFFF' : '2px solid rgba(255,255,255,0.25)',
                borderRadius: 999, padding: '6px 12px 6px 8px',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13,
                color: '#FFFFFF', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <KitBadge kitId={liveTeamData[team.id]?.kitNation || team.kitNation} size={20} />
              {liveTeamData[team.id]?.name || team.name}
            </button>
          ))}
          {teams.length < 3 && (
            <button
              onClick={() => setTeamSheetMode('choose')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent',
                border: '2px dashed rgba(255,255,255,0.35)',
                borderRadius: 999, padding: '6px 14px',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13,
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              + Team
            </button>
          )}
        </div>

        {/* Team hero card */}
        {activeTeam && (
          <div style={{
            background: '#00476B',
            borderLeft: `4px solid ${activeKit.accent}`,
            margin: 16, borderRadius: 14, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <KitBadge kitId={displayKit} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#FFFFFF' }}>
                  {displayName}
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  {(liveTeamData[activeTeam.id]?.memberCount ?? activeTeam.memberCount)} {(liveTeamData[activeTeam.id]?.memberCount ?? activeTeam.memberCount) === 1 ? 'member' : 'members'} · Code: {activeTeam.id}
                </div>
              </div>
              <button
                onClick={() => handleInvite(activeTeam)}
                style={{
                  background: inviteCopied ? '#00476B' : '#E06520', border: 'none', borderRadius: 8,
                  padding: '7px 14px', fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700, fontSize: 13, color: '#FFFFFF', cursor: 'pointer', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                {inviteCopied ? 'Link copied! 📋' : '🔗 Invite'}
              </button>
              {(activeTeam.role === 'owner' || activeTeam.role === 'Team Leader') && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setEditName(displayName);
                      setEditKit(displayKit);
                      setShowRemoveSubmenu(false);
                      setShowTeamMenu(v => !v);
                    }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.8)', fontSize: 22, padding: '4px 6px',
                      lineHeight: 1, letterSpacing: 1,
                    }}
                    title="Team settings"
                  >
                    ⋯
                  </button>
                  {showTeamMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: '#003A56', border: '1.5px solid #00BAF8',
                      borderRadius: 10, zIndex: 50, minWidth: 180,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                    }}>
                      {!showRemoveSubmenu ? (
                        <>
                          <button
                            onClick={() => { setShowTeamMenu(false); setShowEditSheet(true); }}
                            style={{
                              width: '100%', background: 'transparent', border: 'none',
                              padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
                              color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            ✏️ Edit team
                          </button>
                          <button
                            onClick={() => setShowRemoveSubmenu(true)}
                            style={{
                              width: '100%', background: 'transparent', border: 'none',
                              padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
                              color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            👤 Remove a member
                          </button>
                          <button
                            onClick={() => { setShowTeamMenu(false); setShowDeleteConfirm(true); }}
                            style={{
                              width: '100%', background: 'transparent', border: 'none',
                              padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
                              color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            🗑️ Delete team
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowRemoveSubmenu(false)}
                            style={{
                              width: '100%', background: 'transparent', border: 'none',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              padding: '10px 16px', textAlign: 'left', cursor: 'pointer',
                              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13,
                              color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            ← Back
                          </button>
                          {(() => {
                            const currentUid = userProfile?.uid || auth.currentUser?.uid;
                            const removable = Object.entries(liveTeamData[activeTeam.id]?.members || {})
                              .filter(([uid]) => uid !== currentUid);
                            if (removable.length === 0) {
                              return (
                                <div style={{ padding: '12px 16px', fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                                  No other members
                                </div>
                              );
                            }
                            return removable.map(([uid, member]) => (
                              <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
                                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#FFFFFF', flex: 1, marginRight: 8 }}>
                                  {member.name}
                                </span>
                                <button
                                  onClick={() => { setShowTeamMenu(false); setShowRemoveSubmenu(false); setConfirmRemoveMember({ uid, name: member.name }); }}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff6b6b', fontSize: 15, padding: '2px 4px', lineHeight: 1 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ));
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nations progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Nations prayed
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                {(liveTeamData[activeTeam.id]?.memberSummaries || activeTeam.memberSummaries || []).reduce((sum, m) => sum + (m.nations || 0), 0)} of 48
              </div>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(((liveTeamData[activeTeam.id]?.memberSummaries || activeTeam.memberSummaries || []).reduce((sum, m) => sum + (m.nations || 0), 0) / 48) * 100, 100)}%`,
                background: activeKit.primary,
                borderRadius: 3,
              }} />
            </div>
          </div>
        )}

        {/* Members */}
        {activeTeam && (Object.keys(liveTeamData[activeTeam.id]?.members || {}).length > 0 || (activeTeam.memberSummaries || []).length > 0) && (
          <div style={{ padding: '0 16px 16px' }}>
            {console.log('[Teams] liveTeamData for', activeTeam.id, liveTeamData[activeTeam.id])}
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Members
            </div>
            {(liveTeamData[activeTeam.id]?.members
              ? Object.entries(liveTeamData[activeTeam.id].members)
              : (activeTeam.memberSummaries || []).map(m => [m.id || m.name, m])
            ).map(([uid, member]) => {
              const isInactive = member.inactiveDays > 0;
              return (
                <div key={uid} style={{
                  background: '#FFFFFF', borderRadius: 12, padding: 14,
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: avatarColor(uid),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 14,
                    color: '#FFFFFF', flexShrink: 0,
                  }}>
                    {member.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#1B2B3A' }}>
                        {member.name}
                      </span>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#3E67AC' }}>
                        {member.role === 'owner' ? 'captain' : member.role}
                      </span>
                      {isInactive && (
                        <span style={{
                          background: '#FFF3CD', color: '#856404',
                          fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 10,
                          borderRadius: 6, padding: '2px 6px',
                        }}>
                          {member.inactiveDays} days inactive
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1B2B3A', lineHeight: 1 }}>
                          {member.nations}
                        </div>
                        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
                          Nations
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1B2B3A', lineHeight: 1 }}>
                          {member.streak}
                        </div>
                        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
                          Streak
                        </div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const currentUid = userProfile?.uid || auth.currentUser?.uid;
                    if (uid === currentUid) return null;
                    const justNudged = nudgedNow[uid];
                    return (
                      <button
                        onClick={() => handleNudge(uid, member.name)}
                        disabled={justNudged}
                        style={{
                          background: 'transparent',
                          border: `1.5px solid ${justNudged ? '#ccc' : '#E06520'}`,
                          borderRadius: 8, padding: '6px 10px',
                          cursor: justNudged ? 'default' : 'pointer',
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 12,
                          color: justNudged ? '#ccc' : '#E06520',
                        }}
                        title={`Nudge ${member.name}`}
                      >
                        <img src="/images/whistle.svg" width={14} height={14} alt="" style={{ verticalAlign: 'middle', opacity: justNudged ? 0.4 : 1 }} />
                        {justNudged ? 'Nudged! 👋' : 'Nudge'}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* Team achievements */}
        {activeTeam && (
          <div style={{ padding: '0 16px 32px' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Team Achievements
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TEAM_ACHIEVEMENTS.map((ach, i) => {
                const earned = (activeTeam.achievements || []).includes(ach.id);
                return (
                  <div key={ach.id} style={{
                    background: '#FFFFFF', borderRadius: 12, padding: '14px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    filter: earned ? 'none' : 'grayscale(1)',
                    opacity: earned ? 1 : 0.4,
                    gridColumn: i === TEAM_ACHIEVEMENTS.length - 1 && TEAM_ACHIEVEMENTS.length % 2 !== 0 ? '1 / -1' : undefined,
                  }}>
                    <span style={{ fontSize: 22 }}>{ach.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#1B2B3A' }}>{ach.label}</div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: '#3E67AC', marginTop: 2 }}>{ach.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No-team safety fallback */}
        {!activeTeam && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <button
              onClick={() => setView('empty')}
              style={{ background: 'none', border: 'none', color: '#3E67AC', fontFamily: 'Montserrat, sans-serif', fontSize: 14, cursor: 'pointer' }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Menu close backdrop */}
        {showTeamMenu && (
          <div
            onClick={() => { setShowTeamMenu(false); setShowRemoveSubmenu(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          />
        )}

        {/* Team updated banner */}
        {teamUpdateBanner && (
          <div style={{
            position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
            background: '#2e7d32', color: '#FFFFFF',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
            borderRadius: 10, padding: '10px 20px', zIndex: 300,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
          }}>
            Team updated ✓
          </div>
        )}

        {/* Edit team sheet */}
        {showEditSheet && (
          <div
            onClick={() => setShowEditSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#FFFFFF', borderRadius: '20px 20px 0 0',
                padding: '24px 20px 36px', maxHeight: '88vh', overflowY: 'auto',
              }}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, color: '#1B2B3A', marginBottom: 20 }}>
                Edit team
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Team name
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setEditError(''); }}
                  maxLength={30}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '2px solid #ECF1EE', borderRadius: 10, padding: '12px 14px',
                    fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: '#1B2B3A', outline: 'none',
                  }}
                />
                {editName.trim().length > 0 && editName.trim().length < 2 && (
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#C62828', marginTop: 4 }}>
                    Name must be at least 2 characters
                  </div>
                )}
                {editError && (
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#C62828', marginTop: 4 }}>
                    {editError}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Choose a kit
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {TEAM_KITS.map(kit => (
                    <div
                      key={kit.id}
                      onClick={() => setEditKit(kit.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        cursor: 'pointer', borderRadius: 10, padding: '8px 4px',
                        background: editKit === kit.id ? 'rgba(0,71,107,0.08)' : 'transparent',
                        boxShadow: editKit === kit.id ? '0 0 0 3px #00476B' : 'none',
                      }}
                    >
                      <KitBadge kitId={kit.id} size={40} />
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 600, color: '#1B2B3A', textAlign: 'center', lineHeight: 1.2 }}>
                        {kit.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <KitBadge kitId={editKit || 'brazil'} size={24} />
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, color: '#1B2B3A' }}>
                    {(TEAM_KITS.find(k => k.id === editKit) || TEAM_KITS[0]).label}
                  </span>
                </div>
              </div>
              <button
                onClick={handleEditTeam}
                disabled={editName.trim().length < 2}
                style={{
                  width: '100%', background: editName.trim().length >= 2 ? '#E06520' : '#ccc',
                  border: 'none', borderRadius: 12, padding: '15px 0',
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
                  color: '#FFFFFF', cursor: editName.trim().length >= 2 ? 'pointer' : 'default',
                  marginBottom: 10,
                }}
              >
                Save changes
              </button>
              <button
                onClick={() => setShowEditSheet(false)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
                  color: '#3E67AC', cursor: 'pointer', padding: '8px 0',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FFFFFF', borderRadius: 20, padding: '28px 24px',
                maxWidth: 320, width: '100%',
                boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1B2B3A', marginBottom: 12 }}>
                Delete team?
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                This will permanently delete <strong>{activeTeam?.name}</strong> for all members.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1, background: 'transparent', border: '2px solid #ECF1EE',
                    borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#1B2B3A',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeam}
                  style={{
                    flex: 1, background: '#E53935', border: 'none',
                    borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#FFFFFF',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove member confirm modal */}
        {confirmRemoveMember && (
          <div
            onClick={() => setConfirmRemoveMember(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FFFFFF', borderRadius: 20, padding: '28px 24px',
                maxWidth: 320, width: '100%',
                boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1B2B3A', marginBottom: 12 }}>
                Remove member?
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                Remove <strong>{confirmRemoveMember.name}</strong> from this team? They'll lose access immediately.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmRemoveMember(null)}
                  style={{
                    flex: 1, background: 'transparent', border: '2px solid #ECF1EE',
                    borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#1B2B3A',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(confirmRemoveMember.uid)}
                  style={{
                    flex: 1, background: '#E53935', border: 'none',
                    borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#FFFFFF',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Choose sheet — create or join */}
        {teamSheetMode === 'choose' && (
          <div
            onClick={() => setTeamSheetMode(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#FFFFFF', borderRadius: '20px 20px 0 0',
                padding: '24px 24px 36px',
              }}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1B2B3A', marginBottom: 20 }}>
                Add a team
              </div>
              <button
                onClick={() => { setTeamSheetMode(null); setView('create'); }}
                style={{
                  width: '100%', background: '#E06520', border: 'none',
                  borderRadius: 12, padding: '14px 0', fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700, fontSize: 15, color: '#FFFFFF', cursor: 'pointer', marginBottom: 12,
                }}
              >
                + Create a team
              </button>
              <button
                onClick={() => { setTeamSheetMode(null); setView('join'); }}
                style={{
                  width: '100%', background: 'transparent',
                  border: '2px solid #00BAF8', borderRadius: 12, padding: '12px 0',
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
                  color: '#00BAF8', cursor: 'pointer',
                }}
              >
                Enter team code
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── CREATE SHEET ── */
  if (view === 'create') {
    return (
      <div style={{ minHeight: '100%', background: '#F5F7F8' }}>
        <div
          onClick={() => setView(teams.length > 0 ? 'myteam' : 'empty')}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#FFFFFF', borderRadius: '20px 20px 0 0',
              padding: '24px 20px 36px', maxHeight: '88vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, color: '#1B2B3A', marginBottom: 20 }}>
              Create a team
            </div>

            {/* Team name */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Team name
              </div>
              <input
                type="text"
                placeholder="e.g. The Praying Eagles"
                value={teamNameInput}
                onChange={e => { setTeamNameInput(e.target.value); setCreateError(''); }}
                maxLength={40}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '2px solid #ECF1EE', borderRadius: 10, padding: '12px 14px',
                  fontFamily: 'Montserrat, sans-serif', fontSize: 15, color: '#1B2B3A', outline: 'none',
                }}
              />
              {createError && (
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#C62828', marginTop: 4 }}>
                  {createError}
                </div>
              )}
            </div>

            {/* Kit picker */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Choose a kit
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {TEAM_KITS.map(kit => (
                  <div
                    key={kit.id}
                    onClick={() => setSelectedKit(kit.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      cursor: 'pointer', borderRadius: 10, padding: '8px 4px',
                      background: selectedKit === kit.id ? 'rgba(0,71,107,0.08)' : 'transparent',
                      boxShadow: selectedKit === kit.id ? '0 0 0 3px #00476B' : 'none',
                    }}
                  >
                    <KitBadge kitId={kit.id} size={40} />
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 600, color: '#1B2B3A', textAlign: 'center', lineHeight: 1.2 }}>
                      {kit.label}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <KitBadge kitId={selectedKit} size={24} />
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600, color: '#1B2B3A' }}>
                  {(TEAM_KITS.find(k => k.id === selectedKit) || TEAM_KITS[0]).label}
                </span>
              </div>
            </div>

            {/* Team code */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Your team code
              </div>
              <div style={{
                background: '#F5F7F8', borderRadius: 10, padding: '14px 16px',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28,
                letterSpacing: 6, color: '#00476B', textAlign: 'center', marginBottom: 10,
              }}>
                {teamCode}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => copyToClipboard(teamCode)}
                  style={{
                    flex: 1, background: '#ECF1EE', border: 'none', borderRadius: 8,
                    padding: '10px 0', fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700, fontSize: 13, color: '#1B2B3A', cursor: 'pointer',
                  }}
                >
                  Copy code
                </button>
                <button
                  onClick={() => copyToClipboard(`https://prayforcup.com/join/${teamCode}`)}
                  style={{
                    flex: 1, background: '#ECF1EE', border: 'none', borderRadius: 8,
                    padding: '10px 0', fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700, fontSize: 13, color: '#1B2B3A', cursor: 'pointer',
                  }}
                >
                  Copy link
                </button>
              </div>
            </div>

            <button
              onClick={handleCreateTeam}
              disabled={!teamNameInput.trim()}
              style={{
                width: '100%', background: teamNameInput.trim() ? '#E06520' : '#ccc',
                border: 'none', borderRadius: 12, padding: '15px 0',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
                color: '#FFFFFF', cursor: teamNameInput.trim() ? 'pointer' : 'default',
                marginBottom: 10,
              }}
            >
              Done — go to my team
            </button>
            <button
              onClick={() => setView(teams.length > 0 ? 'myteam' : 'empty')}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
                color: '#3E67AC', cursor: 'pointer', padding: '8px 0',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── JOIN SHEET ── */
  const joinPreview = joinCodeInput.length === 6;
  return (
    <>
    <div style={{ minHeight: '100%', background: '#F5F7F8' }}>
      <div
        onClick={() => setView(teams.length > 0 ? 'myteam' : 'empty')}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#FFFFFF', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 36px',
          }}
        >
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, color: '#1B2B3A', marginBottom: 20 }}>
            Join a team
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: '#3E67AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Enter team code
            </div>
            <input
              type="text"
              placeholder="e.g. A3X7F2"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))}
              maxLength={6}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '2px solid #ECF1EE', borderRadius: 10, padding: '16px 14px',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28,
                letterSpacing: 6, color: '#00476B', textAlign: 'center', outline: 'none',
              }}
            />
          </div>

          {joinPreviewLoading && (
            <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 16, fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#3E67AC' }}>
              Looking up team…
            </div>
          )}

          {joinPreviewData && !joinPreviewLoading && (
            <div style={{
              background: '#F5F7F8', borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
              border: '2px solid #00BAF8',
            }}>
              <KitBadge kitId={joinPreviewData.kitNation || 'brazil'} size={40} />
              <div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: '#1B2B3A' }}>
                  {joinPreviewData.name}
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: '#3E67AC', marginTop: 3 }}>
                  {joinPreviewData.memberCount} {joinPreviewData.memberCount === 1 ? 'member' : 'members'}
                </div>
              </div>
            </div>
          )}

          {joinPreviewError && !joinPreviewLoading && (
            <div style={{ background: '#FFEBEE', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, color: '#C62828' }}>
              {joinPreviewError}
            </div>
          )}

          {joinSuccess && (
            <div style={{ background: '#e8f5e9', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: '#2e7d32', textAlign: 'center' }}>
              {joinSuccess}
            </div>
          )}

          {joinError === 'no_account' ? (
            <div style={{ background: '#FFF3E0', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#E06520', marginBottom: 10 }}>
                You need an account to join a team
              </div>
              <button
                onClick={() => {
                  try {
                    const gs = JSON.parse(localStorage.getItem('pftc_game') || '{}');
                    localStorage.setItem('pftc_game', JSON.stringify({ ...gs, hasOnboarded: false }));
                  } catch {}
                  window.location.reload();
                }}
                style={{ background: '#E06520', border: 'none', borderRadius: 8, padding: '10px 16px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer' }}
              >
                Sign up free →
              </button>
            </div>
          ) : joinError ? (
            <div style={{ background: '#FFEBEE', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, color: '#C62828' }}>
              {joinError}
            </div>
          ) : null}

          <button
            onClick={() => handleJoinTeam()}
            disabled={!joinPreview || joinLoading || joinPreviewLoading || !!joinPreviewError}
            style={{
              width: '100%', background: (joinPreview && !joinLoading && !joinPreviewLoading && !joinPreviewError) ? '#E06520' : '#ccc',
              border: 'none', borderRadius: 12, padding: '15px 0',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
              color: '#FFFFFF', cursor: (joinPreview && !joinLoading && !joinPreviewLoading && !joinPreviewError) ? 'pointer' : 'default', marginBottom: 10,
            }}
          >
            {joinLoading ? 'Joining…' : 'Join this team'}
          </button>
          <button
            onClick={() => setView(teams.length > 0 ? 'myteam' : 'empty')}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
              color: '#3E67AC', cursor: 'pointer', padding: '8px 0',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    {copyToast && (
      <div style={{
        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        background: '#222', color: '#fff', borderRadius: 10, padding: '10px 20px',
        fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
        zIndex: 2000, whiteSpace: 'nowrap',
      }}>
        Message copied! 📋
      </div>
    )}
    {memberToast && (
      <div style={{
        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        background: '#1B456A', color: '#fff', borderRadius: 10, padding: '10px 20px',
        fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
        zIndex: 2000, whiteSpace: 'nowrap',
      }}>
        {memberToast}
      </div>
    )}
    </>
  );
};

/* ─── ONBOARDING ─── */
const OB = {
  navy:      "#00476B",
  orange:    "#E06520",
  sky:       "#00BAF8",
  lightBlue: "#8ADBFF",
  midBlue:   "#0D68A1",
};

function ObNavyHeader({ children }) {
  return (
    <div style={{
      background: OB.navy,
      clipPath: "ellipse(100% 88% at 50% 0%)",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)",
      paddingBottom: 56,
      paddingLeft: 24,
      paddingRight: 24,
    }}>
      {children}
    </div>
  );
}

function ObOrangeBtn({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%",
      background: OB.orange, color: "#fff", border: "none",
      borderRadius: 14, padding: "18px 24px",
      fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17,
      cursor: "pointer", letterSpacing: 0.3,
      ...style,
    }}>{children}</button>
  );
}

function Onboarding({ onComplete, initialStep = 1, initialJourneyPath = null, setSettingsDisplayName }) {
  const [step, setStep] = useState(initialStep);
  const [journeyPath, setJourneyPath] = useState(initialJourneyPath);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [pendingNamePickerValue, setPendingNamePickerValue] = useState('');
  const [pendingNamePickerData, setPendingNamePickerData] = useState(null);

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // Initialize SocialLogin once on mount so it's ready before the user taps
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SocialLogin.initialize({
        google: { webClientId: process.env.REACT_APP_GOOGLE_WEB_CLIENT_ID },
        apple: { clientId: 'com.globalgates.prayforthecup' },
      }).catch(e => console.log('SocialLogin.initialize error:', e.message));
    }
  }, []);

  function finishOnboarding(opts = {}) {
    onComplete({ journeyMode: journeyPath === true, ...opts });
  }

  const processGoogleUser = async (user) => {
    const displayName = user.displayName?.split(' ')[0] || 'Friend';
    const email = user.email;
    const uid = user.uid;

    let restoredFromFirestore = false;
    let firestoreDisplayName = null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const snapData = snap.data();
        firestoreDisplayName = snapData.displayName || null;
        if (snapData.gameState) {
          try { localStorage.setItem('pftc_game', JSON.stringify({ ...DEFAULT_GAME_STATE, ...snapData.gameState })); } catch {}
          restoredFromFirestore = true;
        }
      }
    } catch (e) { console.log('Firestore read error:', e.message); }

    if (!restoredFromFirestore) {
      const existingGame = JSON.parse(localStorage.getItem('pftc_game') || 'null');
      try {
        await setDoc(doc(db, 'users', uid), {
          displayName, name: displayName, email, createdAt: new Date().toISOString(),
          gameState: existingGame || DEFAULT_GAME_STATE
        }, { merge: true });
      } catch (e) { console.log('Firestore error:', e.message); }
    } else {
      try {
        await setDoc(doc(db, 'users', uid), {
          displayName, name: displayName, email, createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) { console.log('Firestore error:', e.message); }
    }

    if (restoredFromFirestore) {
      const nameToStore = firestoreDisplayName || displayName;
      localStorage.setItem('userProfile', JSON.stringify({ displayName: nameToStore, email, uid, autoPassword: null }));
      setSettingsDisplayName(nameToStore);
    }
    localStorage.setItem('hasOnboarded', 'true');

    console.log('Calling Brevo subscribe for:', email);
    try {
      await fetch('https://prayforthecup.com/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: displayName, listId: 64 })
      });
    } catch (err) { console.log('Brevo error:', err?.message, err?.name, JSON.stringify(err)); }

    setStep(4);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const platform = Capacitor.getPlatform();
      if (platform === 'android' || platform === 'ios') {
        const socialResult = await SocialLogin.login({ provider: 'google', options: {} });
        const idToken = socialResult.result.idToken;
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await processGoogleUser(result.user);
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await processGoogleUser(result.user);
      }
    } catch (e) {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Capacitor.getPlatform() !== 'ios') return;
    setAppleLoading(true);
    try {
      const rawNonce = Math.random().toString(36).substring(2, 18);
      const encoder = new TextEncoder();
      const data = encoder.encode(rawNonce);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedNonce = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const result = await SocialLogin.login({
        provider: 'apple',
        options: {
          scopes: ['email', 'name'],
          nonce: hashedNonce,
        },
      });

      const idToken = result?.result?.idToken;
      const accessToken = result?.result?.accessToken?.token;
      if (!idToken) throw new Error('No identity token from Apple');

      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const credentialOptions = { idToken, rawNonce };
      if (accessToken) credentialOptions.accessToken = accessToken;
      const credential = provider.credential(credentialOptions);

      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      const profile = result?.result?.profile;
      const fullName = (
        ((profile?.givenName || '') + ' ' + (profile?.familyName || '')).trim()
        || user.displayName
        || (user.email || '').split('@')[0]
        || 'Friend'
      );
      await processGoogleUser({ uid: user.uid, displayName: fullName, email: user.email });

      // Show name picker if user hasn't set a name yet
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists() || !snap.data().nameSetByUser) {
          localStorage.setItem('namePickerShown', 'true'); // prevent App-level picker from also firing
          setPendingNamePickerData({ uid: user.uid, email: user.email });
          setPendingNamePickerValue(fullName);
          setShowNamePicker(true);
        }
      } catch {}
    } catch (err) {
      if (err?.message !== 'cancelled') console.error('Apple sign-in error:', err);
    } finally {
      setAppleLoading(false);
    }
  };

  async function handleNamePickerConfirm() {
    const trimmedName = pendingNamePickerValue.trim() || 'Friend';
    const { uid, email } = pendingNamePickerData;
    try {
      await setDoc(doc(db, 'users', uid), { displayName: trimmedName, name: trimmedName, nameSetByUser: true }, { merge: true });
    } catch (e) {}
    const userProfileToSave = { displayName: trimmedName, email, uid, autoPassword: null };
    localStorage.setItem('userProfile', JSON.stringify(userProfileToSave));
    localStorage.setItem('namePickerShown', 'true');
    setSettingsDisplayName(trimmedName);
    setShowNamePicker(false);
    setStep(4);
  }

  function handleNotifAllow() {
    scheduleMatchDayNotifications();
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(() => finishOnboarding());
    } else {
      finishOnboarding();
    }
  }

  // ─── Name Picker (Google Sign-In new users) ───
  if (showNamePicker) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 28,
          width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: OB.navy, marginBottom: 8 }}>
            Choose your display name
          </div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
            This name will be visible to others on your teams
          </div>
          <input
            type="text"
            value={pendingNamePickerValue}
            onChange={e => setPendingNamePickerValue(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              border: `2px solid ${OB.lightBlue}`, background: '#f6fbff',
              fontFamily: 'Montserrat, sans-serif', fontSize: 16, color: OB.navy,
              outline: 'none', boxSizing: 'border-box', marginBottom: 20,
            }}
          />
          <ObOrangeBtn
            onClick={handleNamePickerConfirm}
            style={{ opacity: pendingNamePickerValue.trim() ? 1 : 0.5 }}
          >
            Continue →
          </ObOrangeBtn>
        </div>
      </div>
    );
  }

  // ─── STEP 1 — Welcome ───
  if (step === 1) {
    return (
      <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
        <ObNavyHeader>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
            <div
              style={{
                background: "#fff", borderRadius: 20,
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                width: 220, height: 150,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <img src="/images/pray-cup-logo.png" alt="Pray for the Cup" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
            </div>
          </div>
        </ObNavyHeader>

        <div style={{ padding: "32px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{
            fontFamily: "Libre Baskerville, serif", fontWeight: 700, fontStyle: "italic",
            fontSize: 21, color: OB.navy, lineHeight: 1.6, marginBottom: 10, maxWidth: 300,
          }}>
            "Ask of me, and I will make the nations your heritage."
          </div>
          <div style={{
            fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11,
            color: OB.orange, textTransform: "uppercase", letterSpacing: 2, marginBottom: 24,
          }}>
            Psalm 2:8
          </div>

          <div style={{ width: 52, height: 4, background: OB.orange, borderRadius: 2, marginBottom: 32 }} />

          <div style={{ display: "flex", gap: 36, marginBottom: 32 }}>
            {[["48","Nations"], ["20","Days"], ["1","Goal"]].map(([num, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 38, color: OB.navy, lineHeight: 1 }}>{num}</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 11, color: OB.midBlue, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{
            fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 12,
            color: OB.navy, textTransform: "uppercase", letterSpacing: 1.1,
            marginBottom: 36, maxWidth: 280, lineHeight: 1.6,
          }}>
            A Prayer Guide for the 2026 FIFA World Cup
          </div>

          <ObOrangeBtn onClick={() => setStep(2)}>Begin →</ObOrangeBtn>

          <div style={{ marginTop: 20, textAlign: "center", paddingBottom: 32 }}>
            <img src="/images/gg-wordmark.png" alt="Global Gates" style={{ width: 160, height: "auto", opacity: 0.6, display: "inline-block", marginTop: 16, marginBottom: 24 }} />
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2 — Journey Prompt ───
  if (step === 2) {
    const cards = [
      { title: "Daily Streak", icon: "🔥", desc: "Build a daily prayer habit", bg: OB.navy },
      { title: "Cover the World", icon: "🌍", desc: "Pray for all 48 nations", bg: "#1a5fa8" },
      { title: "Daily Devotionals", icon: "📖", desc: "Deep-dive prayer readings", bg: "#0091bf" },
      { title: "My Team", icon: "⚽", desc: "Track your favourite nations", bg: OB.orange },
    ];

    return (
      <div style={{ minHeight: "100vh", background: "#f0f7ff", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
        <ObNavyHeader>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11,
              color: OB.sky, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14,
            }}>
              48 nations · 20 days of prayer · 1 ultimate goal
            </div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 27, color: "#fff", lineHeight: 1.25, marginBottom: 12 }}>
              Ready to go on an{" "}
              <span style={{ color: "#FF8844" }}>adventure?</span>
            </div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              Build a daily rhythm of prayer that takes you around the world.
            </div>
          </div>
        </ObNavyHeader>

        <div style={{ flex: 1, paddingTop: 24, display: "flex", flexDirection: "column" }}>
          {/* Carousel */}
          <div
            onScroll={e => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / 122);
              setCarouselIdx(Math.max(0, Math.min(3, idx)));
            }}
            style={{
              display: "flex", gap: 12,
              overflowX: "auto", padding: "8px 24px 12px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {cards.map((card, i) => (
              <div key={i} style={{
                width: 110, flexShrink: 0,
                background: card.bg, borderRadius: 16,
                padding: "20px 14px 18px",
                color: "#fff", scrollSnapAlign: "start",
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", minHeight: 150,
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{card.icon}</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 12, lineHeight: 1.3, marginBottom: 8 }}>{card.title}</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 10, opacity: 0.8, lineHeight: 1.5 }}>{card.desc}</div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
            {cards.map((_, i) => (
              <div key={i} style={{
                width: i === carouselIdx ? 18 : 6, height: 6,
                borderRadius: 3,
                background: i === carouselIdx ? OB.orange : "#CBD5E0",
                transition: "all 0.2s",
              }} />
            ))}
          </div>

          <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 10, paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))" }}>
            <ObOrangeBtn onClick={() => { setJourneyPath(true); setStep(3); }}>
              I'm In — Let's Go →
            </ObOrangeBtn>
            <button onClick={() => { setJourneyPath(false); setStep(3); }} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 15,
              color: OB.midBlue, padding: "10px 0", textAlign: "center",
            }}>
              Just pray →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 3a — Register ───
  if (step === 3 && journeyPath) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f7ff", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
        <ObNavyHeader>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11,
              color: OB.sky, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14,
            }}>
              Journey Mode
            </div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 28, color: "#fff", lineHeight: 1.2 }}>
              Join the adventure.
            </div>
          </div>
        </ObNavyHeader>

        <div style={{ flex: 1, padding: "24px 24px", overflowY: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: OB.navy }}>
              Pray daily{" "}
              <span style={{ color: OB.orange }}>·</span>
              {" "}Track your streak{" "}
              <span style={{ color: OB.orange }}>·</span>
              {" "}Build your team
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div>
              <input
                type="text" placeholder="Your name"
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{
                  padding: "16px 18px", borderRadius: 12,
                  border: `2px solid ${OB.lightBlue}`, background: "#f6fbff",
                  fontFamily: "Montserrat, sans-serif", fontSize: 16,
                  outline: "none", color: OB.navy,
                  boxSizing: "border-box", width: "100%",
                }}
              />
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, color: "#888", marginTop: 4 }}>
                This name will be visible to others if you join or create a team.
              </div>
            </div>
            <input
              type="email" placeholder="Email address"
              value={email} onChange={e => { setEmail(e.target.value); setEmailError(""); setMagicLinkSent(false); }}
              style={{
                padding: "16px 18px", borderRadius: 12,
                border: `2px solid ${emailError ? '#e05c2a' : OB.lightBlue}`, background: "#f6fbff",
                fontFamily: "Montserrat, sans-serif", fontSize: 16,
                outline: "none", color: OB.navy,
                boxSizing: "border-box", width: "100%",
              }}
            />
            {emailError && (
              <div style={{ padding: "6px 4px 0" }}>
                {magicLinkSent ? (
                  <div>
                    <div style={{
                      fontFamily: "Montserrat, sans-serif", fontSize: 13,
                      color: "#2a7e4e", fontWeight: 600, marginBottom: 6,
                    }}>
                      Check your email! Tap the link to sign back in. It will open in your browser.
                    </div>
                    <div style={{
                      fontFamily: "Montserrat, sans-serif", fontSize: 12,
                      color: "#888", fontWeight: 500,
                    }}>
                      Don't see it? Check your spam folder.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontFamily: "Montserrat, sans-serif", fontSize: 13,
                      color: "#e05c2a", fontWeight: 600, marginBottom: 10,
                    }}>
                      {emailError}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await sendSignInLinkToEmail(auth, email, {
                            url: 'https://prayforthecup.com/app',
                            handleCodeInApp: true,
                          });
                          try { localStorage.setItem("emailForSignIn", email); } catch {}
                          setMagicLinkSent(true);
                        } catch (err) {
                          console.error("Magic link error:", err);
                        }
                      }}
                      style={{
                        width: "100%", padding: "12px 0", borderRadius: 10,
                        border: `2px solid ${OB.navy}`, background: "transparent",
                        fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14,
                        color: OB.navy, cursor: "pointer",
                      }}
                    >
                      Send me a sign-in link
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <ObOrangeBtn onClick={async () => {
            let storedProfile = {};
            try { storedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}"); } catch {}

            let succeeded = false;
            try {
              let cred;
              let autoPassword = storedProfile.autoPassword;

              if (autoPassword) {
                try {
                  cred = await signInWithEmailAndPassword(auth, email, autoPassword);
                } catch (signInErr) {
                  if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
                    autoPassword = email + '_pftc_' + Date.now();
                    cred = await createUserWithEmailAndPassword(auth, email, autoPassword);
                    await setDoc(doc(db, "users", cred.user.uid), {
                      name: displayName,
                      email: email,
                      createdAt: new Date().toISOString(),
                      gameState: DEFAULT_GAME_STATE,
                    });
                    fetch('https://prayforthecup.com/api/subscribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: email, firstName: displayName, listId: 64 })
                    });
                  } else {
                    throw signInErr;
                  }
                }
              } else {
                autoPassword = email + '_pftc_' + Date.now();
                try {
                  cred = await createUserWithEmailAndPassword(auth, email, autoPassword);
                } catch (createErr) {
                  if (createErr.code === 'auth/email-already-in-use') {
                    setEmailError("An account with this email already exists. Try a different email, or use the same device you signed up with.");
                    return;
                  }
                  throw createErr;
                }
                await setDoc(doc(db, "users", cred.user.uid), {
                  name: displayName,
                  email: email,
                  createdAt: new Date().toISOString(),
                  gameState: DEFAULT_GAME_STATE,
                });
                fetch('https://prayforthecup.com/api/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: email, firstName: displayName, listId: 64 })
                });
              }

              const uid = cred.user.uid;
              try { localStorage.setItem("userProfile", JSON.stringify({ displayName, email, autoPassword, uid })); } catch {}
              succeeded = true;
            } catch (err) {
              console.error("Firebase auth error:", err);
            }

            if (succeeded) setStep(4);
          }}>
            Start My Prayer Journey →
          </ObOrangeBtn>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '16px 0',
            width: '100%'
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Montserrat' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Google Sign-In button */}
          {(() => {
            const spinKeyframe = `@keyframes spin { to { transform: rotate(360deg); } }`;
            if (!document.querySelector('#spin-style')) {
              const style = document.createElement('style');
              style.id = 'spin-style';
              style.textContent = spinKeyframe;
              document.head.appendChild(style);
            }
          })()}
          <button
            onClick={() => { handleGoogleSignIn(); }}
            disabled={googleLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '12px 20px',
              background: googleLoading ? '#e8e8e8' : 'white',
              border: 'none',
              borderRadius: 12,
              fontFamily: 'Montserrat',
              fontSize: 14,
              fontWeight: 700,
              color: '#1B456A',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              marginBottom: 8,
              opacity: googleLoading ? 0.8 : 1,
              transition: 'all 0.2s'
            }}
          >
            {googleLoading ? (
              <>
                <div style={{
                  width: 18,
                  height: 18,
                  border: '2px solid #1B456A',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  flexShrink: 0
                }} />
                Signing in...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {Capacitor.isNativePlatform() && (
            <button
              onClick={handleAppleSignIn}
              disabled={appleLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                fontFamily: 'Montserrat, sans-serif',
                cursor: appleLoading ? 'not-allowed' : 'pointer',
                opacity: appleLoading ? 0.7 : 1,
              }}
            >
              {appleLoading ? 'Signing in...' : <>&#63743; Sign in with Apple</>}
            </button>
          )}

          <div style={{
            fontFamily: "Montserrat, sans-serif", fontSize: 11, color: "#8899AA",
            textAlign: "center", marginBottom: 20, lineHeight: 1.5,
          }}>
            We respect your privacy. No spam, ever.
          </div>

          <button onClick={() => setStep(2)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 14,
            color: OB.midBlue, padding: "8px 0", display: "block", margin: "0 auto",
          }}>← Back</button>
        </div>
      </div>
    );
  }

  // ─── STEP 3b — Just Pray ───
  if (step === 3 && !journeyPath) {
    const features = [
      { icon: "📅", title: "Daily Devotionals", desc: "20 days of prayer readings" },
      { icon: "🌍", title: "All 48 Nations", desc: "Pray for every World Cup nation" },
      { icon: "⚽", title: "Match Schedule", desc: "Full FIFA 2026 schedule" },
    ];
    return (
      <div style={{ minHeight: "100vh", background: "#f0f7ff", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
        <ObNavyHeader>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11,
              color: OB.sky, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14,
            }}>
              You're In
            </div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 28, color: "#fff", lineHeight: 1.2, marginBottom: 14 }}>
              Just you and the nations.
            </div>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontWeight: 700, fontStyle: "italic", fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
              "Pray without ceasing." — 1 Thessalonians 5:17
            </div>
          </div>
        </ObNavyHeader>

        <div style={{ flex: 1, padding: "24px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: "#fff", borderRadius: 14, padding: "16px",
                display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 2px 8px rgba(0,71,107,0.08)",
              }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <div>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: OB.navy }}>{f.title}</div>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: OB.midBlue, marginTop: 2 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <ObOrangeBtn onClick={() => setStep(4)} style={{ marginBottom: 16 }}>
            Let's Pray →
          </ObOrangeBtn>

          <div style={{ background: OB.navy, borderRadius: 16, padding: "20px" }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 12, lineHeight: 1.4 }}>
              Want more? Unlock Journey Mode — free, takes 30 seconds.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {["🔥 Streaks", "🏆 Achievements", "📊 Score", "👥 Team"].map(pill => (
                <span key={pill} style={{
                  background: "rgba(255,255,255,0.15)", borderRadius: 999,
                  padding: "4px 12px", fontFamily: "Montserrat, sans-serif",
                  fontSize: 11, fontWeight: 600, color: "#fff",
                }}>{pill}</span>
              ))}
            </div>
            <button onClick={() => { setJourneyPath(true); setStep(3); }} style={{
              background: OB.orange, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 20px", width: "100%",
              fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14,
              cursor: "pointer",
            }}>
              Join the Adventure →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 4 — Push Notifications ───
  const notifFeatures = [
    { icon: "🌅", title: "Daily Prayer Reminder", desc: "Start each morning in prayer for the nations" },
    { icon: "⚽", title: "Match Day Alerts", desc: "Know when your nations are playing" },
    { icon: "🔥", title: "Streak Protection", desc: "Don't break your prayer streak" },
  ];

  let platformPreview;
  if (isIOS) {
    platformPreview = (
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", marginBottom: 16 }}>
        <div style={{ fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", fontWeight: 600, fontSize: 14, color: "#000", textAlign: "center", marginBottom: 6 }}>
          "Pray for the Cup" Would Like to Send You Notifications
        </div>
        <div style={{ fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", fontSize: 12, color: "#666", textAlign: "center", marginBottom: 18 }}>
          Notifications may include alerts, sounds, and icon badges.
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #E5E5EA" }}>
          <button onClick={() => finishOnboarding()} style={{
            flex: 1, padding: "12px", border: "none", borderRight: "1px solid #E5E5EA",
            background: "transparent", color: "#007AFF",
            fontFamily: "-apple-system, sans-serif", fontSize: 16, cursor: "pointer",
          }}>Don't Allow</button>
          <button onClick={handleNotifAllow} style={{
            flex: 1, padding: "12px", border: "none",
            background: "transparent", color: "#007AFF",
            fontFamily: "-apple-system, sans-serif", fontWeight: 600, fontSize: 16, cursor: "pointer",
          }}>Allow</button>
        </div>
      </div>
    );
  } else if (isAndroid) {
    platformPreview = (
      <div style={{ background: "#fff", borderRadius: 24, padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", marginBottom: 16 }}>
        <div style={{ fontFamily: "Roboto, sans-serif", fontWeight: 500, fontSize: 16, color: "#1C1B1F", marginBottom: 8 }}>
          Allow notifications?
        </div>
        <div style={{ fontFamily: "Roboto, sans-serif", fontSize: 13, color: "#49454F", marginBottom: 20, lineHeight: 1.5 }}>
          Pray for the Cup wants to send you daily prayer reminders.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => finishOnboarding()} style={{
            padding: "10px 20px", borderRadius: 100, border: "none",
            background: "transparent", color: "#6750A4",
            fontFamily: "Roboto, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>No thanks</button>
          <button onClick={handleNotifAllow} style={{
            padding: "10px 20px", borderRadius: 100, border: "none",
            background: "#6750A4", color: "#fff",
            fontFamily: "Roboto, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Allow</button>
        </div>
      </div>
    );
  } else {
    platformPreview = (
      <div style={{
        background: "#fff", borderRadius: 8, padding: "12px 16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <div style={{ flex: 1, fontFamily: "sans-serif", fontSize: 13, color: "#202124", lineHeight: 1.4 }}>
          <strong>Pray for the Cup</strong> wants to send you notifications
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => finishOnboarding()} style={{
            padding: "6px 12px", borderRadius: 4,
            border: "1px solid #ccc", background: "#fff",
            fontSize: 12, cursor: "pointer", color: "#555", fontFamily: "sans-serif",
          }}>Block</button>
          <button onClick={handleNotifAllow} style={{
            padding: "6px 12px", borderRadius: 4, border: "none",
            background: "#1a73e8", fontSize: 12, cursor: "pointer",
            color: "#fff", fontWeight: 600, fontFamily: "sans-serif",
          }}>Allow</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f7ff", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
      <ObNavyHeader>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11,
            color: OB.sky, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14,
          }}>
            One Last Thing
          </div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 28, color: "#fff", lineHeight: 1.2 }}>
            Don't miss a day of prayer.
          </div>
        </div>
      </ObNavyHeader>

      <div style={{ flex: 1, padding: "24px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ textAlign: "center", fontSize: 48, marginBottom: 16 }}>🔔</div>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 15, color: OB.navy, textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
          Get a gentle daily reminder to pray for the nations. We'll never spam you.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {notifFeatures.map(f => (
            <div key={f.title} style={{
              background: "#fff", borderRadius: 14, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 2px 8px rgba(0,71,107,0.08)",
            }}>
              <span style={{ fontSize: 24 }}>{f.icon}</span>
              <div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: OB.navy }}>{f.title}</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: OB.midBlue, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {platformPreview}

        <button onClick={() => finishOnboarding()} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 14,
          color: OB.midBlue, padding: "8px 0", display: "block", margin: "0 auto",
        }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ─── FINAL WHISTLE SHARE MODAL ─── */
function FinalWhistleShareModal({ onClose }) {
  const [cardDataUrl, setCardDataUrl] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let objectUrl;
    generateShareCard('final_whistle', {}).then(blob => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setCardDataUrl(objectUrl);
    }).catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await generateShareCard('final_whistle', {});
      const file = new File([blob], 'pray-for-the-cup.png', { type: 'image/png' });
      const text = 'I just prayed for all 48 nations at the 2026 FIFA World Cup! 🏆🌍 prayforthecup.com #PrayForTheCup';
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else if (navigator.share) {
        await navigator.share({ text });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'pray-for-the-cup.png'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
    setSharing(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,20,40,0.95)', zIndex:4000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontFamily:'Montserrat, sans-serif', fontWeight:900, fontSize:28, color:'#fff', textAlign:'center', marginBottom:8 }}>The Final Whistle 🏆</div>
      <div style={{ fontFamily:'Montserrat, sans-serif', fontSize:14, color:'#8ADBFF', textAlign:'center', marginBottom:24, lineHeight:1.5 }}>
        You prayed for all 48 nations at the 2026 World Cup!
      </div>
      {cardDataUrl
        ? <img src={cardDataUrl} alt="Share card preview" style={{ width:280, borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', marginBottom:24 }} />
        : <div style={{ width:280, height:498, borderRadius:12, background:'#00476B', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ color:'#8ADBFF', fontFamily:'Montserrat, sans-serif', fontSize:14 }}>Generating…</div>
          </div>
      }
      <button
        onClick={handleShare}
        disabled={sharing}
        style={{ background:'#E06520', color:'#fff', border:'none', borderRadius:14, fontFamily:'Montserrat, sans-serif', fontWeight:800, fontSize:16, padding:'16px 0', width:'100%', maxWidth:320, cursor:'pointer', opacity:sharing ? 0.7 : 1 }}
      >
        Share This Moment
      </button>
      <button
        onClick={onClose}
        style={{ background:'none', border:'none', color:'rgba(255,255,255,0.6)', fontFamily:'Montserrat, sans-serif', fontSize:14, marginTop:16, cursor:'pointer' }}
      >
        Close
      </button>
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function App() {
  const LAUNCH_DATE = new Date('2026-06-11');
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'
    || localStorage.getItem('pftc_preview') === 'true';
  const isLaunched = new Date() >= LAUNCH_DATE;
  const [previewUnlocked, setPreviewUnlocked] = useState(false);
  const showApp = isLaunched || isPreview || previewUnlocked;
  const daysRemaining = Math.ceil((LAUNCH_DATE - new Date()) / 86400000);
  const logoTapTimes = useRef([]);
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(() => isSignInWithEmailLink(auth, window.location.href));

  const [tab, setTab] = useState("digest");
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showFinalWhistleShare, setShowFinalWhistleShare] = useState(false);
  const [gameState, updateGameState] = useGameState();
  const [pendingToast, setPendingToast] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [showNationNudge, setShowNationNudge] = useState(false);
  const [pendingNationPray, setPendingNationPray] = useState(null);
  const nationTapTimes = useRef([]);
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userProfile") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserProfile(prev => {
          const next = { ...prev, uid: firebaseUser.uid, email: firebaseUser.email || prev.email };
          try { localStorage.setItem("userProfile", JSON.stringify(next)); } catch {}
          return next;
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let emailForSignIn = "";
    try { emailForSignIn = localStorage.getItem("emailForSignIn") || ""; } catch {}
    if (!emailForSignIn) {
      setIsProcessingMagicLink(false);
      return;
    }
    signInWithEmailLink(auth, emailForSignIn, window.location.href)
      .then((result) => {
        const uid = result.user.uid;
        const email = result.user.email || emailForSignIn;
        setUserProfile(prev => {
          const next = { ...prev, uid, email, displayName: prev.displayName || "" };
          try { localStorage.setItem("userProfile", JSON.stringify(next)); } catch {}
          return next;
        });
        updateGameState({ hasOnboarded: true });
        try { localStorage.removeItem("emailForSignIn"); } catch {}
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((err) => {
        console.error("Magic link sign-in error:", err);
      })
      .finally(() => {
        setIsProcessingMagicLink(false);
      });
  }, [updateGameState]);
  useEffect(() => {
    if (!userProfile?.uid) return;
    if (localStorage.getItem('namePickerShown')) return;
    const stored = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (stored.autoPassword) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userProfile.uid));
        if (snap.exists() && snap.data().nameSetByUser) {
          localStorage.setItem('namePickerShown', 'true');
          return;
        }
      } catch {}
      setAppNamePickerValue(stored.displayName || '');
      setShowAppNamePicker(true);
    })();
  }, [userProfile?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameEditValue, setNameEditValue] = useState('');
  const [nameEditError, setNameEditError] = useState('');
  const [settingsDisplayName, setSettingsDisplayName] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userProfile") || "{}").displayName || ''; } catch { return ''; }
  });
  const [notifTime, setNotifTime] = useState(() => localStorage.getItem('notificationTime') || '08:00');
  const [notifTimeConfirm, setNotifTimeConfirm] = useState(false);
  const [showTutorialVideo, setShowTutorialVideo] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);
  const [showAppNamePicker, setShowAppNamePicker] = useState(false);
  const [appNamePickerValue, setAppNamePickerValue] = useState('');

  async function handleAppNamePickerConfirm() {
    const trimmed = appNamePickerValue.trim() || 'Friend';
    const uid = userProfile?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'users', uid), { displayName: trimmed, name: trimmed, nameSetByUser: true }, { merge: true });
    } catch {}
    const stored = JSON.parse(localStorage.getItem('userProfile') || '{}');
    stored.displayName = trimmed;
    localStorage.setItem('userProfile', JSON.stringify(stored));
    localStorage.setItem('namePickerShown', 'true');
    localStorage.setItem('nameSetByUser', 'true');
    setUserProfile(prev => ({ ...prev, displayName: trimmed }));
    setSettingsDisplayName(trimmed);
    setShowAppNamePicker(false);
  }

  function handleOnboardingComplete({ journeyMode = false } = {}) {
    updateGameState({ hasOnboarded: true, journeyMode });
  }

  function handleGameStateUpdate(changes) {
    updateGameState(changes);
    const nextState = { ...gameState, ...changes };
    const newlyEarned = checkAchievements(nextState);
    if (newlyEarned.length > 0) {
      updateGameState({ goalsAchieved: [...(gameState.goalsAchieved || []), ...newlyEarned] });
      if (userProfile?.uid && nextState.journeyMode) {
        setToastQueue(q => [...q, ...newlyEarned]);
      }
      if (newlyEarned.includes('final_whistle')) setShowFinalWhistleShare(true);
    }
    if ((nextState.prayedNations || []).length !== (gameState.prayedNations || []).length) {
      const uid = userProfile?.uid || auth.currentUser?.uid;
      if (uid) {
        const name = userProfile?.displayName || 'Anonymous';
        const initials = name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2) || '?';
        for (const team of (nextState.teams || [])) {
          syncMemberToTeam(team.id, uid, {
            name,
            initials,
            role: team.role,
            nations: (nextState.prayedNations || []).length,
            streak: nextState.streakCount || 0,
            inactiveDays: 0,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    }
  }

  function saveNationPrayer(nation) {
    handleGameStateUpdate({ prayedNations: [...(gameState.prayedNations || []), nation.n] });
  }

  function handleNationPray(nation) {
    const now = Date.now();
    nationTapTimes.current = nationTapTimes.current.filter(t => now - t < 120000);
    nationTapTimes.current.push(now);
    if (nationTapTimes.current.length >= 5) {
      setPendingNationPray(nation);
      setShowNationNudge(true);
      return;
    }
    saveNationPrayer(nation);
  }

  useEffect(() => {
    if (gameState.hasOnboarded && !localStorage.getItem('pftc_tooltips_done')) {
      setShowTutorialVideo(true);
    }
  }, [gameState.hasOnboarded]);

  useEffect(() => {
    if (!gameState.hasOnboarded) return;
    if (new Date() >= new Date('2026-07-20')) return;
    scheduleMatchDayNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.hasOnboarded]);

  useEffect(() => {
    if (pendingJoinCode && gameState.hasOnboarded) {
      setTab('teams');
    }
  }, [pendingJoinCode, gameState.hasOnboarded, tab]);

  useEffect(() => {
    const joinCode = new URLSearchParams(window.location.search).get('join');
    if (joinCode) {
      setPendingJoinCode(joinCode.trim().toUpperCase());
      window.history.replaceState({}, '', '/app');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (toastQueue.length > 0 && pendingToast === null) {
      triggerHaptic('heavy');
      setTimeout(() => triggerHaptic('heavy'), 150);
      setPendingToast(toastQueue[0]);
      setToastQueue(q => q.slice(1));
    }
  }, [toastQueue, pendingToast]);

  useEffect(() => {
    fetch('/schedule-overrides.json')
      .then(r => r.json())
      .then(data => {
        if (data.overrides && data.overrides.length > 0) {
          data.overrides.forEach(override => {
            const idx = RAW_SCHEDULE.findIndex(day => day.d === override.d);
            if (idx !== -1) {
              RAW_SCHEDULE[idx] = { ...RAW_SCHEDULE[idx], ...override };
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!showApp) {
    return (
      <div style={{
        minHeight: "100vh", background: "#00476B",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "Montserrat, sans-serif", padding: "40px 24px", boxSizing: "border-box",
      }}>
        <style>{FONTS}</style>
        <img
          src="/images/pray-cup-logo.png"
          alt="Pray for the Cup"
          style={{ width: 200, marginBottom: 32, WebkitTapHighlightColor: 'transparent', cursor: 'default' }}
          onClick={() => {
            const now = Date.now();
            logoTapTimes.current = [...logoTapTimes.current, now].filter(t => now - t <= 3000);
            if (logoTapTimes.current.length >= 5) {
              logoTapTimes.current = [];
              localStorage.setItem('pftc_preview', 'true');
              setPreviewUnlocked(true);
            }
          }}
        />
        <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", textAlign: "center", marginBottom: 12 }}>
          Coming June 11, 2026
        </div>
        <div style={{ fontSize: 16, color: "#8ADBFF", textAlign: "center", marginBottom: 32, maxWidth: 300 }}>
          A prayer guide for the 2026 FIFA World Cup
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
          {daysRemaining}
        </div>
        <div style={{ fontSize: 13, color: "#8ADBFF", marginTop: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Days to go
        </div>
        <div style={{ flex: 1 }} />
        <img src="/images/gg-wordmark.png" alt="Global Gates" style={{ width: 140, opacity: 0.7 }} />
      </div>
    );
  }

  if (!gameState.hasOnboarded || showSignIn) {
    return (
      <>
        <style>{FONTS}</style>
        <style>{`* { -webkit-tap-highlight-color: transparent; } body { margin: 0; background: #ffffff; } ::-webkit-scrollbar { display: none; } button { -webkit-appearance: none; } input { -webkit-appearance: none; }`}</style>
        <Onboarding
          initialStep={showSignIn ? 3 : 1}
          initialJourneyPath={showSignIn ? true : null}
          onComplete={showSignIn ? () => setShowSignIn(false) : handleOnboardingComplete}
          setSettingsDisplayName={setSettingsDisplayName}
        />
      </>
    );
  }

  if (isProcessingMagicLink) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#00476B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          fontSize: 16, color: '#fff', opacity: 0.8,
        }}>
          Signing you in…
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${C.brightGray}; }
        ::-webkit-scrollbar { display: none; }
        button { -webkit-appearance: none; }
        input { -webkit-appearance: none; }
      `}</style>

      <div style={{
        maxWidth: 520,
        margin: "0 auto",
        minHeight: "100vh",
        background: C.brightGray,
        display: "flex",
        flexDirection: "column",
      }}>

        {/* App Header */}
        <div style={{
          background: "linear-gradient(135deg, #1B456A 0%, #2a5a8a 50%, #1B456A 100%)",
          padding: "env(safe-area-inset-top, 12px) 20px 0",
          position: "relative",
          overflow: "hidden",
        }}>
          <img
            src="/images/global-gates-logo-white-cityscape.png"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "auto",
              opacity: 0.07,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: "14px 0 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <img
                src="/images/pray-cup-logo-white.png"
                alt="Pray for the Cup"
                style={{
                  height: 36,
                  width: "auto",
                  marginBottom: 6,
                  display: "block",
                }}
              />

              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 26, color: C.white, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.25)", letterSpacing: 0.3 }}>
                Pray for the Cup
              </div>
              <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 5, fontStyle: "italic" }}>
                2026 FIFA World Cup Missions Resource
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <button onClick={() => setShowSettings(true)} style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                lineHeight: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              {gameState.streakCount > 0 && (
                <div style={{
                  background: C.orange,
                  color: C.white,
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 999,
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                }}>
                  🔥 {gameState.streakCount}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${C.orange}, transparent)`
        }} />

        {/* Home Screen Banner */}
        {showBanner && !Capacitor.isNativePlatform() && <HomeScreenBanner onDismiss={() => setShowBanner(false)} />}

        {/* Tab Bar */}
        <div style={{ background: C.indigo, padding: "8px 0 0" }}>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px", display: "flex", margin: "0 16px 12px" }}>
            {[
              { id: "digest", label: "🏠  Home" },
              { id: "nations", label: "🌍  All Nations" },
              { id: "teams", label: "🏆  Teams" },
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedDayIdx(null); }} style={{
                flex: 1,
                background: tab === t.id ? C.orange : "transparent",
                border: "none",
                borderRadius: 8,
                padding: "10px 8px",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: tab === t.id ? "#fff" : "rgba(255,255,255,0.65)",
                cursor: "pointer",
                textAlign: "center",
                letterSpacing: 0.2,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "digest" ? (
            selectedDayIdx !== null
              ? <DailyDigest
                  key={selectedDayIdx}
                  initialDay={selectedDayIdx}
                  onBack={() => setSelectedDayIdx(null)}
                  gameState={gameState}
                  updateGameState={handleGameStateUpdate}
                  onPray={handleNationPray}
                  userProfile={userProfile}
                  onSignIn={() => setShowSignIn(true)}
                />
              : <DigestHome gameState={gameState} onCardTap={setSelectedDayIdx} onOpenSettings={() => setShowSettings(true)} />
          ) : tab === "teams" ? (
            (userProfile?.uid && (gameState.teams || []).length > 0) ? (
              <TeamsTab gameState={gameState} updateGameState={updateGameState} userProfile={userProfile} autoJoinCode={pendingJoinCode} onAutoJoinConsumed={() => setPendingJoinCode(null)} />
            ) : !userProfile?.uid ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: C.indigo, marginBottom: 8 }}>Sign in to join or create a team</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.blue, marginBottom: 24, lineHeight: 1.5 }}>Pray with others and track collective progress across all 48 nations.</div>
                <button
                  onClick={() => setShowSignIn(true)}
                  style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 12, padding: "15px 32px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                >Sign in →</button>
              </div>
            ) : !gameState.journeyMode ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: C.indigo, marginBottom: 8 }}>Activate Journey Mode to join or create a team</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.blue, marginBottom: 24, lineHeight: 1.5 }}>Turn on Journey Mode in Settings to pray with others and track collective progress.</div>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 12, padding: "15px 32px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                >Open Settings →</button>
              </div>
            ) : (
              <TeamsTab gameState={gameState} updateGameState={updateGameState} userProfile={userProfile} autoJoinCode={pendingJoinCode} onAutoJoinConsumed={() => setPendingJoinCode(null)} />
            )
          ) : (
            <AllNations gameState={gameState} updateGameState={handleGameStateUpdate} onPray={handleNationPray} />
          )}
        </div>

        <AchievementToast achievement={pendingToast} onDismiss={() => setPendingToast(null)} />
        <NationIntegrityNudge
          nation={showNationNudge ? pendingNationPray : null}
          onConfirm={() => {
            saveNationPrayer(pendingNationPray);
            nationTapTimes.current = [];
            setShowNationNudge(false);
            setPendingNationPray(null);
          }}
          onCancel={() => {
            setShowNationNudge(false);
            setPendingNationPray(null);
          }}
        />

        {/* Settings Modal */}
        {showSettings && (
          <div
            onClick={() => setShowSettings(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                background: C.white, borderRadius: "20px 20px 0 0",
                padding: 24, maxHeight: "60vh", overflowY: "auto",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: C.indigo }}>Settings</span>
                <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: C.indigo, padding: 4 }}>✕</button>
              </div>

              {/* Journey Mode row */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Prayer Journey</div>
                {userProfile?.uid ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>Journey Mode</div>
                      <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>Track streaks, achievements, and your prayer score</div>
                    </div>
                    <ToggleSwitch value={gameState.journeyMode} onToggle={() => {
                      const turningOn = !gameState.journeyMode;
                      updateGameState({ journeyMode: turningOn });
                      if (turningOn) { setTab("digest"); setSelectedDayIdx(null); }
                    }} />
                  </div>
                ) : (
                  <div style={{ background: C.brightGray, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.blue }}>Sign in below to activate Prayer Journey</div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: C.brightGray, margin: "0 0 20px" }} />

              {/* Account row */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Account</div>
                {userProfile?.uid && userProfile?.email ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 20, marginRight: 12 }}>👤</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>{settingsDisplayName}</div>
                        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>Display name</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 20, marginRight: 12 }}>✉️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>{userProfile.email}</div>
                        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>Account email</div>
                      </div>
                    </div>
                    {/* Change Display Name row */}
                    <div>
                      {!showNameEdit ? (
                        <button
                          onClick={() => { setNameEditValue(settingsDisplayName); setNameEditError(''); setShowNameEdit(true); }}
                          style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "left" }}
                        >
                          <span style={{ fontSize: 20, marginRight: 12 }}>✏️</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>Change Display Name</div>
                          </div>
                          <span style={{ fontSize: 18, color: C.blue, marginLeft: 8 }}>›</span>
                        </button>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input
                            value={nameEditValue}
                            onChange={e => setNameEditValue(e.target.value)}
                            maxLength={40}
                            style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.blue}`, color: C.indigo, outline: "none", width: "100%", boxSizing: "border-box" }}
                            autoFocus
                          />
                          {nameEditError && <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#e03030" }}>{nameEditError}</div>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={async () => {
                                const trimmed = nameEditValue.trim();
                                if (!trimmed) return;
                                if (containsBlockedWord(trimmed)) {
                                  setNameEditError("That name isn't allowed — please choose another");
                                  return;
                                }
                                try {
                                  const stored = JSON.parse(localStorage.getItem("userProfile") || "{}");
                                  stored.displayName = trimmed;
                                  localStorage.setItem("userProfile", JSON.stringify(stored));
                                  setSettingsDisplayName(trimmed);
                                  if (userProfile?.uid) {
                                    try { await updateDoc(doc(db, "users", userProfile.uid), { displayName: trimmed }); } catch {}
                                  }
                                  setShowNameEdit(false);
                                  setNameEditError('');
                                } catch {}
                              }}
                              style={{ flex: 1, background: "#E06520", border: "none", borderRadius: 8, padding: "10px 0", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer" }}
                            >Save</button>
                            <button
                              onClick={() => { setShowNameEdit(false); setNameEditError(''); }}
                              style={{ flex: 1, background: "rgba(0,0,0,0.08)", border: "none", borderRadius: 8, padding: "10px 0", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: C.indigo, cursor: "pointer" }}
                            >Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowSettings(false); setShowSignIn(true); }}
                    style={{ display: "flex", alignItems: "center", cursor: "pointer", background: "none", border: "none", padding: 0, width: "100%", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 20, marginRight: 12 }}>👤</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>Sign In / Register</div>
                      <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>Save your progress and track your prayer journey</div>
                    </div>
                    <span style={{ fontSize: 18, color: C.blue, marginLeft: 8 }}>›</span>
                  </button>
                )}
              </div>

              {/* Daily reminder time — only shown after onboarding */}
              {gameState.hasOnboarded && (
                <>
                  <div style={{ height: 1, background: C.brightGray, margin: "0 0 20px" }} />
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Notifications</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1, marginRight: 16 }}>
                        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>Daily reminder</div>
                        <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>
                          {(() => {
                            const [h, m] = notifTime.split(':').map(Number);
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
                          })()}
                        </div>
                        {notifTimeConfirm && (
                          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#2e7d32", marginTop: 4 }}>Reminders updated ✓</div>
                        )}
                      </div>
                      <input
                        type="time"
                        value={notifTime}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) return;
                          setNotifTime(val);
                          localStorage.setItem('notificationTime', val);
                          scheduleMatchDayNotifications();
                          setNotifTimeConfirm(true);
                          setTimeout(() => setNotifTimeConfirm(false), 3000);
                        }}
                        style={{
                          fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.indigo,
                          border: `1px solid ${C.blue}`, borderRadius: 8, padding: "8px 10px",
                          background: "#fff", cursor: "pointer", outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Version line */}
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, color: C.blue, textAlign: "center", marginTop: 20 }}>
                Pray for the Cup · prayforthecup.com
              </div>

              {/* Privacy Policy link */}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <a
                  href="https://prayforthecup.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#00BAF8", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.textDecoration = "underline"}
                  onMouseLeave={e => e.target.style.textDecoration = "none"}
                >
                  Privacy Policy
                </a>
              </div>

              {/* Sign out */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  style={{
                    width: '100%', background: 'transparent',
                    border: '1px solid #ff6b6b', borderRadius: 10,
                    padding: '11px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  🚪 Sign out
                </button>
              </div>

              {/* About & Credits link */}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <span
                  onClick={() => { setShowSettings(false); setShowAbout(true); }}
                  style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#00BAF8", textDecoration: "underline", cursor: "pointer" }}
                >
                  About &amp; Credits
                </span>
              </div>

              {/* Replay tutorial link */}
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <button
                  onClick={() => {
                    localStorage.removeItem('pftc_tooltips_done');
                    setShowTutorialVideo(true);
                    setShowSettings(false);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#00BAF8", padding: 0 }}
                  onMouseEnter={e => e.target.style.textDecoration = "underline"}
                  onMouseLeave={e => e.target.style.textDecoration = "none"}
                >
                  Replay tutorial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sign out confirm modal */}
        {showSignOutConfirm && createPortal(
          <div
            onClick={() => setShowSignOutConfirm(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FFFFFF', borderRadius: 20, padding: '28px 24px',
                maxWidth: 320, width: '100%',
                boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#1B2B3A', marginBottom: 12 }}>
                Sign out?
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                You'll lose access to your streak and team until you sign back in.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  style={{
                    flex: 1, background: 'transparent', border: '2px solid #ECF1EE',
                    borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#1B2B3A',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await signOut(auth).catch(() => {});
                    localStorage.clear();
                    window.location.reload();
                  }}
                  style={{
                    flex: 1, background: '#ff6b6b', border: 'none',
                    borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#FFFFFF',
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showFinalWhistleShare && <FinalWhistleShareModal onClose={() => setShowFinalWhistleShare(false)} />}

        {/* About & Credits Modal */}
        {showAbout && (
          <div
            onClick={() => setShowAbout(false)}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "#00476B", display: "flex", flexDirection: "column" }}
          >
            {/* Sticky header */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
                paddingBottom: 16, paddingLeft: 20, paddingRight: 20,
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: "#FFFFFF" }}>About &amp; Credits</span>
              <button
                onClick={() => setShowAbout(false)}
                style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#FFFFFF", padding: 4 }}
              >✕</button>
            </div>

            {/* Scrollable content */}
            <div
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, overflowY: "auto", padding: "24px 20px 40px" }}
            >
              {/* App blurb */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 700, color: "#00BAF8", marginBottom: 8 }}>Pray for the Cup</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "#FFFFFF", lineHeight: 1.6 }}>
                  A World Cup 2026 prayer guide connecting believers to the nations — and to the unreached peoples attending the tournament. Built by Global Gates.
                </div>
              </div>

              {/* Contributors */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 700, color: "#00BAF8", marginBottom: 8 }}>Contributors</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "#FFFFFF", lineHeight: 2 }}>
                  <div>App Design &amp; Development — [coming soon]</div>
                  <div>Content &amp; Devotionals — [coming soon]</div>
                  <div>Nation Research — [coming soon]</div>
                  <div>Prayer Points — [coming soon]</div>
                </div>
              </div>

              {/* Scripture */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 700, color: "#00BAF8", marginBottom: 8 }}>Scripture</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, color: "#8ADBFF", lineHeight: 1.7 }}>
                  Scripture quotations taken from the Holy Bible, New International Version®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc. Used by permission. All rights reserved worldwide.
                </div>
              </div>

              {/* Global Gates */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 700, color: "#00BAF8", marginBottom: 8 }}>A Global Gates Ministry</div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "#FFFFFF", lineHeight: 1.6, marginBottom: 8 }}>
                  Global Gates mobilizes the Church to reach diaspora communities in gateway cities worldwide.
                </div>
                <a
                  href="https://globalgates.info"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "#E06520", fontWeight: 600, textDecoration: "none" }}
                >
                  globalgates.info
                </a>
              </div>

              {/* Version */}
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, color: "#8ADBFF", textAlign: "center", marginTop: 16 }}>
                Pray for the Cup · v1.0 · 2026
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          background: C.indigo,
          padding: "14px 20px calc(14px + env(safe-area-inset-bottom, 0px))",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, color: "rgba(255,255,255,0.7)", fontStyle: "italic", marginBottom: 4 }}>
            "Ask of me, and I will make the nations your heritage." — Ps. 2:8
          </div>
          <a href="https://globalgates.info" target="_blank" rel="noreferrer" style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontWeight: 600 }}>
            globalgates.info
          </a>
        </div>
      </div>

      {showTutorialVideo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <video
            src="/videos/tutorial.mp4"
            autoPlay
            muted
            playsInline
            controls={false}
            style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
          />
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div
              onClick={() => { localStorage.setItem('pftc_tooltips_done', 'true'); setShowTutorialVideo(false); }}
              style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer", marginBottom: 14 }}
            >
              Skip
            </div>
            <button
              onClick={() => { localStorage.setItem('pftc_tooltips_done', 'true'); setShowTutorialVideo(false); }}
              style={{ background: C.orange, border: "none", borderRadius: 12, padding: "14px 40px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", cursor: "pointer" }}
            >
              Got it 🙏
            </button>
          </div>
        </div>
      )}

      {showAppNamePicker && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 24px', maxWidth: 340, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, color: C.indigo, marginBottom: 8 }}>Choose your display name</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: C.blue, marginBottom: 20, lineHeight: 1.6 }}>This name will be visible to others on your teams.</div>
            <input
              value={appNamePickerValue}
              onChange={e => setAppNamePickerValue(e.target.value)}
              maxLength={40}
              autoFocus
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.blue}`, color: C.indigo, outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
            />
            <button
              onClick={handleAppNamePickerConfirm}
              style={{ width: '100%', background: C.orange, border: 'none', borderRadius: 12, padding: '14px 0', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', cursor: 'pointer' }}
            >Continue →</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
