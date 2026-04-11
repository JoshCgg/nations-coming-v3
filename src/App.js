import { useState, useEffect, useRef } from "react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
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

const JOURNEY_MODE_DEFAULT = false;

/* ─── ACHIEVEMENT DEFINITIONS ───────────────────────────────────
   Each achievement has:
     id       — unique key, stored in localStorage when earned
     label    — display name shown to user
     icon     — emoji displayed alongside the achievement
     desc     — short description of what it means
     check()  — function that receives (gameState) and returns
                true when the achievement should be awarded.
                Not wired up yet — just defined here for planning.
   ──────────────────────────────────────────────────────────────── */

const ACHIEVEMENTS = [
  {
    id:    "first_touch",
    label: "First Touch",
    icon:  "⚽",
    desc:  "Prayed for your first nation",
    check: (gs) => gs.prayedNations.length >= 1,
  },
  {
    id:    "hat_trick",
    label: "Hat Trick",
    icon:  "🎩",
    desc:  "3 days of prayer in a row",
    check: (gs) => gs.streakCount >= 3,
  },
  {
    id:    "clean_sheet",
    label: "Clean Sheet",
    icon:  "🧤",
    desc:  "Completed a full day — devotional, prayer, and check-in",
    check: (gs) => gs.fullDaysCompleted >= 1,
  },
  {
    id:    "golden_boot",
    label: "Golden Boot",
    icon:  "🥇",
    desc:  "7 days of prayer in a row",
    check: (gs) => gs.streakCount >= 7,
  },
  {
    id:    "full_squad",
    label: "Full Squad",
    icon:  "🌍",
    desc:  "Prayed for every nation in one region",
    check: (gs) => {
      // Check if all nations in any single region have been prayed for
      const regions = ["Americas", "Europe", "Africa", "Asia", "Oceania"];
      return regions.some(region => {
        const nationsInRegion = RAW_COUNTRIES.filter(c => c.r === region).map(c => c.n);
        return nationsInRegion.every(n => gs.prayedNations.includes(n));
      });
    },
  },
  {
    id:    "world_tour",
    label: "World Tour",
    icon:  "🗺️",
    desc:  "Prayed for at least one nation on every continent",
    check: (gs) => {
      const regions = ["Americas", "Europe", "Africa", "Asia", "Oceania"];
      return regions.every(region => {
        const nationsInRegion = RAW_COUNTRIES.filter(c => c.r === region).map(c => c.n);
        return nationsInRegion.some(n => gs.prayedNations.includes(n));
      });
    },
  },
  {
    id:    "through_the_groups",
    label: "Through the Groups",
    icon:  "📋",
    desc:  "Checked in for all 17 group stage days",
    check: (gs) => gs.checkedInDays.length >= 17,
  },
  {
    id:    "final_whistle",
    label: "The Final Whistle",
    icon:  "🏆",
    desc:  "Prayed for all 48 nations — the Nations Trophy unlocks",
    check: (gs) => gs.prayedNations.length >= 48,
  },
  {
    id:    "sent",
    label: "Sent",
    icon:  "✝️",
    desc:  "Completed all 20 devotionals — you answered the call",
    check: (gs) => gs.completedDevotionals.length >= 20,
  },
];

/* ─── TROPHY STATES ──────────────────────────────────────────────
   The trophy builds progressively as achievements are earned.
   State 0 = nothing shown. State 4 = full gold trophy + share unlocks.
   This drives the SVG reveal on the My Journey tab (not yet built).
   ──────────────────────────────────────────────────────────────── */

function getTrophyState(gameState) {
  if (!gameState) return 0;
  const earned = gameState.goalsAchieved || [];
  if (earned.includes("final_whistle")) return 4; // Full gold trophy
  if (earned.includes("through_the_groups")) return 3; // Base + stem + dark globe
  if (earned.includes("hat_trick")) return 2;          // Base + stem
  if (earned.includes("first_touch")) return 1;        // Base only
  return 0;
}

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

const STORAGE_KEY = "pftc_game";

const DEFAULT_GAME_STATE = {
  journeyMode:          JOURNEY_MODE_DEFAULT,
  prayedNations:        [],
  checkedInDays:        [],
  completedDevotionals: [],
  fullDaysCompleted:    0,
  streakCount:          0,
  lastCheckIn:          null,
  goalsAchieved:        [],
};

function useGameState() {
  const [gameState, setGameState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_GAME_STATE, ...JSON.parse(stored) } : DEFAULT_GAME_STATE;
    } catch {
      return DEFAULT_GAME_STATE;
    }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch {
      // localStorage unavailable (private browsing, etc.) — fail silently
    }
  }, [gameState]);

  // Updater: merges partial updates and checks for newly earned achievements
  function updateGameState(partial) {
    setGameState(prev => {
      const next = { ...prev, ...partial };

      // Check for any newly earned achievements
      const newlyEarned = ACHIEVEMENTS
        .filter(a => !next.goalsAchieved.includes(a.id) && a.check(next))
        .map(a => a.id);

      if (newlyEarned.length > 0) {
        next.goalsAchieved = [...next.goalsAchieved, ...newlyEarned];
      }

      return next;
    });
  }

  return [gameState, updateGameState];
}

/* ═══════════════════════════════════════════════════════════════
   END OF GAMIFICATION SCAFFOLDING
   Everything below this line is identical to v2.
   ═══════════════════════════════════════════════════════════════ */

/* ─── ALL NATIONS DATA ─── */
const RAW_COUNTRIES = [
  // Americas (13)
  { n:"USA",          f:"🇺🇸", r:"Americas", cf:"CONCACAF", pop:"335M", rel:"Christianity", u:25, ug:["Arab Americans","South Asian Americans","Somali Americans"], cap:"Washington D.C.", lang:"English, Spanish", m:"The US hosts millions of unreached immigrants—among the world's greatest mission opportunities without leaving home." },
  { n:"Canada",       f:"🇨🇦", r:"Americas", cf:"CONCACAF", pop:"38M",  rel:"Christianity", u:18, ug:["South Asian Canadians","Chinese Canadians","Afghan refugees"], cap:"Ottawa", lang:"English, French", m:"Canada's cities are home to growing diaspora communities from least-reached nations." },
  { n:"Mexico",       f:"🇲🇽", r:"Americas", cf:"CONCACAF", pop:"130M", rel:"Christianity", u:10, ug:["Mixtec","Zapotec","Nahua"], cap:"Mexico City", lang:"Spanish", m:"Indigenous communities in southern Mexico still await contextualized gospel witness." },
  { n:"Argentina",    f:"🇦🇷", r:"Americas", cf:"CONMEBOL", pop:"46M",  rel:"Christianity", u:5,  ug:["Korean Argentines","Jewish Argentines","Syrian diaspora"], cap:"Buenos Aires", lang:"Spanish", m:"Buenos Aires holds one of Latin America's largest Jewish populations, largely unreached." },
  { n:"Brazil",       f:"🇧🇷", r:"Americas", cf:"CONMEBOL", pop:"215M", rel:"Christianity", u:12, ug:["Japanese Brazilians","Lebanese Brazilians","Indigenous Amazonian"], cap:"Brasília", lang:"Portuguese", m:"Over 100 uncontacted/unreached tribal groups remain in the Amazon basin." },
  { n:"Uruguay",      f:"🇺🇾", r:"Americas", cf:"CONMEBOL", pop:"3.5M", rel:"Secular/Christianity", u:3, ug:["Lebanese diaspora","Jewish community","Korean diaspora"], cap:"Montevideo", lang:"Spanish", m:"Uruguay is one of the most secular nations in Latin America—spiritual openness is growing." },
  { n:"Ecuador",      f:"🇪🇨", r:"Americas", cf:"CONMEBOL", pop:"18M",  rel:"Christianity", u:7,  ug:["Kichwa","Shuar","Achuar"], cap:"Quito", lang:"Spanish, Kichwa", m:"Amazonian indigenous groups represent a frontier of gospel witness in Ecuador." },
  { n:"Colombia",     f:"🇨🇴", r:"Americas", cf:"CONMEBOL", pop:"51M",  rel:"Christianity", u:6,  ug:["Wayuu","Nasa","Venezuelan refugees"], cap:"Bogotá", lang:"Spanish", m:"Millions of Venezuelan refugees in Colombia create an urgent gospel opportunity." },
  { n:"Paraguay",     f:"🇵🇾", r:"Americas", cf:"CONMEBOL", pop:"7.4M", rel:"Christianity", u:4,  ug:["Guaraní","Korean Paraguayans","Mennonite diaspora"], cap:"Asunción", lang:"Spanish, Guaraní", m:"The Guaraní people maintain a distinct cultural identity and are increasingly open to the gospel." },
  { n:"Chile",        f:"🇨🇱", r:"Americas", cf:"CONMEBOL", pop:"19M",  rel:"Christianity", u:5,  ug:["Mapuche","Aymara","Haitian immigrants"], cap:"Santiago", lang:"Spanish", m:"Haiti's diaspora in Chile faces isolation—a missions opportunity in an unexpected place." },
  { n:"Panama",       f:"🇵🇦", r:"Americas", cf:"CONCACAF", pop:"4.4M", rel:"Christianity", u:5,  ug:["Ngäbe","Kuna","Chinese Panamanians"], cap:"Panama City", lang:"Spanish", m:"Panama City is a global crossroads—its diverse immigrant populations include many unreached peoples." },
  { n:"Curaçao",      f:"🇨🇼", r:"Americas", cf:"CONCACAF", pop:"151K", rel:"Christianity", u:3,  ug:["Dutch Antillean Muslims","Jewish community","Sephardic Jews"], cap:"Willemstad", lang:"Papiamentu, Dutch", m:"A tiny island with a surprising diversity of unreached communities." },
  { n:"Haiti",        f:"🇭🇹", r:"Americas", cf:"CONCACAF", pop:"11M",  rel:"Christianity/Vodou", u:4, ug:["Haitian Vodouists","Rural unreached communities","Haitian diaspora"], cap:"Port-au-Prince", lang:"Haitian Creole, French", m:"Despite a Christian majority, syncretism with Vodou affects millions spiritually." },

  // Europe (12)
  { n:"England",      f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", r:"Europe", cf:"UEFA", pop:"56M",  rel:"Christianity (nominal)", u:22, ug:["British Pakistanis","British Bangladeshis","British Somalis"], cap:"London", lang:"English", m:"London is among the world's most diverse cities—home to unreached diaspora communities from across the globe." },
  { n:"France",       f:"🇫🇷", r:"Europe", cf:"UEFA", pop:"68M",  rel:"Secular/Islam", u:28, ug:["Algerian French","Moroccan French","Turkish French"], cap:"Paris", lang:"French", m:"France hosts Europe's largest Muslim population—a mission field on Europe's doorstep." },
  { n:"Germany",      f:"🇩🇪", r:"Europe", cf:"UEFA", pop:"84M",  rel:"Christianity (nominal)", u:24, ug:["Turkish Germans","Afghan Germans","Syrian Germans"], cap:"Berlin", lang:"German", m:"Post-Christian Germany has become a gateway for Muslim diaspora—ripe for cross-cultural mission." },
  { n:"Spain",        f:"🇪🇸", r:"Europe", cf:"UEFA", pop:"47M",  rel:"Catholicism (nominal)", u:18, ug:["Moroccan Spanish","Romanian Roma","Sub-Saharan Africans"], cap:"Madrid", lang:"Spanish", m:"Spain's rapid secularization and growing Muslim immigrant population create new mission dynamics." },
  { n:"Portugal",     f:"🇵🇹", r:"Europe", cf:"UEFA", pop:"10M",  rel:"Catholicism (nominal)", u:14, ug:["Cape Verdean Portuguese","Brazilian Portuguese","Chinese Portuguese"], cap:"Lisbon", lang:"Portuguese", m:"Portugal's historical role as a colonial power means its diaspora communities span the globe." },
  { n:"Netherlands",  f:"🇳🇱", r:"Europe", cf:"UEFA", pop:"17.9M",rel:"Secular", u:20, ug:["Turkish Dutch","Moroccan Dutch","Surinamese Dutch"], cap:"Amsterdam", lang:"Dutch", m:"The Netherlands is one of Europe's most secular nations, with large unreached Muslim communities." },
  { n:"Belgium",      f:"🇧🇪", r:"Europe", cf:"UEFA", pop:"11.6M",rel:"Secular/Catholicism", u:19, ug:["Moroccan Belgians","Turkish Belgians","Congolese Belgians"], cap:"Brussels", lang:"French, Dutch, German", m:"Brussels, seat of the EU, houses some of Europe's most unreached immigrant populations." },
  { n:"Croatia",      f:"🇭🇷", r:"Europe", cf:"UEFA", pop:"3.9M", rel:"Catholicism", u:8,  ug:["Bosnian Muslims","Roma Croatians","Serbian minority"], cap:"Zagreb", lang:"Croatian", m:"The Western Balkans remain a frontier for Protestant gospel witness in post-communist Europe." },
  { n:"Austria",      f:"🇦🇹", r:"Europe", cf:"UEFA", pop:"9.1M", rel:"Catholicism (nominal)", u:16, ug:["Turkish Austrians","Chechen refugees","Afghan Austrians"], cap:"Vienna", lang:"German", m:"Vienna serves as a crossroads for refugees from Muslim-majority nations." },
  { n:"Scotland",     f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", r:"Europe", cf:"UEFA", pop:"5.5M", rel:"Christianity (nominal)", u:10, ug:["Pakistani Scots","South Asian Scots","Chinese Scots"], cap:"Edinburgh", lang:"English, Scottish Gaelic", m:"Scotland's post-Christian landscape is spiritually open yet deeply nominally Christian." },
  { n:"Norway",       f:"🇳🇴", r:"Europe", cf:"UEFA", pop:"5.4M", rel:"Christianity (nominal)", u:13, ug:["Pakistani Norwegians","Somali Norwegians","Iraqi Norwegians"], cap:"Oslo", lang:"Norwegian", m:"Norway's generosity to refugees has created a multi-cultural mission field in Scandinavian cities." },
  { n:"Switzerland",  f:"🇨🇭", r:"Europe", cf:"UEFA", pop:"8.7M", rel:"Secular/Christianity", u:17, ug:["Kosovan Swiss","Turkish Swiss","Sri Lankan Swiss"], cap:"Bern", lang:"German, French, Italian", m:"Geneva and Zurich host international communities from least-reached nations." },

  // Africa (9)
  { n:"Morocco",      f:"🇲🇦", r:"Africa", cf:"CAF", pop:"37M",  rel:"Islam", u:8,  ug:["Amazigh (Berber)","Arab Moroccans","Saharan nomads"], cap:"Rabat", lang:"Arabic, Tamazight, French", m:"Morocco is 99.9% Muslim—yet a growing underground church testifies to quiet transformation." },
  { n:"Tunisia",      f:"🇹🇳", r:"Africa", cf:"CAF", pop:"12M",  rel:"Islam", u:6,  ug:["Arab Tunisians","Berber Tunisians","Sub-Saharan migrants"], cap:"Tunis", lang:"Arabic, French", m:"Post-Arab Spring Tunisia has seen remarkable openness to spiritual conversation." },
  { n:"Senegal",      f:"🇸🇳", r:"Africa", cf:"CAF", pop:"17M",  rel:"Islam", u:9,  ug:["Wolof","Serer","Mandinka"], cap:"Dakar", lang:"French, Wolof", m:"Over 95% Muslim, Senegal is home to Sufi brotherhoods with strong spiritual hunger." },
  { n:"Nigeria",      f:"🇳🇬", r:"Africa", cf:"CAF", pop:"220M", rel:"Islam/Christianity", u:31, ug:["Hausa-Fulani","Kanuri","TIV"], cap:"Abuja", lang:"English, Hausa, Yoruba, Igbo", m:"Nigeria holds the largest number of unreached people groups in Africa—the Hausa-Fulani alone number 30M." },
  { n:"Egypt",        f:"🇪🇬", r:"Africa", cf:"CAF", pop:"104M", rel:"Islam", u:11, ug:["Egyptian Arabs","Bedouin","Nubian"], cap:"Cairo", lang:"Arabic", m:"Egypt is home to the largest Arab Christian community—the Coptic Church—yet 90% remain Muslim." },
  { n:"Cameroon",     f:"🇨🇲", r:"Africa", cf:"CAF", pop:"27M",  rel:"Christianity/Islam", u:14, ug:["Fulani","Arab Choa","Kotoko"], cap:"Yaoundé", lang:"French, English", m:"Northern Cameroon has significant Muslim-majority areas with limited gospel access." },
  { n:"Côte d'Ivoire",f:"🇨🇮", r:"Africa", cf:"CAF", pop:"27M",  rel:"Islam/Christianity", u:12, ug:["Dioula","Malinke","Senufo"], cap:"Yamoussoukro", lang:"French", m:"The Muslim north of Côte d'Ivoire remains largely unreached by contextualized gospel witness." },
  { n:"South Africa", f:"🇿🇦", r:"Africa", cf:"CAF", pop:"60M",  rel:"Christianity", u:7,  ug:["Cape Malay Muslims","South Asian Muslims","Zulu traditionalists"], cap:"Pretoria", lang:"Zulu, Xhosa, Afrikaans, English (11 official)", m:"Despite a majority Christian identity, South Africa's Muslim and traditional communities need deeper engagement." },
  { n:"Algeria",      f:"🇩🇿", r:"Africa", cf:"CAF", pop:"46M",  rel:"Islam", u:7,  ug:["Kabyle Berber","Tuareg","Arab Algerians"], cap:"Algiers", lang:"Arabic, Tamazight, French", m:"Algeria has seen remarkable church growth among Kabyle Berbers—one of Africa's great gospel stories." },

  // Asia (8)
  { n:"Japan",        f:"🇯🇵", r:"Asia", cf:"AFC", pop:"125M", rel:"Buddhism/Shinto", u:16, ug:["Japanese Buddhists","Korean Japanese","Zainichi Koreans"], cap:"Tokyo", lang:"Japanese", m:"Japan is often called one of the world's hardest mission fields—less than 1% Christian after 150 years of mission." },
  { n:"South Korea",  f:"🇰🇷", r:"Asia", cf:"AFC", pop:"52M",  rel:"Christianity/Buddhism", u:9,  ug:["Korean Buddhists","Chinese Koreans","Southeast Asian migrants"], cap:"Seoul", lang:"Korean", m:"South Korea has become a major missionary-sending nation—over 20,000 Korean missionaries serve globally." },
  { n:"Iran",         f:"🇮🇷", r:"Asia", cf:"AFC", pop:"87M",  rel:"Islam (Shia)", u:14, ug:["Persian Iranians","Azerbaijani Iranians","Kurdish Iranians"], cap:"Tehran", lang:"Persian (Farsi)", m:"Iran has one of the fastest-growing church movements in the world—mostly underground house churches." },
  { n:"Saudi Arabia", f:"🇸🇦", r:"Asia", cf:"AFC", pop:"35M",  rel:"Islam", u:10, ug:["Saudi Arabs","Yemeni workers","South Asian migrants"], cap:"Riyadh", lang:"Arabic", m:"The birthplace of Islam—yet Saudi Arabia has seen a remarkable wave of Saudis turning to Christ." },
  { n:"Australia",    f:"🇦🇺", r:"Asia", cf:"AFC", pop:"26M",  rel:"Christianity (nominal)", u:19, ug:["Chinese Australians","Lebanese Australians","Afghan Australians"], cap:"Canberra", lang:"English", m:"Australia's cities are home to growing diaspora communities from Southeast Asia and the Middle East." },
  { n:"Uzbekistan",   f:"🇺🇿", r:"Asia", cf:"AFC", pop:"36M",  rel:"Islam", u:6,  ug:["Uzbeks","Tajiks","Karakalpaks"], cap:"Tashkent", lang:"Uzbek", m:"Central Asia's most populous nation—Uzbekistan's church faces significant pressure but continues to grow." },
  { n:"Jordan",       f:"🇯🇴", r:"Asia", cf:"AFC", pop:"10M",  rel:"Islam", u:8,  ug:["Jordanian Arabs","Palestinian refugees","Iraqi refugees"], cap:"Amman", lang:"Arabic", m:"Jordan hosts one of the largest refugee populations per capita—a mission field and bridge to the Arab world." },
  { n:"Qatar",        f:"🇶🇦", r:"Asia", cf:"AFC", pop:"2.9M", rel:"Islam", u:5,  ug:["Qatari Arabs","South Asian migrants","Filipino workers"], cap:"Doha", lang:"Arabic", m:"Qatar's migrant worker population (over 85% of residents) includes many unreached South Asians." },

  // Oceania (1)
  { n:"New Zealand",  f:"🇳🇿", r:"Oceania", cf:"OFC", pop:"5.1M", rel:"Christianity (nominal)", u:9, ug:["Māori","Pacific Islander NZ","Chinese New Zealanders"], cap:"Wellington", lang:"English, Māori", m:"New Zealand's Māori people are experiencing revival—and Polynesian churches are sending missionaries across the Pacific." },
];

/* ─── PLAYOFF TBD SLOTS ─── */
const TBD_SLOTS = [
  { n:"UEFA Playoff A", f:"🏆", r:"Europe", cf:"UEFA", contenders:"Italy vs N. Ireland / Wales vs Bosnia", u:0 },
  { n:"UEFA Playoff B", f:"🏆", r:"Europe", cf:"UEFA", contenders:"Ukraine vs Sweden / Poland vs Albania", u:0 },
  { n:"UEFA Playoff C", f:"🏆", r:"Europe", cf:"UEFA", contenders:"Turkey vs Romania / Slovakia vs Kosovo", u:0 },
  { n:"UEFA Playoff D", f:"🏆", r:"Europe", cf:"UEFA", contenders:"Denmark vs N. Macedonia / Czechia vs Ireland", u:0 },
  { n:"Inter-Conf. Playoff 1", f:"🌍", r:"Africa", cf:"CAF/CONCACAF", contenders:"DR Congo vs (New Caledonia vs Jamaica)", u:0 },
  { n:"Inter-Conf. Playoff 2", f:"🌏", r:"Asia", cf:"AFC/CONMEBOL", contenders:"Iraq vs (Bolivia vs Suriname)", u:0 },
];

/* ─── SCHEDULE DATA ─── */
const RAW_SCHEDULE = [
  { d:"Jun 11", full:"Thursday, June 11", feat:["Mexico","South Africa"], dev:"The World Cup opens today in the land where the gospel first reached the Americas. As millions watch, remember: every nation represented on this field is a people for whom Christ died. The tournament is more than sport—it's a window into the diversity God is gathering.", pray:"Pray for Mexican believers to see their neighbors from unreached nations as a mission field. Pray for South African churches to send and support workers to unreached communities.", matches:[{t:"5:00 PM",a:"Mexico",b:"South Africa",g:"A",v:"Estadio Azteca, Mexico City"},{t:"8:00 PM",a:"USA",b:"Canada",g:"B",v:"AT&T Stadium, Dallas"}] },
  { d:"Jun 12", full:"Friday, June 12", feat:["Argentina","Nigeria"], dev:"Argentina and Nigeria—one from the wealthy south of the Americas, one from Africa's most populous nation. Together they represent hundreds of millions of people. God's heart has always been for the nations, and today we see them gathered.", pray:"Pray for Nigerian missionaries reaching the Hausa-Fulani. Pray for Argentine believers engaging their city's Jewish community.", matches:[{t:"2:00 PM",a:"Argentina",b:"Nigeria",g:"C",v:"MetLife Stadium, New York"},{t:"5:00 PM",a:"France",b:"Belgium",g:"D",v:"Rose Bowl, Los Angeles"},{t:"8:00 PM",a:"Brazil",b:"Japan",g:"E",v:"SoFi Stadium, Los Angeles"}] },
  { d:"Jun 13", full:"Saturday, June 13", feat:["Morocco","England"], dev:"Morocco's Atlas Lions represent a nation that is 99.9% Muslim—yet a growing underground church quietly testifies to transformation. England's team reflects London's incredible diversity, with players tracing roots to Nigeria, Jamaica, and beyond.", pray:"Pray for Moroccan believers who face pressure for their faith. Pray for the church in London to engage its unreached diaspora communities.", matches:[{t:"12:00 PM",a:"Morocco",b:"Scotland",g:"F",v:"Levi's Stadium, San Francisco"},{t:"3:00 PM",a:"England",b:"Panama",g:"G",v:"Gillette Stadium, Boston"},{t:"6:00 PM",a:"Germany",b:"Uruguay",g:"H",v:"Allegiant Stadium, Las Vegas"},{t:"9:00 PM",a:"Spain",b:"Côte d'Ivoire",g:"A",v:"Rose Bowl, Los Angeles"}] },
  { d:"Jun 14", full:"Sunday, June 14", feat:["Japan","South Korea"], dev:"Two Asian giants meet today. Japan, one of the world's hardest mission fields, and South Korea, one of the world's greatest missionary-sending nations. There is something profound in watching them compete—the reached and the unreached, side by side.", pray:"Pray for Korean missionaries laboring in Japan. Pray for breakthroughs in Japanese families who resist the gospel for cultural reasons.", matches:[{t:"3:00 PM",a:"Japan",b:"Ecuador",g:"B",v:"Levi's Stadium, San Francisco"},{t:"6:00 PM",a:"South Korea",b:"Cameroon",g:"C",v:"AT&T Stadium, Dallas"},{t:"9:00 PM",a:"Netherlands",b:"Senegal",g:"D",v:"Lincoln Financial Field, Philadelphia"}] },
  { d:"Jun 15", full:"Monday, June 15", feat:["Iran","Saudi Arabia"], dev:"Today two of the most spiritually significant Muslim-majority nations play. Iran is witnessing one of the fastest church growth movements on earth. Saudi Arabia—the birthplace of Islam—is seeing remarkable numbers of Saudis quietly following Jesus.", pray:"Pray for the underground church in Iran to remain protected and multiplying. Pray for Saudi seekers who risk everything to follow Christ.", matches:[{t:"3:00 PM",a:"Iran",b:"Australia",g:"E",v:"SoFi Stadium, Los Angeles"},{t:"6:00 PM",a:"Saudi Arabia",b:"Croatia",g:"F",v:"MetLife Stadium, New York"},{t:"9:00 PM",a:"Portugal",b:"Egypt",g:"G",v:"Allegiant Stadium, Las Vegas"}] },
  { d:"Jun 16", full:"Tuesday, June 16", feat:["Senegal","Algeria"], dev:"West Africa and North Africa face off today. Senegal's team is almost entirely Muslim, representing Sufi brotherhoods with deep spiritual hunger. Algeria's Kabyle Berber church is one of Africa's most remarkable revival stories.", pray:"Pray for the Wolof people of Senegal to encounter Jesus. Pray for Algerian church leaders who face increasing pressure.", matches:[{t:"3:00 PM",a:"Senegal",b:"Switzerland",g:"H",v:"Rose Bowl, Los Angeles"},{t:"6:00 PM",a:"Algeria",b:"New Zealand",g:"A",v:"Levi's Stadium, San Francisco"},{t:"9:00 PM",a:"USA",b:"Panama",g:"B",v:"AT&T Stadium, Dallas"}] },
  { d:"Jun 17", full:"Wednesday, June 17", feat:["France","Tunisia"], dev:"France hosts the largest Muslim population in Western Europe—many of them Algerian and Tunisian. Today France plays Tunisia, a connection that reflects millions of diaspora relationships. The nations aren't just coming to the stadium; they're living next door to the church.", pray:"Pray for French churches to mobilize toward their Muslim neighbors. Pray for Tunisian believers whose witness is costly.", matches:[{t:"12:00 PM",a:"France",b:"Tunisia",g:"D",v:"Rose Bowl, Los Angeles"},{t:"3:00 PM",a:"Argentina",b:"Colombia",g:"C",v:"MetLife Stadium, New York"},{t:"6:00 PM",a:"Brazil",b:"Uzbekistan",g:"E",v:"SoFi Stadium, Los Angeles"},{t:"9:00 PM",a:"Germany",b:"Scotland",g:"H",v:"Allegiant Stadium, Las Vegas"}] },
  { d:"Jun 18", full:"Thursday, June 18", feat:["Jordan","Qatar"], dev:"Two small nations with enormous global significance. Jordan hosts more refugees per capita than almost any nation on earth. Qatar's migrants—mostly from South Asia—represent millions of laborers far from home, many from Hindu and Buddhist backgrounds.", pray:"Pray for the church in Jordan to be a lighthouse for refugee communities. Pray for Filipino and South Asian Christians in Qatar to boldly share their faith.", matches:[{t:"3:00 PM",a:"Jordan",b:"Curaçao",g:"F",v:"Gillette Stadium, Boston"},{t:"6:00 PM",a:"Qatar",b:"Haiti",g:"G",v:"Levi's Stadium, San Francisco"},{t:"9:00 PM",a:"Belgium",b:"Morocco",g:"A",v:"Lincoln Financial Field, Philadelphia"}] },
  { d:"Jun 19", full:"Friday, June 19", feat:["Nigeria","Cameroon"], dev:"Juneteenth—the celebration of freedom in America. Today two African giants play. Nigeria has the most unreached people groups in Africa. Cameroon's north remains largely Muslim and underserved by the church. The freedom the gospel brings is still needed.", pray:"Pray for Nigerian church leaders on the frontier with Hausa-Fulani communities. Pray for the church in northern Cameroon to grow in boldness.", matches:[{t:"12:00 PM",a:"Nigeria",b:"South Korea",g:"C",v:"AT&T Stadium, Dallas"},{t:"3:00 PM",a:"Cameroon",b:"Japan",g:"E",v:"SoFi Stadium, Los Angeles"},{t:"6:00 PM",a:"England",b:"Canada",g:"G",v:"MetLife Stadium, New York"},{t:"9:00 PM",a:"Croatia",b:"Australia",g:"F",v:"Allegiant Stadium, Las Vegas"}] },
  { d:"Jun 20", full:"Saturday, June 20", feat:["Egypt","Saudi Arabia"], dev:"Egypt holds the ancient Coptic Church—one of Christianity's oldest—yet 90% of Egyptians remain Muslim. Saudi Arabia was closed for centuries to the gospel. Today both nations play, reminding us that no people is beyond the reach of prayer and witness.", pray:"Pray for the Coptic Church to be a missionary church to their Muslim neighbors. Pray for Saudi nationals studying or working in America during this World Cup.", matches:[{t:"12:00 PM",a:"Egypt",b:"Switzerland",g:"H",v:"Rose Bowl, Los Angeles"},{t:"3:00 PM",a:"Saudi Arabia",b:"South Africa",g:"A",v:"Estadio Azteca, Mexico City"},{t:"6:00 PM",a:"Netherlands",b:"France",g:"D",v:"Lincoln Financial Field, Philadelphia"},{t:"9:00 PM",a:"Ecuador",b:"USA",g:"B",v:"AT&T Stadium, Dallas"}] },
  { d:"Jun 21", full:"Sunday, June 21", feat:["Brazil","Colombia"], dev:"South America sends two of its most vibrant Christian nations today. Brazil sends more missionaries than any South American country. Colombia's church has grown remarkably amid decades of conflict. Yet both nations also contain millions of unreached indigenous people.", pray:"Pray for Brazilian missionaries serving in North Africa and the Middle East. Pray for Colombian believers ministering to Venezuelan refugees.", matches:[{t:"12:00 PM",a:"Brazil",b:"Iran",g:"E",v:"SoFi Stadium, Los Angeles"},{t:"3:00 PM",a:"Colombia",b:"Panama",g:"B",v:"Levi's Stadium, San Francisco"},{t:"6:00 PM",a:"Spain",b:"Algeria",g:"A",v:"Rose Bowl, Los Angeles"},{t:"9:00 PM",a:"Scotland",b:"Jordan",g:"F",v:"Gillette Stadium, Boston"}] },
  { d:"Jun 22", full:"Monday, June 22", feat:["Portugal","Uzbekistan"], dev:"Portugal—the once-great colonial power that spread Catholicism globally—now faces a post-Christian moment at home. Uzbekistan, a Central Asian nation of 36 million Muslims, has a tiny but courageous church. These two nations together span the full arc of world Christianity.", pray:"Pray for Portuguese believers to rediscover the missionary impulse of their forebears. Pray for the church in Uzbekistan to multiply despite legal restrictions.", matches:[{t:"3:00 PM",a:"Portugal",b:"Jordan",g:"G",v:"Allegiant Stadium, Las Vegas"},{t:"6:00 PM",a:"Uzbekistan",b:"Iran",g:"E",v:"SoFi Stadium, Los Angeles"},{t:"9:00 PM",a:"Germany",b:"Belgium",g:"H",v:"Lincoln Financial Field, Philadelphia"}] },
  { d:"Jun 23", full:"Tuesday, June 23", feat:["Austria","Norway"], dev:"Northern and Central Europe—once the heartland of the Reformation—now among the world's most secular places. Austria and Norway both have significant immigrant populations from Muslim-majority nations. The mission field has come to the mission base.", pray:"Pray for churches in Vienna and Oslo to see their Muslim neighbors as their mission field. Pray for second-generation immigrants to encounter Christ.", matches:[{t:"3:00 PM",a:"Austria",b:"Curaçao",g:"F",v:"MetLife Stadium, New York"},{t:"6:00 PM",a:"Norway",b:"New Zealand",g:"A",v:"Levi's Stadium, San Francisco"},{t:"9:00 PM",a:"Netherlands",b:"Tunisia",g:"D",v:"Rose Bowl, Los Angeles"}] },
  { d:"Jun 24", full:"Wednesday, June 24", feat:["Haiti","New Zealand"], dev:"Two nations at opposite ends of the globe—Haiti, scarred by poverty and crisis yet full of spiritual vitality; New Zealand, prosperous and post-Christian yet seeing revival among Māori. God is at work in unexpected places.", pray:"Pray for the church in Haiti to be a source of healing in a broken nation. Pray for the Māori revival to spread across Pacific island communities.", matches:[{t:"12:00 PM",a:"Haiti",b:"Switzerland",g:"H",v:"Rose Bowl, Los Angeles"},{t:"3:00 PM",a:"New Zealand",b:"Morocco",g:"A",v:"Levi's Stadium, San Francisco"},{t:"6:00 PM",a:"Paraguay",b:"England",g:"G",v:"Gillette Stadium, Boston"},{t:"9:00 PM",a:"Chile",b:"Canada",g:"B",v:"AT&T Stadium, Dallas"}] },
  { d:"Jun 25", full:"Thursday, June 25", feat:["South Africa","South Korea"], dev:"South Africa's church is one of Africa's largest—yet millions in Muslim and traditional communities remain unreached. South Korea has become a sending nation of extraordinary scale. Together they picture the global church: growing in some places, still pioneering in others.", pray:"Pray for South African churches to mobilize toward Cape Malay Muslim communities. Pray for Korean missionaries serving in some of the world's most dangerous fields.", matches:[{t:"12:00 PM",a:"South Africa",b:"Scotland",g:"F",v:"Gillette Stadium, Boston"},{t:"3:00 PM",a:"South Korea",b:"Australia",g:"C",v:"SoFi Stadium, Los Angeles"},{t:"6:00 PM",a:"Colombia",b:"USA",g:"B",v:"Levi's Stadium, San Francisco"},{t:"9:00 PM",a:"Argentina",b:"Ecuador",g:"C",v:"MetLife Stadium, New York"}] },
  { d:"Jun 26", full:"Friday, June 26", feat:["Germany","Spain"], dev:"The final push of the group stage. Germany and Spain—two European giants, two post-Christian nations with millions of Muslim residents. Europe's mission challenge is as great as the Global South's. The church everywhere must rise.", pray:"Pray for Turkish churches in Germany. Pray for Moroccan communities in Spain to encounter the gospel. Pray for European Christians to rediscover their missionary calling.", matches:[{t:"12:00 PM",a:"Germany",b:"Egypt",g:"H",v:"Rose Bowl, Los Angeles"},{t:"3:00 PM",a:"Spain",b:"Norway",g:"A",v:"Estadio Azteca, Mexico City"},{t:"6:00 PM",a:"Belgium",b:"Croatia",g:"F",v:"MetLife Stadium, New York"},{t:"9:00 PM",a:"France",b:"Netherlands",g:"D",v:"Lincoln Financial Field, Philadelphia"}] },
  { d:"Jun 27", full:"Saturday, June 27", feat:["All Nations"], dev:"The final day of the group stage. Ten matches. Nations from every corner of the earth. As the group stage closes, we have prayed our way through 42 nations—each one a people loved by God, each one a field for the gospel. The tournament continues, and so does our mission.", pray:"Pray for a harvest among the nations gathered in North America for this tournament. Pray for the church to be mobilized, sent, and sustained in mission until every people group has heard.", matches:[{t:"10:00 AM",a:"USA",b:"Uruguay",g:"B",v:"AT&T Stadium, Dallas"},{t:"10:00 AM",a:"Canada",b:"Chile",g:"B",v:"BC Place, Vancouver"},{t:"2:00 PM",a:"Brazil",b:"Saudi Arabia",g:"E",v:"SoFi Stadium, Los Angeles"},{t:"2:00 PM",a:"Australia",b:"Uzbekistan",g:"E",v:"Levi's Stadium, San Francisco"},{t:"6:00 PM",a:"Japan",b:"South Korea",g:"C",v:"Rose Bowl, Los Angeles"},{t:"6:00 PM",a:"Argentina",b:"Paraguay",g:"C",v:"MetLife Stadium, New York"},{t:"6:00 PM",a:"England",b:"Uruguay",g:"G",v:"Gillette Stadium, Boston"},{t:"6:00 PM",a:"Qatar",b:"Panama",g:"G",v:"Lincoln Financial Field, Philadelphia"},{t:"6:00 PM",a:"Germany",b:"Haiti",g:"H",v:"Allegiant Stadium, Las Vegas"},{t:"6:00 PM",a:"Egypt",b:"Switzerland",g:"H",v:"Rose Bowl, Los Angeles"}] },
];

const REGIONS = ["All","Americas","Europe","Africa","Asia","Oceania"];

function ugBadgeStyle(u) {
  if (u >= 20) return { background: C.orange, color: "#fff" };
  if (u >= 10) return { background: C.blueJeans, color: "#fff" };
  return { background: C.blue, color: "#fff" };
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
function NationModal({ nation, onClose }) {
  if (!nation) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(27,45,58,0.7)",
      zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white,
        borderRadius: "20px 20px 0 0",
        width: "100%",
        maxWidth: 520,
        maxHeight: "88vh",
        overflowY: "auto",
        padding: "0 0 40px 0",
      }}>
        {/* Header */}
        <div style={{
          background: C.indigo,
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px 20px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <span style={{ fontSize: 52 }}>{nation.f}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", lineHeight: 1.2 }}>
              {nation.n}
            </div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
              {nation.r} · {nation.cf}
            </div>
          </div>
          {!nation.contenders && (
            <div style={{ ...ugBadgeStyle(nation.u), borderRadius: 20, padding: "6px 12px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{nation.u}</div>
              <div style={{ fontSize: 10, letterSpacing: 0.5 }}>UPGS</div>
            </div>
          )}
        </div>

        <div style={{ padding: "20px 20px 0 20px" }}>
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
              </div>

              {/* Mission Insight */}
              <div style={{ background: `${C.indigo}10`, borderLeft: `4px solid ${C.indigo}`, borderRadius: "0 10px 10px 0", padding: 14, marginBottom: 16 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11, color: C.indigo, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Mission Insight</div>
                <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, lineHeight: 1.6, color: C.text, fontStyle: "italic" }}>{nation.m}</div>
              </div>

              {/* Links */}
              <div style={{ display: "flex", gap: 10 }}>
                <a href={`https://joshuaproject.net/countries/${nation.n.replace(/\s/g,"-")}`} target="_blank" rel="noreferrer" style={{
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
            </>
          )}
        </div>
        <button onClick={onClose} style={{
          display: "block", width: "calc(100% - 40px)", margin: "20px 20px 0 20px",
          background: C.brightGray, border: "none",
          borderRadius: 12, padding: 16,
          fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16,
          color: C.indigo, cursor: "pointer",
        }}>Close</button>
      </div>
    </div>
  );
}

/* ─── DAILY DIGEST TAB ─── */
function DailyDigest() {
  const today = new Date();
  const startOfTournament = new Date("2026-06-11");
  let defaultDay = 0;
  if (today >= startOfTournament) {
    const diff = Math.floor((today - startOfTournament) / 86400000);
    defaultDay = Math.min(diff, RAW_SCHEDULE.length - 1);
  }
  const [dayIdx, setDayIdx] = useState(defaultDay);
  const [selectedNation, setSelectedNation] = useState(null);
  const day = RAW_SCHEDULE[dayIdx];
  const [showAllMatches, setShowAllMatches] = useState(false);

  const matchesToShow = showAllMatches ? day.matches : day.matches.slice(0, 3);

  return (
    <div style={{ paddingBottom: 100 }}>
      <NationModal nation={selectedNation} onClose={() => setSelectedNation(null)} />

      {/* Date heading */}
      <div style={{ background: C.indigo, padding: "14px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { if (dayIdx > 0) { setDayIdx(dayIdx - 1); setShowAllMatches(false); } }} disabled={dayIdx === 0} style={{
          background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
          borderRadius: 10, padding: "10px 18px", fontSize: 18, cursor: "pointer",
          opacity: dayIdx === 0 ? 0.3 : 1, fontFamily: "Montserrat, sans-serif", fontWeight: 700,
        }}>← Prev</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17, color: "#fff" }}>{day.full}</div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Day {dayIdx + 1} of 17</div>
        </div>
        <button onClick={() => { if (dayIdx < RAW_SCHEDULE.length - 1) { setDayIdx(dayIdx + 1); setShowAllMatches(false); } }} disabled={dayIdx === RAW_SCHEDULE.length - 1} style={{
          background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
          borderRadius: 10, padding: "10px 18px", fontSize: 18, cursor: "pointer",
          opacity: dayIdx === RAW_SCHEDULE.length - 1 ? 0.3 : 1, fontFamily: "Montserrat, sans-serif", fontWeight: 700,
        }}>Next →</button>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Devotional */}
        <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${C.blue}30` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.indigo }}>Today's Devotional</div>
          </div>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 17, lineHeight: 1.75, color: C.text }}>
            {day.dev}
          </div>
        </div>

        {/* Prayer */}
        <div style={{ background: `${C.blueJeans}15`, borderRadius: 16, padding: 18, marginBottom: 14, border: `2px solid ${C.blueJeans}40` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🙏</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.blueJeans }}>Prayer Focus</div>
          </div>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 17, lineHeight: 1.75, color: C.text }}>
            {day.pray}
          </div>
        </div>

        {/* Matches */}
        <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${C.blue}30` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>⚽</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.indigo }}>Today's Matches</div>
          </div>
          {matchesToShow.map((m, i) => {
            const teamA = [...RAW_COUNTRIES, ...TBD_SLOTS].find(c => c.n === m.a);
            const teamB = [...RAW_COUNTRIES, ...TBD_SLOTS].find(c => c.n === m.b);
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
                    <div style={{ fontSize: 26 }}>{teamA?.f || "🏆"}</div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.indigo, marginTop: 4 }}>{m.a}</div>
                  </button>
                  <div style={{ background: C.orange, color: "#fff", fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 14, padding: "16px 10px", flexShrink: 0 }}>VS</div>
                  <button onClick={() => teamB && setSelectedNation(teamB)} style={{
                    flex: 1, background: C.brightGray, border: "none", borderRadius: "0 10px 10px 0",
                    padding: "12px 10px", cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 26 }}>{teamB?.f || "🏆"}</div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.indigo, marginTop: 4 }}>{m.b}</div>
                  </button>
                </div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 5, textAlign: "center" }}>📍 {m.v}</div>
              </div>
            );
          })}
          {day.matches.length > 3 && !showAllMatches && (
            <button onClick={() => setShowAllMatches(true)} style={{
              display: "block", width: "100%", marginTop: 14,
              background: "none", border: `2px solid ${C.blue}40`, borderRadius: 10,
              padding: 12, fontFamily: "Montserrat, sans-serif", fontWeight: 700,
              fontSize: 14, color: C.blue, cursor: "pointer",
            }}>Show {day.matches.length - 3} More Matches ▾</button>
          )}
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
                  textAlign: "left", marginBottom: 10,
                }}>
                  <span style={{ fontSize: 38 }}>{nation.f}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17, color: C.indigo }}>{nation.n}</div>
                    <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 14, color: C.text, marginTop: 3, lineHeight: 1.4 }}>{nation.m.substring(0, 70)}…</div>
                  </div>
                  <div style={{ ...ugBadgeStyle(nation.u), borderRadius: 10, padding: "6px 10px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 12, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{nation.u}</div>
                    <div style={{ fontSize: 10 }}>UPGs</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Calendar — Jump to Any Day */}
        <div style={{ background: C.white, borderRadius: 16, padding: "16px 0 16px", marginBottom: 14, border: `1px solid ${C.blue}30` }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 14, color: C.indigo, padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span> Jump to Any Day
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <div style={{ display: "flex", gap: 8, padding: "0 16px", width: "max-content" }}>
              {RAW_SCHEDULE.map((s, i) => (
                <button key={i} onClick={() => { setDayIdx(i); setShowAllMatches(false); window.scrollTo(0,0); }} style={{
                  background: i === dayIdx ? C.indigo : C.brightGray,
                  color: i === dayIdx ? "#fff" : C.indigo,
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minWidth: 64,
                }}>{s.d}</button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── ALL NATIONS TAB ─── */
function AllNations() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [selectedNation, setSelectedNation] = useState(null);

  const filtered = RAW_COUNTRIES.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.n.toLowerCase().includes(q) || c.ug.some(g => g.toLowerCase().includes(q));
    const matchRegion = region === "All" || c.r === region;
    return matchSearch && matchRegion;
  });

  return (
    <div style={{ paddingBottom: 100 }}>
      <NationModal nation={selectedNation} onClose={() => setSelectedNation(null)} />

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
            <span style={{ fontSize: 38, flexShrink: 0 }}>{c.f}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 17, color: C.indigo }}>{c.n}</div>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: C.blue, marginTop: 2 }}>{c.r} · {c.cf}</div>
              <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {c.ug.join(" · ")}
              </div>
            </div>
            <div style={{ ...ugBadgeStyle(c.u), borderRadius: 10, padding: "8px 10px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 12, textAlign: "center", flexShrink: 0, minWidth: 44 }}>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{c.u}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>UPGs</div>
            </div>
          </button>
        ))}

        {/* TBD Slots */}
        {(region === "All" || region === "Europe") && !search && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: C.blue, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>⏳ Playoff Slots — Results April 1</div>
            {TBD_SLOTS.filter(s => region === "All" || s.r === region).map((s, i) => (
              <button key={i} onClick={() => setSelectedNation(s)} style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%",
                background: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(62,103,172,0.06) 6px, rgba(62,103,172,0.06) 12px)",
                border: `1px dashed ${C.blue}60`,
                borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                textAlign: "left", marginBottom: 10,
              }}>
                <span style={{ fontSize: 38 }}>{s.f}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.indigo }}>{s.n}</div>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 13, color: C.blue, marginTop: 3 }}>{s.contenders}</div>
                </div>
                <div style={{ background: C.brightGray, borderRadius: 10, padding: "8px 10px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 11, color: C.blue, textAlign: "center", flexShrink: 0 }}>TBD</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function App() {
  const [tab, setTab] = useState("digest");
  const [showBanner, setShowBanner] = useState(true);

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
          background: C.indigo,
          padding: "env(safe-area-inset-top, 12px) 20px 0",
        }}>
          <div style={{ padding: "14px 0 16px" }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
              Global Gates
            </div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 22, color: C.white, lineHeight: 1.2 }}>
              The Nations Are Coming
            </div>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 5, fontStyle: "italic" }}>
              2026 FIFA World Cup Missions Resource
            </div>
          </div>
        </div>

        {/* Home Screen Banner */}
        {showBanner && <HomeScreenBanner onDismiss={() => setShowBanner(false)} />}

        {/* Tab Bar */}
        <div style={{ background: C.indigo, padding: "0 16px 0" }}>
          <div style={{ display: "flex", borderBottom: `2px solid rgba(255,255,255,0.15)` }}>
            {[
              { id: "digest", label: "📅  Daily Digest" },
              { id: "nations", label: "🌍  All Nations" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? `3px solid ${C.orange}` : "3px solid transparent",
                padding: "14px 8px",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: tab === t.id ? C.white : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                textAlign: "center",
                marginBottom: -2,
                letterSpacing: 0.2,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "digest" ? <DailyDigest /> : <AllNations />}
        </div>

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
    </>
  );
}
