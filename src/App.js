import { useState, useEffect, useRef } from "react";

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
};

function useGameState() {
  const [gameState, setGameState] = useState(DEFAULT_GAME_STATE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pftc_game");
      if (stored) setGameState({ ...DEFAULT_GAME_STATE, ...JSON.parse(stored) });
    } catch {}
  }, []);

  function updateGameState(changes) {
    setGameState(prev => {
      const next = { ...prev, ...changes };
      try {
        localStorage.setItem("pftc_game", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return [gameState, updateGameState];
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
  { id: 'full_squad',         check: g => {
      const regions = ['Americas','Europe','Africa','Asia','Oceania'];
      return regions.some(r =>
        RAW_COUNTRIES.filter(c => c.r === r).every(c => g.prayedNations.includes(c.n))
      );
  }},
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
  // Americas (13)
  { n:"USA",          f:"🇺🇸", iso:"us", r:"Americas", cf:"CONCACAF", pop:"335M", rel:"Christianity", u:25, ug:["Arab Americans","South Asian Americans","Somali Americans"], cap:"Washington D.C.", lang:"English, Spanish", m:"The US hosts millions of unreached immigrants—among the world's greatest mission opportunities without leaving home." },
  { n:"Canada",       f:"🇨🇦", iso:"ca", r:"Americas", cf:"CONCACAF", pop:"38M",  rel:"Christianity", u:18, ug:["South Asian Canadians","Chinese Canadians","Afghan refugees"], cap:"Ottawa", lang:"English, French", m:"Canada's cities are home to growing diaspora communities from least-reached nations." },
  { n:"Mexico",       f:"🇲🇽", iso:"mx", r:"Americas", cf:"CONCACAF", pop:"130M", rel:"Christianity", u:10, ug:["Mixtec","Zapotec","Nahua"], cap:"Mexico City", lang:"Spanish", m:"Indigenous communities in southern Mexico still await contextualized gospel witness." },
  { n:"Argentina",    f:"🇦🇷", iso:"ar", r:"Americas", cf:"CONMEBOL", pop:"46M",  rel:"Christianity", u:5,  ug:["Korean Argentines","Jewish Argentines","Syrian diaspora"], cap:"Buenos Aires", lang:"Spanish", m:"Buenos Aires holds one of Latin America's largest Jewish populations, largely unreached." },
  { n:"Brazil",       f:"🇧🇷", iso:"br", r:"Americas", cf:"CONMEBOL", pop:"215M", rel:"Christianity", u:12, ug:["Japanese Brazilians","Lebanese Brazilians","Indigenous Amazonian"], cap:"Brasília", lang:"Portuguese", m:"Over 100 uncontacted/unreached tribal groups remain in the Amazon basin." },
  { n:"Uruguay",      f:"🇺🇾", iso:"uy", r:"Americas", cf:"CONMEBOL", pop:"3.5M", rel:"Secular/Christianity", u:3, ug:["Lebanese diaspora","Jewish community","Korean diaspora"], cap:"Montevideo", lang:"Spanish", m:"Uruguay is one of the most secular nations in Latin America—spiritual openness is growing." },
  { n:"Ecuador",      f:"🇪🇨", iso:"ec", r:"Americas", cf:"CONMEBOL", pop:"18M",  rel:"Christianity", u:7,  ug:["Kichwa","Shuar","Achuar"], cap:"Quito", lang:"Spanish, Kichwa", m:"Amazonian indigenous groups represent a frontier of gospel witness in Ecuador." },
  { n:"Colombia",     f:"🇨🇴", iso:"co", r:"Americas", cf:"CONMEBOL", pop:"51M",  rel:"Christianity", u:6,  ug:["Wayuu","Nasa","Venezuelan refugees"], cap:"Bogotá", lang:"Spanish", m:"Millions of Venezuelan refugees in Colombia create an urgent gospel opportunity." },
  { n:"Paraguay",     f:"🇵🇾", iso:"py", r:"Americas", cf:"CONMEBOL", pop:"7.4M", rel:"Christianity", u:4,  ug:["Guaraní","Korean Paraguayans","Mennonite diaspora"], cap:"Asunción", lang:"Spanish, Guaraní", m:"The Guaraní people maintain a distinct cultural identity and are increasingly open to the gospel." },
  { n:"Panama",       f:"🇵🇦", iso:"pa", r:"Americas", cf:"CONCACAF", pop:"4.4M", rel:"Christianity", u:5,  ug:["Ngäbe","Kuna","Chinese Panamanians"], cap:"Panama City", lang:"Spanish", m:"Panama City is a global crossroads—its diverse immigrant populations include many unreached peoples." },
  { n:"Curaçao",      f:"🇨🇼", iso:"cw", r:"Americas", cf:"CONCACAF", pop:"151K", rel:"Christianity", u:3,  ug:["Dutch Antillean Muslims","Jewish community","Sephardic Jews"], cap:"Willemstad", lang:"Papiamentu, Dutch", m:"A tiny island with a surprising diversity of unreached communities." },
  { n:"Haiti",        f:"🇭🇹", iso:"ht", r:"Americas", cf:"CONCACAF", pop:"11M",  rel:"Christianity/Vodou", u:4, ug:["Haitian Vodouists","Rural unreached communities","Haitian diaspora"], cap:"Port-au-Prince", lang:"Haitian Creole, French", m:"Despite a Christian majority, syncretism with Vodou affects millions spiritually." },

  // Europe (16)
  { n:"England",      f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", iso:"gb-eng", r:"Europe", cf:"UEFA", pop:"56M",  rel:"Christianity (nominal)", u:22, ug:["British Pakistanis","British Bangladeshis","British Somalis"], cap:"London", lang:"English", m:"London is among the world's most diverse cities—home to unreached diaspora communities from across the globe." },
  { n:"France",       f:"🇫🇷", iso:"fr", r:"Europe", cf:"UEFA", pop:"68M",  rel:"Secular/Islam", u:28, ug:["Algerian French","Moroccan French","Turkish French"], cap:"Paris", lang:"French", m:"France hosts Europe's largest Muslim population—a mission field on Europe's doorstep." },
  { n:"Germany",      f:"🇩🇪", iso:"de", r:"Europe", cf:"UEFA", pop:"84M",  rel:"Christianity (nominal)", u:24, ug:["Turkish Germans","Afghan Germans","Syrian Germans"], cap:"Berlin", lang:"German", m:"Post-Christian Germany has become a gateway for Muslim diaspora—ripe for cross-cultural mission." },
  { n:"Spain",        f:"🇪🇸", iso:"es", r:"Europe", cf:"UEFA", pop:"47M",  rel:"Catholicism (nominal)", u:18, ug:["Moroccan Spanish","Romanian Roma","Sub-Saharan Africans"], cap:"Madrid", lang:"Spanish", m:"Spain's rapid secularization and growing Muslim immigrant population create new mission dynamics." },
  { n:"Portugal",     f:"🇵🇹", iso:"pt", r:"Europe", cf:"UEFA", pop:"10M",  rel:"Catholicism (nominal)", u:14, ug:["Cape Verdean Portuguese","Brazilian Portuguese","Chinese Portuguese"], cap:"Lisbon", lang:"Portuguese", m:"Portugal's historical role as a colonial power means its diaspora communities span the globe." },
  { n:"Netherlands",  f:"🇳🇱", iso:"nl", r:"Europe", cf:"UEFA", pop:"17.9M",rel:"Secular", u:20, ug:["Turkish Dutch","Moroccan Dutch","Surinamese Dutch"], cap:"Amsterdam", lang:"Dutch", m:"The Netherlands is one of Europe's most secular nations, with large unreached Muslim communities." },
  { n:"Belgium",      f:"🇧🇪", iso:"be", r:"Europe", cf:"UEFA", pop:"11.6M",rel:"Secular/Catholicism", u:19, ug:["Moroccan Belgians","Turkish Belgians","Congolese Belgians"], cap:"Brussels", lang:"French, Dutch, German", m:"Brussels, seat of the EU, houses some of Europe's most unreached immigrant populations." },
  { n:"Croatia",      f:"🇭🇷", iso:"hr", r:"Europe", cf:"UEFA", pop:"3.9M", rel:"Catholicism", u:8,  ug:["Bosnian Muslims","Roma Croatians","Serbian minority"], cap:"Zagreb", lang:"Croatian", m:"The Western Balkans remain a frontier for Protestant gospel witness in post-communist Europe." },
  { n:"Austria",      f:"🇦🇹", iso:"at", r:"Europe", cf:"UEFA", pop:"9.1M", rel:"Catholicism (nominal)", u:16, ug:["Turkish Austrians","Chechen refugees","Afghan Austrians"], cap:"Vienna", lang:"German", m:"Vienna serves as a crossroads for refugees from Muslim-majority nations." },
  { n:"Scotland",     f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", iso:"gb-sct", r:"Europe", cf:"UEFA", pop:"5.5M", rel:"Christianity (nominal)", u:10, ug:["Pakistani Scots","South Asian Scots","Chinese Scots"], cap:"Edinburgh", lang:"English, Scottish Gaelic", m:"Scotland's post-Christian landscape is spiritually open yet deeply nominally Christian." },
  { n:"Norway",       f:"🇳🇴", iso:"no", r:"Europe", cf:"UEFA", pop:"5.4M", rel:"Christianity (nominal)", u:13, ug:["Pakistani Norwegians","Somali Norwegians","Iraqi Norwegians"], cap:"Oslo", lang:"Norwegian", m:"Norway's generosity to refugees has created a multi-cultural mission field in Scandinavian cities." },
  { n:"Switzerland",  f:"🇨🇭", iso:"ch", r:"Europe", cf:"UEFA", pop:"8.7M", rel:"Secular/Christianity", u:17, ug:["Kosovan Swiss","Turkish Swiss","Sri Lankan Swiss"], cap:"Bern", lang:"German, French, Italian", m:"Geneva and Zurich host international communities from least-reached nations." },
  { n:"Bosnia & Herzegovina", f:"🇧🇦", iso:"ba", r:"Europe", cf:"UEFA", pop:"3.5M", rel:"Islam/Christianity", u:5, ug:["Bosniaks","Roma","Bosnian diaspora"], cap:"Sarajevo", lang:"Bosnian, Serbian, Croatian", m:"Bosnia is home to Europe's most established Muslim community — and a Bosniak diaspora scattered across the US, Germany, and Austria after the 1990s war.", diaspora:"🌎 Tens of thousands of Bosniaks have settled in North America, with a significant community in St. Louis. [Meet them at UPG North America →](https://upgnorthamerica.com/project/bosniaks-in-north-america/)" },
  { n:"Czechia",      f:"🇨🇿", iso:"cz", r:"Europe", cf:"UEFA", pop:"10.9M", rel:"Secular/Atheist", u:8, ug:["Czech atheists","Vietnamese Czechs","Ukrainian refugees"], cap:"Prague", lang:"Czech", m:"Czechia is one of the most secular nations on earth — less than 15% identify as Christian. Prague's Vietnamese community is one of Europe's largest and largely unreached.", dia:"Czech diaspora in Germany and the US; significant Vietnamese community with roots in communist-era labor agreements." },
  { n:"Sweden",       f:"🇸🇪", iso:"se", r:"Europe", cf:"UEFA", pop:"10.5M", rel:"Secular/Islam", u:12, ug:["Somali Swedes","Iraqi Swedes","Afghan Swedes"], cap:"Stockholm", lang:"Swedish", m:"Sweden has received more refugees per capita than almost any Western nation — creating a remarkable concentration of unreached Muslim peoples in Swedish cities.", dia:"Large Somali and Iraqi diaspora communities in Minneapolis and other US cities share roots with Sweden's immigrant population." },
  { n:"Türkiye",      f:"🇹🇷", iso:"tr", r:"Europe", cf:"UEFA", pop:"85M",  rel:"Islam", u:30, ug:["Kurds","Alevis","Laz"], cap:"Ankara", lang:"Turkish, Kurdish", m:"Turkey is home to 30+ unreached people groups including 15 million Alevis — a distinct Muslim sect with little gospel witness. The church in Turkey is tiny but growing.", diaspora:"🌎 Turkish communities are established across North America, particularly in New York, Toronto, and Detroit. [Meet them at UPG North America →](https://upgnorthamerica.com/project/turks-in-north-america/)" },

  // Africa (10)
  { n:"Morocco",      f:"🇲🇦", iso:"ma", r:"Africa", cf:"CAF", pop:"37M",  rel:"Islam", u:8,  ug:["Amazigh (Berber)","Arab Moroccans","Saharan nomads"], cap:"Rabat", lang:"Arabic, Tamazight, French", m:"Morocco is 99.9% Muslim—yet a growing underground church testifies to quiet transformation.", diaspora:"🌎 Over 320,000 Moroccan Arabs and Berbers live across North America — concentrated in New York, Montreal, and Los Angeles. [Meet them at UPG North America →](https://upgnorthamerica.com/project/moroccan-arabs-in-north-america/)" },
  { n:"Tunisia",      f:"🇹🇳", iso:"tn", r:"Africa", cf:"CAF", pop:"12M",  rel:"Islam", u:6,  ug:["Arab Tunisians","Berber Tunisians","Sub-Saharan migrants"], cap:"Tunis", lang:"Arabic, French", m:"Post-Arab Spring Tunisia has seen remarkable openness to spiritual conversation.", diaspora:"🌎 Tens of thousands of Tunisian Arabs live across North America, with communities in Montreal, New York, and Toronto. [Meet them at UPG North America →](https://upgnorthamerica.com/project/tunisian-arabs-in-north-america/)" },
  { n:"Senegal",      f:"🇸🇳", iso:"sn", r:"Africa", cf:"CAF", pop:"17M",  rel:"Islam", u:9,  ug:["Wolof","Serer","Mandinka"], cap:"Dakar", lang:"French, Wolof", m:"Over 95% Muslim, Senegal is home to Sufi brotherhoods with strong spiritual hunger.", diaspora:"🌎 The Wolof people of Senegal have significant communities in New York City and other North American urban centers. [Meet them at UPG North America →](https://upgnorthamerica.com/project/wolof-in-north-america/)" },
  { n:"Egypt",        f:"🇪🇬", iso:"eg", r:"Africa", cf:"CAF", pop:"104M", rel:"Islam", u:11, ug:["Egyptian Arabs","Bedouin","Nubian"], cap:"Cairo", lang:"Arabic", m:"Egypt is home to the largest Arab Christian community—the Coptic Church—yet 90% remain Muslim.", diaspora:"🌎 Over 200,000 Egyptian Arabs live in North America, with major communities in New York, Los Angeles, and Toronto. [Meet them at UPG North America →](https://upgnorthamerica.com/project/egyptian-arabs-in-north-america/)" },
  { n:"Côte d'Ivoire",f:"🇨🇮", iso:"ci", r:"Africa", cf:"CAF", pop:"27M",  rel:"Islam/Christianity", u:12, ug:["Dioula","Malinke","Senufo"], cap:"Yamoussoukro", lang:"French", m:"The Muslim north of Côte d'Ivoire remains largely unreached by contextualized gospel witness." },
  { n:"South Africa", f:"🇿🇦", iso:"za", r:"Africa", cf:"CAF", pop:"60M",  rel:"Christianity", u:7,  ug:["Cape Malay Muslims","South Asian Muslims","Zulu traditionalists"], cap:"Pretoria", lang:"Zulu, Xhosa, Afrikaans, English (11 official)", m:"Despite a majority Christian identity, South Africa's Muslim and traditional communities need deeper engagement." },
  { n:"Algeria",      f:"🇩🇿", iso:"dz", r:"Africa", cf:"CAF", pop:"46M",  rel:"Islam", u:7,  ug:["Kabyle Berber","Tuareg","Arab Algerians"], cap:"Algiers", lang:"Arabic, Tamazight, French", m:"Algeria has seen remarkable church growth among Kabyle Berbers—one of Africa's great gospel stories.", diaspora:"🌎 Algerian Arabs and Berbers are concentrated in Montreal — one of the largest Algerian communities outside Algeria. [Meet them at UPG North America →](https://upgnorthamerica.com/project/algerian-arabs-in-north-america/)" },
  { n:"Ghana",        f:"🇬🇭", iso:"gh", r:"Africa", cf:"CAF", pop:"33M",  rel:"Christianity/Islam", u:10, ug:["Hausa","Frafra","Wala"], cap:"Accra", lang:"English, Akan, Hausa", m:"Ghana's Muslim north remains largely unreached, while its diaspora communities are growing across North America and Europe.", dia:"Significant Ghanaian communities in New York, London, and Toronto." },
  { n:"DR Congo",     f:"🇨🇩", iso:"cd", r:"Africa", cf:"CAF", pop:"100M", rel:"Christianity", u:18, ug:["Mongo","Luba","Kongo"], cap:"Kinshasa", lang:"French, Lingala, Swahili", m:"The DRC is home to more unreached people groups than any other African nation — many in remote river communities with no gospel access.", dia:"Growing Congolese diaspora in Montreal, Brussels, and several US cities." },
  { n:"Cabo Verde",   f:"🇨🇻", iso:"cv", r:"Africa", cf:"CAF", pop:"560K", rel:"Christianity", u:2,  ug:["Cape Verdean Creole","West African migrants","Returning diaspora"], cap:"Praia", lang:"Portuguese, Cape Verdean Creole", m:"Cabo Verde is majority Christian but serves as a migration hub — its diaspora is scattered across Portugal, the Netherlands, and New England.", dia:"One of the largest diaspora-to-home-population ratios in the world; strong Cape Verdean community in Boston and Providence." },

  // Asia (9)
  { n:"Japan",        f:"🇯🇵", iso:"jp", r:"Asia", cf:"AFC", pop:"125M", rel:"Buddhism/Shinto", u:16, ug:["Japanese Buddhists","Korean Japanese","Zainichi Koreans"], cap:"Tokyo", lang:"Japanese", m:"Japan is often called one of the world's hardest mission fields—less than 1% Christian after 150 years of mission." },
  { n:"South Korea",  f:"🇰🇷", iso:"kr", r:"Asia", cf:"AFC", pop:"52M",  rel:"Christianity/Buddhism", u:9,  ug:["Korean Buddhists","Chinese Koreans","Southeast Asian migrants"], cap:"Seoul", lang:"Korean", m:"South Korea has become a major missionary-sending nation—over 20,000 Korean missionaries serve globally." },
  { n:"Iran",         f:"🇮🇷", iso:"ir", r:"Asia", cf:"AFC", pop:"87M",  rel:"Islam (Shia)", u:14, ug:["Persian Iranians","Azerbaijani Iranians","Kurdish Iranians"], cap:"Tehran", lang:"Persian (Farsi)", m:"Iran has one of the fastest-growing church movements in the world—mostly underground house churches.", diaspora:"🌎 Over 400,000 Persians live in North America — with the largest community in Los Angeles, sometimes called 'Tehrangeles.' [Meet them at UPG North America →](https://upgnorthamerica.com/project/persians-in-north-america/)" },
  { n:"Saudi Arabia", f:"🇸🇦", iso:"sa", r:"Asia", cf:"AFC", pop:"35M",  rel:"Islam", u:10, ug:["Saudi Arabs","Yemeni workers","South Asian migrants"], cap:"Riyadh", lang:"Arabic", m:"The birthplace of Islam—yet Saudi Arabia has seen a remarkable wave of Saudis turning to Christ.", diaspora:"🌎 Saudi Arabs are present across North America, often in university cities and major metros. [Meet them at UPG North America →](https://upgnorthamerica.com/project/saudi-arabs-in-north-america/)" },
  { n:"Australia",    f:"🇦🇺", iso:"au", r:"Asia", cf:"AFC", pop:"26M",  rel:"Christianity (nominal)", u:19, ug:["Chinese Australians","Lebanese Australians","Afghan Australians"], cap:"Canberra", lang:"English", m:"Australia's cities are home to growing diaspora communities from Southeast Asia and the Middle East." },
  { n:"Uzbekistan",   f:"🇺🇿", iso:"uz", r:"Asia", cf:"AFC", pop:"36M",  rel:"Islam", u:6,  ug:["Uzbeks","Tajiks","Karakalpaks"], cap:"Tashkent", lang:"Uzbek", m:"Central Asia's most populous nation—Uzbekistan's church faces significant pressure but continues to grow.", diaspora:"🌎 Uzbek communities have formed in New York, Toronto, and other North American cities, largely through recent immigration. [Meet them at UPG North America →](https://upgnorthamerica.com/project/uzbeks-in-north-america/)" },
  { n:"Jordan",       f:"🇯🇴", iso:"jo", r:"Asia", cf:"AFC", pop:"10M",  rel:"Islam", u:8,  ug:["Jordanian Arabs","Palestinian refugees","Iraqi refugees"], cap:"Amman", lang:"Arabic", m:"Jordan hosts one of the largest refugee populations per capita—a mission field and bridge to the Arab world.", diaspora:"🌎 Jordanian Arabs live across North America, with notable communities in Detroit, New York, and Toronto. [Meet them at UPG North America →](https://upgnorthamerica.com/project/jordanian-arabs-in-north-america/)" },
  { n:"Qatar",        f:"🇶🇦", iso:"qa", r:"Asia", cf:"AFC", pop:"2.9M", rel:"Islam", u:5,  ug:["Qatari Arabs","South Asian migrants","Filipino workers"], cap:"Doha", lang:"Arabic", m:"Qatar's migrant worker population (over 85% of residents) includes many unreached South Asians." },
  { n:"Iraq",         f:"🇮🇶", iso:"iq", r:"Asia", cf:"AFC", pop:"41M",  rel:"Islam", u:22, ug:["Iraqi Arabs","Kurds","Yazidis"], cap:"Baghdad", lang:"Arabic, Kurdish", m:"Iraq's Yazidi and Kurdish peoples have faced devastating persecution — yet both communities show remarkable openness to the gospel in the aftermath of trauma.", diaspora:"🌎 Over 200,000 Iraqi Arabs live in North America — with the largest community in the Detroit metro area. [Meet them at UPG North America →](https://upgnorthamerica.com/project/iraqi-arabs-in-north-america/)" },

  // Oceania (1)
  { n:"New Zealand",  f:"🇳🇿", iso:"nz", r:"Oceania", cf:"OFC", pop:"5.1M", rel:"Christianity (nominal)", u:9, ug:["Māori","Pacific Islander NZ","Chinese New Zealanders"], cap:"Wellington", lang:"English, Māori", m:"New Zealand's Māori people are experiencing revival—and Polynesian churches are sending missionaries across the Pacific." },
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

const REGIONS = ["All","Americas","Europe","Africa","Asia","Oceania"];

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
// TODO: hover cards for Bible verse links (Phase 3 UI polish)
function NationModal({ nation, onClose, gameState, updateGameState }) {
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
          <FlagImg iso={nation.iso} f={nation.f} size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", lineHeight: 1.2 }}>
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

              {nation.diaspora && (
                <div style={{ background: "#EEF3FA", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, lineHeight: 1.6, color: C.text }}>
                    {(() => {
                      const lm = nation.diaspora.match(/\[([^\]]+)\]\(([^)]+)\)/);
                      if (!lm) return nation.diaspora;
                      return <>{nation.diaspora.slice(0, lm.index)}<a href={lm[2]} target="_blank" rel="noreferrer" style={{ color: C.blue, fontWeight: 600 }}>{lm[1]}</a></>;
                    })()}
                  </div>
                </div>
              )}

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

              {/* Prayer */}
              {gameState && (gameState.prayedNations || []).includes(nation.n) ? (
                <div style={{ marginTop: 12, textAlign: "center", fontFamily: "Montserrat, sans-serif", fontSize: 14, color: C.blue, fontWeight: 600 }}>
                  ✓ You prayed for {nation.n}
                </div>
              ) : (
                <button
                  onClick={() => updateGameState({ prayedNations: [...(gameState?.prayedNations || []), nation.n] })}
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
function DailyDigest({ gameState, updateGameState, initialDay, onBack }) {
  const today = new Date();
  const startOfTournament = new Date("2026-06-11");
  let defaultDay = 0;
  if (today >= startOfTournament) {
    const diff = Math.floor((today - startOfTournament) / 86400000);
    defaultDay = Math.min(diff, RAW_SCHEDULE.length - 1);
  }
  const [dayIdx, setDayIdx] = useState(initialDay ?? defaultDay);
  const [selectedNation, setSelectedNation] = useState(null);
  const day = RAW_SCHEDULE[dayIdx];
  const matchesToShow = day.matches;

  return (
    <div style={{ paddingBottom: 100 }}>
      <NationModal nation={selectedNation} onClose={() => setSelectedNation(null)} gameState={gameState} updateGameState={updateGameState} />

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
        <button onClick={() => { if (dayIdx < RAW_SCHEDULE.length - 1) { setDayIdx(dayIdx + 1); } }} disabled={dayIdx === RAW_SCHEDULE.length - 1} style={{
          background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
          borderRadius: 10, padding: "10px 18px", fontSize: 18, cursor: "pointer",
          opacity: dayIdx === RAW_SCHEDULE.length - 1 ? 0.3 : 1, fontFamily: "Montserrat, sans-serif", fontWeight: 700,
        }}>Next →</button>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Devotional */}
        <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${C.blue}30`, boxShadow: "0 4px 20px rgba(27,69,106,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 16, color: C.indigo }}>Today's Devotional</div>
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
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 17, lineHeight: 1.75, color: C.text }}>
            {day.dev}
          </div>
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
              {RAW_SCHEDULE.map((s, i) => (
                <button key={i} onClick={() => { setDayIdx(i); window.scrollTo(0,0); }} style={{
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

        {/* Check-in */}
        {(() => {
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
                onClick={() => {
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
function DigestHome({ gameState, onCardTap }) {
  const carouselRef = useRef(null);

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
    if (carouselRef.current && todayIdx >= 0) {
      const cards = carouselRef.current.querySelectorAll('.devo-card');
      if (cards[todayIdx]) {
        cards[todayIdx].scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }
  }, [todayIdx]);

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
          const locked    = isFuture && gameState.journeyMode;
          const isActive  = i === activeCard;
          const cardClass = isActive ? "today" : (locked ? "future" : "past");
          const cardStyle = isActive ? {} : { opacity: 0.75, transform: 'scale(0.92)' };
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
            background: `linear-gradient(to top, rgba(10,20,40,0.88) 0%, rgba(10,20,40,0.35) 65%, rgba(10,20,40,0.15) 100%), url('${d.img}') center / cover no-repeat`,
          } : {};

          return (
            <div
              key={i}
              className={`devo-card ${cardClass}`}
              style={cardStyle}
              onClick={locked ? undefined : () => onCardTap(i)}
            >
              <div className="devo-card-inner" style={innerStyle}>
                <div className="devo-flag-bg">{flag}</div>
                {locked ? (
                  <div className="devo-lock">🔒</div>
                ) : isPrayed ? (
                  <div className="devo-checked-badge">✓ Prayed</div>
                ) : (
                  <div className="devo-day-badge">
                    {isToday ? `Today · Day ${i + 1}` : `Day ${i + 1}`}
                  </div>
                )}
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
function AllNations({ gameState, updateGameState }) {
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
      <NationModal nation={selectedNation} onClose={() => setSelectedNation(null)} gameState={gameState} updateGameState={updateGameState} />

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
  .devo-card.future { opacity: 0.45; filter: grayscale(0.6); cursor: not-allowed; box-shadow: none; }

  .devo-card-inner {
    height: 260px; display: flex; flex-direction: column;
    justify-content: flex-end; padding: 16px; position: relative;
  }
  .devo-card.today  .devo-card-inner { background: linear-gradient(160deg, #1B456A 0%, #2a6ea6 60%, #1B456A 100%); }
  .devo-card.past   .devo-card-inner { background: linear-gradient(160deg, #2a5a8a 0%, #3E67AC 100%); }
  .devo-card.future .devo-card-inner { background: linear-gradient(160deg, #5a7a9a 0%, #8899AA 100%); }

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

  .devo-lock { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 28px; opacity: 0.6; }

  .devo-flag-main { font-size: 28px; margin-bottom: 6px; display: block; }
  .devo-nation { color: rgba(255,255,255,0.7); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; font-family: 'Montserrat', sans-serif; }
  .devo-theme  { color: white; font-size: 13px; font-weight: 700; line-height: 1.3; font-family: 'Libre Baskerville', serif; }
  .devo-card.today .devo-theme { font-size: 15px; }
  .devo-date   { color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 500; margin-top: 6px; font-family: 'Montserrat', sans-serif; }

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
        Your Prayer Journey
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
              style={d.img ? {
                backgroundImage: `linear-gradient(rgba(10,20,40,0.55) 0%, rgba(10,20,40,0.88) 100%), url(${d.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              } : undefined}
            >
              <div className="devo-card-inner">
                <div className="devo-flag-bg">
                  {featNations.length > 0
                    ? <FlagImg iso={featNations[0].iso} f={featNations[0].f} size={64} />
                    : <span style={{ fontSize: 64 }}>🌍</span>}
                </div>
                {isFuture ? (
                  <div className="devo-lock">🔒</div>
                ) : isPrayed ? (
                  <div className="devo-checked-badge">✓ Prayed</div>
                ) : (
                  <div className="devo-day-badge">
                    {isToday ? `Today · Day ${i + 1}` : `Day ${i + 1}`}
                  </div>
                )}
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
function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  if (!achievement) return null;
  const info = ACHIEVEMENT_LABELS[achievement];
  if (!info) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 80,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 3000,
      width: "calc(100% - 48px)",
      maxWidth: 480,
      background: C.indigo,
      borderRadius: 16,
      padding: 16,
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      <span style={{ fontSize: 24 }}>{info.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: C.white }}>
          {info.label}
        </div>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, color: "rgba(255,255,255,0.8)", fontStyle: "italic", marginTop: 3 }}>
          {info.desc}
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: "none", border: "none",
        color: "rgba(255,255,255,0.6)", fontSize: 16,
        cursor: "pointer", padding: "0 0 0 4px",
        fontFamily: "Montserrat, sans-serif", fontWeight: 700,
      }}>✕</button>
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

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [journeyPath, setJourneyPath] = useState(null);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [carouselIdx, setCarouselIdx] = useState(0);

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  function handleLogoTap() {
    const next = tapCount + 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (next >= 3) {
      try { localStorage.removeItem("pftc_game"); } catch {}
      setTapCount(0);
    } else {
      setTapCount(next);
      tapTimer.current = setTimeout(() => setTapCount(0), 800);
    }
  }

  function finishOnboarding(opts = {}) {
    onComplete({ journeyMode: journeyPath === true, ...opts });
  }

  function handleNotifAllow() {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(() => finishOnboarding());
    } else {
      finishOnboarding();
    }
  }

  // ─── STEP 1 — Welcome ───
  if (step === 1) {
    return (
      <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
        <ObNavyHeader>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
            <div
              onClick={handleLogoTap}
              style={{
                background: "#fff", borderRadius: 20,
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                cursor: "pointer", userSelect: "none",
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
            <input
              type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{
                padding: "16px 18px", borderRadius: 12,
                border: `2px solid ${OB.lightBlue}`, background: "#f6fbff",
                fontFamily: "Montserrat, sans-serif", fontSize: 16,
                outline: "none", color: OB.navy,
                boxSizing: "border-box", width: "100%",
              }}
            />
          </div>

          <ObOrangeBtn onClick={() => {
            try { localStorage.setItem("userProfile", JSON.stringify({ displayName, email })); } catch {}
            setStep(4);
          }}>
            Start My Prayer Journey →
          </ObOrangeBtn>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#CBD5E0" }} />
            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: "#8899AA", whiteSpace: "nowrap" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#CBD5E0" }} />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {["G  Google", "  Apple"].map(label => (
              <button key={label} onClick={() => alert("Coming soon — use email for now")} style={{
                flex: 1, padding: "14px", borderRadius: 12,
                border: "2px solid #CBD5E0", background: "#efefef",
                fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14,
                color: "#8899AA", cursor: "pointer",
              }}>{label.includes("Apple") ? "🍎 Apple" : "G  Google"}</button>
            ))}
          </div>

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

/* ─── MAIN APP ─── */
export default function App() {
  const [tab, setTab] = useState("digest");
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [gameState, updateGameState] = useGameState();
  const [pendingToast, setPendingToast] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);

  function handleOnboardingComplete({ journeyMode = false } = {}) {
    updateGameState({ hasOnboarded: true, journeyMode });
  }

  function handleGameStateUpdate(changes) {
    updateGameState(changes);
    const nextState = { ...gameState, ...changes };
    const newlyEarned = checkAchievements(nextState);
    if (newlyEarned.length > 0) {
      updateGameState({ goalsAchieved: [...(gameState.goalsAchieved || []), ...newlyEarned] });
      setToastQueue(q => [...q, ...newlyEarned]);
    }
  }

  useEffect(() => {
    if (toastQueue.length > 0 && pendingToast === null) {
      setPendingToast(toastQueue[0]);
      setToastQueue(q => q.slice(1));
    }
  }, [toastQueue, pendingToast]);

  if (!gameState.hasOnboarded) {
    return (
      <>
        <style>{FONTS}</style>
        <style>{`* { -webkit-tap-highlight-color: transparent; } body { margin: 0; background: #ffffff; } ::-webkit-scrollbar { display: none; } button { -webkit-appearance: none; } input { -webkit-appearance: none; }`}</style>
        <Onboarding onComplete={handleOnboardingComplete} />
      </>
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
                src="/images/global-gates-logo-white-BUG-transparent-background.png"
                alt="Global Gates"
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
        {showBanner && <HomeScreenBanner onDismiss={() => setShowBanner(false)} />}

        {/* Tab Bar */}
        <div style={{ background: C.indigo, padding: "8px 0 0" }}>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px", display: "flex", margin: "0 16px 12px" }}>
            {[
              { id: "digest", label: "🏠  Home" },
              { id: "nations", label: "🌍  All Nations" },
              ...(gameState.journeyMode ? [{ id: "journey", label: "🏆  My Journey" }] : []),
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
                />
              : <DigestHome gameState={gameState} onCardTap={setSelectedDayIdx} />
          ) : tab === "journey" ? (
            <MyJourney gameState={gameState} setTab={setTab} />
          ) : (
            <AllNations gameState={gameState} updateGameState={handleGameStateUpdate} />
          )}
        </div>

        <AchievementToast achievement={pendingToast} onDismiss={() => setPendingToast(null)} />

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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, marginRight: 16 }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>Journey Mode</div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>Track streaks, achievements, and your prayer score</div>
                  </div>
                  <ToggleSwitch value={gameState.journeyMode} onToggle={() => updateGameState({ journeyMode: !gameState.journeyMode })} />
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: C.brightGray, margin: "0 0 20px" }} />

              {/* Account row */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Account</div>
                <div onClick={() => setShowSettings(false)} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 20, marginRight: 12 }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 600, color: C.indigo }}>Sign In / Register</div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, color: C.blue, marginTop: 2 }}>Save your progress and join the prayer leaderboard</div>
                  </div>
                  <span style={{ fontSize: 18, color: C.blue, marginLeft: 8 }}>›</span>
                </div>
              </div>

              {/* Version line */}
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, color: C.blue, textAlign: "center", marginTop: 20 }}>
                Pray for the Cup · prayforthecup.com
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
    </>
  );
}
