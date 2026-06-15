import { useState, useEffect, useCallback, useRef } from "react";

const SB_URL = "https://lxzeqqzhsharbocxpvqg.supabase.co";
const SB_KEY = "sb_publishable_336LVuv08rcJtp86WswWFQ_rugDbPWT";

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function getAIAnalysis(history) {
  const summary = history
    .slice(-100)
    .map((h) => `Q${h.q_number} (${h.subtopic_name}): ${h.is_correct ? "✓" : "✗"}`)
    .join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You are an ATPL/CPL aviation exam coach for AeroPrep by FTA (Flyaway Training Academy, Sri Lanka). Analyse the student's recent question history and give a concise, actionable performance report. Format your response with: 1. Overall exam readiness % (based on recent correct rate) 2. Top 3 strongest subtopics 3. Top 3 weakest subtopics needing urgent focus 4. A specific 3-step study plan for the next week. Keep it encouraging, professional, and under 300 words. Use aviation terminology naturally.`,
      messages: [{ role: "user", content: `Here is my recent practice history:\n${summary}\n\nPlease analyse my performance and give me a personalised study plan.` }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Unable to generate analysis.";
}

const LICENCE_COLS = {
  air_atpl: ["air_atpl", "air_cpl", "air_ppl", "applicable_all"],
  air_cpl: ["air_cpl", "air_ppl", "applicable_all"],
  air_ppl: ["air_ppl", "applicable_all"],
  heli_atpl: ["heli_atpl", "heli_cpl", "heli_ppl", "applicable_all"],
  heli_cpl: ["heli_cpl", "heli_ppl", "applicable_all"],
  heli_ppl: ["heli_ppl", "applicable_all"],
};
const LICENCE_LABELS = { air_atpl: "AIR ATPL", air_cpl: "AIR CPL", air_ppl: "AIR PPL", heli_atpl: "HELI ATPL", heli_cpl: "HELI CPL", heli_ppl: "HELI PPL" };

function xpForLevel(lvl) { return lvl * lvl * 100; }
function levelFromXP(xp) { let l = 1; while (xp >= xpForLevel(l + 1)) l++; return l; }

const BADGES = [
  { id: "first_q", icon: "✈️", label: "First Flight", desc: "Answer your first question", check: (s) => s.totalAnswered >= 1 },
  { id: "streak_7", icon: "🔥", label: "On Fire", desc: "7-day streak", check: (s) => s.streak >= 7 },
  { id: "streak_30", icon: "⚡", label: "Unstoppable", desc: "30-day streak", check: (s) => s.streak >= 30 },
  { id: "correct_100", icon: "🎯", label: "Sharp Shooter", desc: "100 correct answers", check: (s) => s.totalCorrect >= 100 },
  { id: "correct_500", icon: "🏆", label: "Ace Pilot", desc: "500 correct answers", check: (s) => s.totalCorrect >= 500 },
  { id: "daily_done", icon: "📅", label: "Daily Challenger", desc: "Complete a daily challenge", check: (s) => s.dailyChallengesDone >= 1 },
  { id: "mock_pass", icon: "📋", label: "Cleared for Takeoff", desc: "Score 75%+ on a mock exam", check: (s) => s.bestMockScore >= 75 },
  { id: "subject_master", icon: "🌟", label: "Subject Master", desc: "80% mastery in any subject", check: (s) => s.bestSubjectMastery >= 80 },
];

const C = {
  green: "#00D46A", greenDim: "#00A854", navy: "#0A0F1E", navyCard: "#111827", navyCardHover: "#1a2436",
  blue: "#3B82F6", red: "#EF4444", amber: "#F59E0B", textLight: "#F9FAFB", textMuted: "#9CA3AF",
  border: "rgba(255,255,255,0.08)", lBg: "#F0F4F8", lCard: "#FFFFFF", lBorder: "rgba(0,0,0,0.08)", lText: "#111827", lMuted: "#6B7280",
};

function useTheme() {
  const [dark, setDark] = useState(() => { const s = localStorage.getItem("aeroprep_theme"); return s ? s === "dark" : true; });
  const toggle = () => setDark((d) => { localStorage.setItem("aeroprep_theme", !d ? "dark" : "light"); return !d; });
  return { dark, toggle };
}

function bg(dark) { return dark ? C.navy : C.lBg; }
function card(dark) { return dark ? C.navyCard : C.lCard; }
function cardHover(dark) { return dark ? C.navyCardHover : "#F3F4F6"; }
function border(dark) { return dark ? C.border : C.lBorder; }
function text(dark) { return dark ? C.textLight : C.lText; }
function muted(dark) { return dark ? C.textMuted : C.lMuted; }

function GlobalStyles({ dark }) {
  useEffect(() => {
    const el = document.getElementById("ap-global") || document.createElement("style");
    el.id = "ap-global";
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', sans-serif; background: ${bg(dark)}; color: ${text(dark)}; min-height: 100vh; transition: background 0.3s, color 0.3s; -webkit-font-smoothing: antialiased; }
      ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}; border-radius: 2px; }
      button { cursor: pointer; border: none; outline: none; font-family: 'Inter', sans-serif; }
      input, select, textarea { font-family: 'Inter', sans-serif; outline: none; }
      .ap-card { background: ${card(dark)}; border: 1px solid ${border(dark)}; border-radius: 16px; transition: background 0.2s, border 0.2s; }
      .ap-card-hover:hover { background: ${cardHover(dark)}; cursor: pointer; }
      .ap-btn-primary { background: ${C.green}; color: #000; font-weight: 600; border-radius: 12px; padding: 12px 24px; font-size: 15px; transition: opacity 0.15s, transform 0.1s; }
      .ap-btn-primary:hover { opacity: 0.9; } .ap-btn-primary:active { transform: scale(0.98); }
      .ap-btn-secondary { background: transparent; color: ${text(dark)}; font-weight: 500; border-radius: 12px; padding: 12px 24px; font-size: 15px; border: 1px solid ${border(dark)}; transition: background 0.15s; }
      .ap-btn-secondary:hover { background: ${cardHover(dark)}; }
      .ap-input { background: ${card(dark)}; border: 1px solid ${border(dark)}; border-radius: 10px; padding: 12px 16px; font-size: 15px; color: ${text(dark)}; width: 100%; transition: border 0.2s; }
      .ap-input:focus { border-color: ${C.green}; }
      .ap-input::placeholder { color: ${muted(dark)}; }
      .nav-btn { background: transparent; color: ${muted(dark)}; border-radius: 12px; padding: 8px 12px; font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: color 0.15s; min-width: 56px; }
      .nav-btn.active { color: ${C.green}; }
      .nav-btn:hover { color: ${text(dark)}; }
      .progress-bar { background: ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}; border-radius: 99px; overflow: hidden; }
      .progress-fill { background: linear-gradient(90deg, ${C.green}, ${C.blue}); border-radius: 99px; transition: width 0.6s ease; }
      .tag { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
      .tag-green { background: rgba(0,212,106,0.15); color: ${C.green}; }
      .tag-blue { background: rgba(59,130,246,0.15); color: ${C.blue}; }
      .tag-red { background: rgba(239,68,68,0.15); color: ${C.red}; }
      .tag-amber { background: rgba(245,158,11,0.15); color: ${C.amber}; }
      .shimmer { background: linear-gradient(90deg, ${dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} 25%, ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 50%, ${dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
      @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      .fade-in { animation: fadeIn 0.25s ease forwards; }
      .scale-in { animation: scaleIn 0.2s ease forwards; }
      @media (max-width: 768px) { .hide-mobile { display: none !important; } }
      @media (min-width: 769px) { .show-mobile { display: none !important; } }
    `;
    document.head.appendChild(el);
  }, [dark]);
  return null;
}

function Logo({ size = 32 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill={C.green} />
        <path d="M8 26L16 14L22 20L28 12L32 16" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="16" r="2.5" fill="#000" />
        <path d="M20 28H32" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 28H14" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: size * 0.5, color: C.green, lineHeight: 1 }}>AeroPrep</div>
        <div style={{ fontSize: size * 0.28, color: "#6B7280", lineHeight: 1, marginTop: 1 }}>by FTA</div>
      </div>
    </div>
  );
}

function StreakFlame({ count, dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.12)", borderRadius: 10, padding: "6px 12px" }}>
      <span style={{ fontSize: 18 }}>🔥</span>
      <span style={{ fontWeight: 700, color: C.amber, fontSize: 15 }}>{count}</span>
      <span style={{ fontSize: 12, color: muted(dark) }}>day streak</span>
    </div>
  );
}

function XPBar({ xp, dark }) {
  const level = levelFromXP(xp);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const pct = Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ background: C.green, color: "#000", fontWeight: 700, fontSize: 12, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>L{level}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: muted(dark) }}>{xp.toLocaleString()} XP</span>
          <span style={{ fontSize: 11, color: muted(dark) }}>{nextLevelXP.toLocaleString()} XP</span>
        </div>
        <div className="progress-bar" style={{ height: 6 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, height: "100%" }} />
        </div>
      </div>
    </div>
  );
}

function Skeleton({ h = 20, w = "100%", mb = 8 }) {
  return <div className="shimmer" style={{ height: h, width: w, marginBottom: mb }} />;
}

function LoginScreen({ onLogin, dark }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const users = await sbFetch(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (!users.length) { setErr("No account found with this email."); return; }
      const user = users[0];
      if (user.password_hash !== btoa(password)) { setErr("Incorrect password."); return; }
      const licences = await sbFetch(`licence_keys?user_id=eq.${user.id}&is_active=eq.true&select=*`);
      if (!licences.length) { setErr("No active subscription. Please activate a code first."); return; }
      const licence = licences[0];
      if (new Date(licence.valid_until) < new Date()) { setErr("Your subscription has expired. Contact FTA to renew."); return; }
      onLogin(user, licence);
    } catch (e) { setErr("Login failed. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleActivate(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const keys = await sbFetch(`licence_keys?key_code=eq.${encodeURIComponent(code.trim().toUpperCase())}&select=*`);
      if (!keys.length) { setErr("Invalid activation code. Please check and try again."); return; }
      const key = keys[0];
      if (key.user_id) { setErr("This code has already been activated."); return; }
      if (new Date(key.valid_until) < new Date()) { setErr("This activation code has expired."); return; }
      let users = await sbFetch(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      let user = users[0];
      if (!user) {
        const created = await sbFetch("users", { method: "POST", body: JSON.stringify({ email, full_name: email.split("@")[0], password_hash: btoa(password) }) });
        user = created[0];
      }
      await sbFetch(`licence_keys?id=eq.${key.id}`, { method: "PATCH", body: JSON.stringify({ user_id: user.id, is_active: true }) });
      onLogin(user, { ...key, user_id: user.id });
    } catch (e) { setErr("Activation failed. Please try again."); console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", background: bg(dark) }}>
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,106,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", left: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="fade-in" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Logo size={44} />
          <p style={{ marginTop: 12, color: muted(dark), fontSize: 14 }}>Your ATPL & CPL exam companion</p>
        </div>
        <div className="ap-card" style={{ padding: 32 }}>
          <div style={{ display: "flex", gap: 4, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {[["login", "Sign In"], ["activate", "Activate Code"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: mode === m ? (dark ? "#1F2937" : "#FFF") : "transparent", color: mode === m ? text(dark) : muted(dark), border: "none", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={mode === "login" ? handleLogin : handleActivate}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: muted(dark), marginBottom: 6 }}>Email address</label>
              <input className="ap-input" type="email" placeholder="captain@flyaway.lk" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: mode === "activate" ? 16 : 0 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: muted(dark), marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input className="ap-input" type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", color: muted(dark), fontSize: 18 }}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {mode === "activate" && (
              <div style={{ marginBottom: 0 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: muted(dark), marginBottom: 6 }}>Activation code</label>
                <input className="ap-input" placeholder="e.g. ATPL-X7K2-9QP4-3M" value={code} onChange={e => setCode(e.target.value)} required style={{ textTransform: "uppercase", letterSpacing: "0.05em" }} />
              </div>
            )}
            {err && <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, color: C.red }}>{err}</div>}
            <button className="ap-btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 20, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Activate & Start"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: muted(dark) }}>
          Contact <a href="https://flyaway.lk" style={{ color: C.green, textDecoration: "none" }} target="_blank" rel="noopener noreferrer">Flyaway Training Academy</a> to get a subscription
        </p>
      </div>
    </div>
  );
}

const SUBJECT_ICONS = { "022": "🎛️", "021": "⚙️", "010": "🌍", "033": "✈️", "050": "🌤️", "062": "🧭", "031": "📊", "032": "📡", "040": "🧠", "070": "⚖️", "080": "🔧", "034": "📻", "020": "⚡", "091": "📖" };

function SubjectCard({ subject, mastery, dark, onClick }) {
  const icon = SUBJECT_ICONS[subject.subject_code] || "📚";
  const masteryColor = mastery >= 80 ? C.green : mastery >= 50 ? C.amber : C.red;
  return (
    <div className="ap-card ap-card-hover fade-in" onClick={onClick}
      style={{ padding: "20px", cursor: "pointer", transition: "transform 0.15s", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
      {mastery >= 80 && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 16 }}>🌟</div>}
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 11, color: muted(dark), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{subject.subject_code}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: text(dark), marginBottom: 12, lineHeight: 1.3 }}>{subject.subject_name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: muted(dark) }}>{subject.total} questions</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: masteryColor }}>{mastery}%</span>
      </div>
      <div className="progress-bar" style={{ height: 4 }}>
        <div style={{ width: `${mastery}%`, height: "100%", background: masteryColor, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function HomeScreen({ user, licence, stats, subjects, history, dark, onSelectSubject, onDailyChallenge }) {
  const [greeting] = useState(() => { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; });
  const earnedBadges = BADGES.filter(b => b.check(stats));
  const recentSubjects = [...subjects].filter(s => history.some(h => h.subject_code === s.subject_code)).slice(0, 3);
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 13, color: muted(dark), marginBottom: 2 }}>{greeting},</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: text(dark) }}>{user.full_name?.split(" ")[0] || "Captain"} 👋</h1>
          <p style={{ fontSize: 12, color: muted(dark), marginTop: 2 }}>{LICENCE_LABELS[licence.licence_type] || licence.licence_type} · Expires {new Date(licence.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <StreakFlame count={stats.streak} dark={dark} />
      </div>
      <div className="ap-card" style={{ padding: 16, marginBottom: 20 }}>
        <XPBar xp={stats.xp} dark={dark} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Answered", value: stats.totalAnswered.toLocaleString(), icon: "📝" },
          { label: "Correct", value: `${stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0}%`, icon: "🎯" },
          { label: "Subjects", value: `${subjects.length}`, icon: "📚" },
        ].map(s => (
          <div key={s.label} className="ap-card" style={{ padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: text(dark), fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: muted(dark), marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="ap-card" style={{ padding: 20, marginBottom: 24, border: `1px solid rgba(0,212,106,0.2)` }} onClick={onDailyChallenge}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Daily Challenge</span>
              <span className="tag tag-green">+50 XP</span>
            </div>
            <p style={{ fontSize: 13, color: muted(dark) }}>10 random questions · All subjects · Timed</p>
          </div>
          <button className="ap-btn-primary" style={{ padding: "10px 18px", fontSize: 13, whiteSpace: "nowrap" }}>Fly Now ✈️</button>
        </div>
        {stats.dailyChallengeToday && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(0,212,106,0.1)", borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 600 }}>
            ✓ Challenge completed today! Come back tomorrow for more XP
          </div>
        )}
      </div>
      {earnedBadges.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: text(dark), marginBottom: 12 }}>Your Badges</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {earnedBadges.map(b => (
              <div key={b.id} className="ap-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{b.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: text(dark) }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: muted(dark) }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {recentSubjects.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: text(dark), marginBottom: 12 }}>Continue Studying</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {recentSubjects.map(s => {
              const sh = history.filter(h => h.subject_code === s.subject_code);
              const mastery = sh.length > 0 ? Math.round((sh.filter(h => h.is_correct).length / sh.length) * 100) : 0;
              return <SubjectCard key={s.subject_code} subject={s} mastery={mastery} dark={dark} onClick={() => onSelectSubject(s)} />;
            })}
          </div>
        </div>
      )}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: text(dark), marginBottom: 12 }}>All Subjects</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {subjects.map(s => {
            const sh = history.filter(h => h.subject_code === s.subject_code);
            const mastery = sh.length > 0 ? Math.round((sh.filter(h => h.is_correct).length / sh.length) * 100) : 0;
            return <SubjectCard key={s.subject_code} subject={s} mastery={mastery} dark={dark} onClick={() => onSelectSubject(s)} />;
          })}
        </div>
      </div>
    </div>
  );
}

function ExamPickerScreen({ subject, dark, onStart, onBack }) {
  const [mode, setMode] = useState(null);
  const [qCount, setQCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const MODES = [
    { id: "practice", icon: "📖", label: "Practice Mode", desc: "Instant feedback after each question, no pressure", tag: "Recommended", tagClass: "tag-green" },
    { id: "mock", icon: "📋", label: "Mock Exam", desc: "Exam conditions — results revealed at the end", tag: "Exam Sim", tagClass: "tag-blue" },
    { id: "weak", icon: "🎯", label: "Weak Areas", desc: "Focus on questions you have gotten wrong before", tag: "Targeted", tagClass: "tag-amber" },
    { id: "timed_sprint", icon: "⚡", label: "Timed Sprint", desc: "Race against the clock for bonus XP", tag: "+2x XP", tagClass: "tag-red" },
  ];
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 600, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", color: muted(dark), fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: text(dark) }}>{subject.subject_name}</h1>
        <p style={{ fontSize: 13, color: muted(dark), marginTop: 4 }}>{subject.subject_code} · {subject.total} questions available</p>
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: muted(dark), marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Choose exam mode</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {MODES.map(m => (
          <div key={m.id} className="ap-card ap-card-hover" onClick={() => setMode(m.id)}
            style={{ padding: "18px 20px", cursor: "pointer", border: mode === m.id ? `1px solid ${C.green}` : `1px solid ${border(dark)}`, transition: "all 0.15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: text(dark), marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 13, color: muted(dark) }}>{m.desc}</div>
                </div>
              </div>
              <span className={`tag ${m.tagClass}`}>{m.tag}</span>
            </div>
          </div>
        ))}
      </div>
      {mode && (
        <div className="ap-card scale-in" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: text(dark), marginBottom: 16 }}>Configure your session</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: muted(dark), display: "block", marginBottom: 8 }}>Number of questions</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 20, 30, 50, subject.total].filter((v, i, a) => a.indexOf(v) === i && v <= subject.total).map(n => (
                <button key={n} onClick={() => setQCount(n)}
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: qCount === n ? C.green : "transparent", color: qCount === n ? "#000" : text(dark), border: `1px solid ${qCount === n ? C.green : border(dark)}`, transition: "all 0.15s" }}>
                  {n === subject.total ? "All" : n}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: text(dark) }}>Enable timer</div>
              <div style={{ fontSize: 12, color: muted(dark) }}>Adds time pressure like the real exam</div>
            </div>
            <button onClick={() => setTimed(!timed)}
              style={{ width: 44, height: 24, borderRadius: 12, background: timed ? C.green : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"), position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FFF", position: "absolute", top: 3, left: timed ? 23 : 3, transition: "left 0.2s" }} />
            </button>
          </div>
          {timed && (
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, color: muted(dark), display: "block", marginBottom: 8 }}>Time limit: {minutes} minutes</label>
              <input type="range" min="5" max="120" step="5" value={minutes} onChange={e => setMinutes(+e.target.value)} style={{ width: "100%", accentColor: C.green }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: muted(dark), marginTop: 4 }}>
                <span>5 min</span><span>120 min</span>
              </div>
            </div>
          )}
        </div>
      )}
      {mode && (
        <button className="ap-btn-primary" style={{ width: "100%", fontSize: 16, padding: "16px" }} onClick={() => onStart({ mode, qCount, timed, minutes })}>
          Start {MODES.find(m2 => m2.id === mode)?.label} ✈️
        </button>
      )}
    </div>
  );
}

function QuizScreen({ questions, config, dark, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(config.timed ? config.minutes * 60 : null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (config.timed && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); onComplete(answers); return 0; } return t - 1; }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, []);

  const q = questions[idx];
  const isPractice = config.mode === "practice" || config.mode === "weak" || config.mode === "timed_sprint";

  function handleSelect(opt) {
    if (revealed && isPractice) return;
    setSelected(opt);
    if (isPractice) setRevealed(true);
  }

  function handleNext() {
    const isCorrect = selected === q.correct_answer;
    const newAnswers = [...answers, { question_id: q.id, q_number: q.q_number, subject_code: q.subject_code, subtopic_name: q.subtopic_name, selected_answer: selected, is_correct: isCorrect }];
    setAnswers(newAnswers);
    if (idx + 1 >= questions.length) { onComplete(newAnswers); }
    else { setIdx(idx + 1); setSelected(null); setRevealed(false); }
  }

  function optLabel(key) { return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[key]; }

  function optStyle(key) {
    const base = { padding: "14px 18px", borderRadius: 12, cursor: "pointer", fontSize: 14, textAlign: "left", width: "100%", transition: "all 0.15s", border: `1px solid ${border(dark)}`, marginBottom: 10, color: text(dark), background: card(dark), display: "block", lineHeight: 1.5 };
    if (!revealed) { if (selected === key) return { ...base, border: `1px solid ${C.blue}`, background: dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)" }; return base; }
    if (key === q.correct_answer) return { ...base, border: `1px solid ${C.green}`, background: dark ? "rgba(0,212,106,0.15)" : "rgba(0,212,106,0.08)", color: C.green, fontWeight: 600 };
    if (key === selected && key !== q.correct_answer) return { ...base, border: `1px solid ${C.red}`, background: dark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)", color: C.red };
    return { ...base, opacity: 0.5 };
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progress = Math.round((idx / questions.length) * 100);

  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => { if (window.confirm("Exit quiz? Progress will be lost.")) onComplete(answers); }} style={{ background: "none", color: muted(dark), fontSize: 13 }}>✕ Exit</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: text(dark) }}>{idx + 1} / {questions.length}</span>
        {config.timed && timeLeft !== null ? (
          <span style={{ fontSize: 14, fontWeight: 700, color: timeLeft < 60 ? C.red : C.green, background: dark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)", padding: "4px 10px", borderRadius: 8 }}>⏱ {formatTime(timeLeft)}</span>
        ) : <div style={{ width: 60 }} />}
      </div>
      <div className="progress-bar" style={{ height: 4, marginBottom: 24 }}>
        <div className="progress-fill" style={{ width: `${progress}%`, height: "100%" }} />
      </div>
      <div className="ap-card fade-in" key={idx} style={{ padding: "24px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span className="tag tag-blue">{q.subject_code}</span>
          <span className="tag" style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: muted(dark) }}>{q.subtopic_name}</span>
          <span className="tag" style={{ background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: muted(dark) }}>Q{q.q_number}</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 500, color: text(dark), lineHeight: 1.6 }}>{q.question}</p>
      </div>
      <div>
        {["A", "B", "C", "D"].map(key => (
          <button key={key} style={optStyle(key)} onClick={() => handleSelect(key)}>
            <span style={{ fontWeight: 700, marginRight: 10, opacity: 0.5 }}>{key}</span>{optLabel(key)}
          </button>
        ))}
      </div>
      {revealed && isPractice && (
        <div className="scale-in" style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 16, background: selected === q.correct_answer ? "rgba(0,212,106,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${selected === q.correct_answer ? "rgba(0,212,106,0.3)" : "rgba(239,68,68,0.3)"}` }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: selected === q.correct_answer ? C.green : C.red, marginBottom: 4 }}>
            {selected === q.correct_answer ? "✓ Correct! +10 XP" : `✗ Incorrect — answer was ${q.correct_answer}`}
          </p>
          {q.needs_review && <p style={{ fontSize: 12, color: C.amber }}>⚠️ This question is flagged for review.</p>}
        </div>
      )}
      {(revealed || !isPractice) && selected && (
        <button className="ap-btn-primary scale-in" style={{ width: "100%", padding: "16px", fontSize: 15, marginTop: 8 }} onClick={handleNext}>
          {idx + 1 >= questions.length ? "See Results 📊" : "Next Question →"}
        </button>
      )}
      {!isPractice && !selected && <p style={{ textAlign: "center", fontSize: 13, color: muted(dark), marginTop: 16 }}>Select an answer to continue</p>}
    </div>
  );
}

function ResultsScreen({ answers, config, dark, onRetry, onHome, xpEarned }) {
  const total = answers.length;
  const correct = answers.filter(a => a.is_correct).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 75;
  const bySubtopic = {};
  answers.forEach(a => {
    if (!bySubtopic[a.subtopic_name]) bySubtopic[a.subtopic_name] = { correct: 0, total: 0 };
    bySubtopic[a.subtopic_name].total++;
    if (a.is_correct) bySubtopic[a.subtopic_name].correct++;
  });
  const wrongAnswers = answers.filter(a => !a.is_correct);
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 600, margin: "0 auto" }}>
      <div className="fade-in" style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{pct >= 90 ? "🏆" : pct >= 75 ? "✅" : pct >= 50 ? "📈" : "📚"}</div>
        <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: passed ? C.green : C.amber }}>{pct}%</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: text(dark), marginTop: 4 }}>{passed ? "Well done! You passed." : "Keep practising — you will get there."}</div>
        <div style={{ fontSize: 14, color: muted(dark), marginTop: 6 }}>{correct} correct out of {total} questions</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, background: "rgba(0,212,106,0.12)", borderRadius: 10, padding: "6px 16px" }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, color: C.green }}>+{xpEarned} XP earned</span>
        </div>
      </div>
      <div className="ap-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: text(dark), marginBottom: 16 }}>Subtopic Breakdown</h3>
        {Object.entries(bySubtopic).map(([name, data]) => {
          const p = Math.round((data.correct / data.total) * 100);
          return (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: text(dark) }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: p >= 75 ? C.green : p >= 50 ? C.amber : C.red }}>{p}%</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div style={{ width: `${p}%`, height: "100%", background: p >= 75 ? C.green : p >= 50 ? C.amber : C.red, borderRadius: 99, transition: "width 0.8s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: muted(dark), marginTop: 3 }}>{data.correct}/{data.total} correct</div>
            </div>
          );
        })}
      </div>
      {wrongAnswers.length > 0 && (
        <div className="ap-card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: text(dark), marginBottom: 12 }}>Review These Questions</h3>
          <p style={{ fontSize: 13, color: muted(dark), marginBottom: 12 }}>You got {wrongAnswers.length} wrong. Practice these in Weak Areas mode.</p>
          {wrongAnswers.slice(0, 5).map((a, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${border(dark)}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: text(dark) }}>Q{a.q_number} · {a.subtopic_name}</span>
              <span className="tag tag-red">Incorrect</span>
            </div>
          ))}
          {wrongAnswers.length > 5 && <p style={{ fontSize: 12, color: muted(dark), marginTop: 8 }}>+{wrongAnswers.length - 5} more</p>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="ap-btn-primary" style={{ padding: "16px", fontSize: 15 }} onClick={onRetry}>Try Again ↻</button>
        <button className="ap-btn-secondary" style={{ padding: "16px", fontSize: 15 }} onClick={onHome}>Back to Dashboard</button>
      </div>
    </div>
  );
}

function ProgressScreen({ user, history, subjects, stats, dark, onAIAnalysis, aiLoading }) {
  const sessionsGrouped = {};
  history.forEach(h => {
    const day = new Date(h.answered_at).toLocaleDateString("en-GB");
    if (!sessionsGrouped[day]) sessionsGrouped[day] = { correct: 0, total: 0 };
    sessionsGrouped[day].total++;
    if (h.is_correct) sessionsGrouped[day].correct++;
  });
  const dayEntries = Object.entries(sessionsGrouped).slice(-7).reverse();
  const subjectStats = subjects.map(s => {
    const sh = history.filter(h => h.subject_code === s.subject_code);
    const c = sh.filter(h => h.is_correct).length;
    return { ...s, attempted: sh.length, correct: c, mastery: sh.length > 0 ? Math.round((c / sh.length) * 100) : 0 };
  }).sort((a, b) => b.attempted - a.attempted);
  const overallPct = history.length > 0 ? Math.round((history.filter(h => h.is_correct).length / history.length) * 100) : 0;
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: text(dark), marginBottom: 24 }}>Your Progress</h1>
      <div className="ap-card" style={{ padding: 20, marginBottom: 24, border: `1px solid rgba(59,130,246,0.25)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.blue }}>AI Analysis</span>
            </div>
            <p style={{ fontSize: 13, color: muted(dark) }}>{history.length < 20 ? `Answer ${20 - history.length} more questions to unlock` : "Get a personalised study plan powered by Claude AI"}</p>
          </div>
          <button className="ap-btn-primary" disabled={history.length < 20 || aiLoading} onClick={onAIAnalysis}
            style={{ padding: "10px 18px", fontSize: 13, opacity: history.length < 20 ? 0.4 : 1, background: C.blue, whiteSpace: "nowrap" }}>
            {aiLoading ? "Analysing…" : "Analyse ✨"}
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total answered", value: history.length.toLocaleString(), icon: "📝" },
          { label: "Overall accuracy", value: `${overallPct}%`, icon: "🎯" },
          { label: "Current streak", value: `${stats.streak} days`, icon: "🔥" },
          { label: "Total XP", value: stats.xp.toLocaleString(), icon: "⚡" },
        ].map(s => (
          <div key={s.label} className="ap-card" style={{ padding: "18px 16px" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: text(dark), fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: muted(dark), marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {dayEntries.length > 0 && (
        <div className="ap-card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: text(dark), marginBottom: 16 }}>Recent Activity (last 7 days)</h3>
          {dayEntries.map(([day, data]) => {
            const p = Math.round((data.correct / data.total) * 100);
            return (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: muted(dark), width: 80, flexShrink: 0 }}>{day}</span>
                <div className="progress-bar" style={{ flex: 1, height: 8 }}>
                  <div style={{ width: `${p}%`, height: "100%", background: p >= 75 ? C.green : p >= 50 ? C.amber : C.red, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: text(dark), width: 40, textAlign: "right" }}>{p}%</span>
                <span style={{ fontSize: 11, color: muted(dark), width: 50, textAlign: "right" }}>{data.total} Qs</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="ap-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: text(dark), marginBottom: 16 }}>Subject Performance</h3>
        {subjectStats.filter(s => s.attempted > 0).length === 0 && (
          <p style={{ fontSize: 14, color: muted(dark), textAlign: "center", padding: "20px 0" }}>No practice sessions yet. Start studying to see your progress!</p>
        )}
        {subjectStats.filter(s => s.attempted > 0).map(s => (
          <div key={s.subject_code} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{SUBJECT_ICONS[s.subject_code] || "📚"}</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: text(dark) }}>{s.subject_name}</span>
                  <span style={{ fontSize: 11, color: muted(dark), marginLeft: 6 }}>{s.attempted} attempted</span>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.mastery >= 75 ? C.green : s.mastery >= 50 ? C.amber : C.red }}>{s.mastery}%</span>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div style={{ width: `${s.mastery}%`, height: "100%", background: s.mastery >= 75 ? C.green : s.mastery >= 50 ? C.amber : C.red, borderRadius: 99, transition: "width 0.8s" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIAnalysisScreen({ analysis, dark, onBack }) {
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 640, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", color: muted(dark), fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: text(dark) }}>AI Performance Analysis</h1>
          <p style={{ fontSize: 13, color: muted(dark) }}>Powered by Claude AI · AeroPrep by FTA</p>
        </div>
      </div>
      <div className="ap-card" style={{ padding: 24 }}>
        <div style={{ fontSize: 14, color: text(dark), lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{analysis}</div>
      </div>
      <p style={{ fontSize: 12, color: muted(dark), textAlign: "center", marginTop: 16 }}>Analysis based on your recent practice history.</p>
    </div>
  );
}

function ProfileScreen({ user, licence, stats, dark, toggleDark, onLogout }) {
  const level = levelFromXP(stats.xp);
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: text(dark), marginBottom: 24 }}>Profile</h1>
      <div className="ap-card" style={{ padding: 24, marginBottom: 20, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#000", margin: "0 auto 12px" }}>
          {(user.full_name || user.email)[0].toUpperCase()}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: text(dark) }}>{user.full_name || user.email.split("@")[0]}</h2>
        <p style={{ fontSize: 13, color: muted(dark), marginTop: 2 }}>{user.email}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <span className="tag tag-green">{LICENCE_LABELS[licence.licence_type]}</span>
          <span className="tag tag-blue">Level {level}</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: muted(dark), marginBottom: 4 }}>Subscription expires</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: text(dark) }}>{new Date(licence.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[{ label: "Questions", value: stats.totalAnswered }, { label: "Correct", value: stats.totalCorrect }, { label: "Streak", value: `${stats.streak}d` }].map(s => (
          <div key={s.label} className="ap-card" style={{ padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: text(dark) }}>{s.value}</div>
            <div style={{ fontSize: 11, color: muted(dark), marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="ap-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: text(dark), marginBottom: 14 }}>Badges ({BADGES.filter(b => b.check(stats)).length}/{BADGES.length})</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {BADGES.map(b => {
            const earned = b.check(stats);
            return (
              <div key={b.id} style={{ textAlign: "center", opacity: earned ? 1 : 0.35 }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{b.icon}</div>
                <div style={{ fontSize: 10, color: earned ? text(dark) : muted(dark), fontWeight: earned ? 600 : 400, lineHeight: 1.2 }}>{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ap-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: text(dark), marginBottom: 14 }}>Settings</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${border(dark)}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: text(dark) }}>{dark ? "Dark Mode" : "Light Mode"}</div>
            <div style={{ fontSize: 12, color: muted(dark) }}>Switch interface theme</div>
          </div>
          <button onClick={toggleDark} style={{ width: 44, height: 24, borderRadius: 12, background: dark ? C.green : "rgba(0,0,0,0.15)", position: "relative", transition: "background 0.2s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FFF", position: "absolute", top: 3, left: dark ? 23 : 3, transition: "left 0.2s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
              {dark ? "🌙" : "☀️"}
            </div>
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12, padding: "12px 16px", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 12, textAlign: "center" }}>
        <p style={{ fontSize: 12, color: muted(dark) }}>AeroPrep by <a href="https://flyaway.lk" style={{ color: C.green, textDecoration: "none" }}>Flyaway Training Academy</a> · Sri Lanka</p>
      </div>
      <button onClick={onLogout} style={{ width: "100%", padding: "14px", borderRadius: 12, background: "rgba(239,68,68,0.1)", color: C.red, fontWeight: 600, fontSize: 14, border: "1px solid rgba(239,68,68,0.2)" }}>
        Sign Out
      </button>
    </div>
  );
}

function BottomNav({ screen, onNav, dark }) {
  const items = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "subjects", icon: "📚", label: "Subjects" },
    { id: "progress", icon: "📊", label: "Progress" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: card(dark), borderTop: `1px solid ${border(dark)}`, display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))", zIndex: 100, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {items.map(item => (
        <button key={item.id} className={`nav-btn ${screen === item.id ? "active" : ""}`} onClick={() => onNav(item.id)}>
          <span style={{ fontSize: 22 }}>{item.icon}</span>
          <span style={{ fontSize: 11 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function SubjectsScreen({ subjects, history, dark, onSelectSubject }) {
  const [search, setSearch] = useState("");
  const filtered = subjects.filter(s => s.subject_name.toLowerCase().includes(search.toLowerCase()) || s.subject_code.includes(search));
  return (
    <div style={{ padding: "20px 20px 100px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: text(dark), marginBottom: 16 }}>All Subjects</h1>
      <input className="ap-input" placeholder="🔍 Search subjects…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {filtered.map(s => {
          const sh = history.filter(h => h.subject_code === s.subject_code);
          const mastery = sh.length > 0 ? Math.round((sh.filter(h => h.is_correct).length / sh.length) * 100) : 0;
          return <SubjectCard key={s.subject_code} subject={s} mastery={mastery} dark={dark} onClick={() => onSelectSubject(s)} />;
        })}
      </div>
    </div>
  );
}

export default function App() {
  const { dark, toggle: toggleDark } = useTheme();
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [licence, setLicence] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ xp: 0, streak: 0, totalAnswered: 0, totalCorrect: 0, dailyChallengesDone: 0, bestMockScore: 0, bestSubjectMastery: 0, dailyChallengeToday: false });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizConfig, setQuizConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  async function loadUserData(u, lic) {
    setLoading(true);
    try {
      const licCols = LICENCE_COLS[lic.licence_type] || ["applicable_all"];
      const subjectsRaw = await sbFetch(`questions?select=subject_code,subject_name&${licCols[0]}=eq.true&limit=1000`);
      const subjectMap = {};
      subjectsRaw.forEach(q => {
        if (!subjectMap[q.subject_code]) subjectMap[q.subject_code] = { subject_code: q.subject_code, subject_name: q.subject_name, total: 0 };
        subjectMap[q.subject_code].total++;
      });
      setSubjects(Object.values(subjectMap).sort((a, b) => a.subject_code.localeCompare(b.subject_code)));
      const hist = await sbFetch(`user_progress?user_id=eq.${u.id}&select=*&order=answered_at.desc&limit=500`);
      setHistory(hist);
      const totalAnswered = hist.length;
      const totalCorrect = hist.filter(h => h.is_correct).length;
      const xp = totalCorrect * 10 + (totalAnswered - totalCorrect) * 5;
      const days = new Set(hist.map(h => new Date(h.answered_at).toDateString()));
      let streak = 0; let d = new Date();
      while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
      const today = new Date().toDateString();
      const dailyChallengeToday = hist.filter(h => new Date(h.answered_at).toDateString() === today).length >= 10;
      const subjectMasteries = Object.values(subjectMap).map(s => {
        const sh = hist.filter(h => h.subject_code === s.subject_code);
        return sh.length > 0 ? Math.round((sh.filter(h => h.is_correct).length / sh.length) * 100) : 0;
      });
      setStats({ xp, streak, totalAnswered, totalCorrect, dailyChallengesDone: dailyChallengeToday ? 1 : 0, bestMockScore: 0, bestSubjectMastery: Math.max(0, ...subjectMasteries), dailyChallengeToday });
    } catch (e) { console.error("Load error:", e); }
    finally { setLoading(false); }
  }

  async function handleLogin(u, lic) {
    setUser(u); setLicence(lic);
    await loadUserData(u, lic);
    setScreen("home");
  }

  function handleLogout() {
    setUser(null); setLicence(null); setSubjects([]); setHistory([]);
    setStats({ xp: 0, streak: 0, totalAnswered: 0, totalCorrect: 0, dailyChallengesDone: 0, bestMockScore: 0, bestSubjectMastery: 0, dailyChallengeToday: false });
    setScreen("login");
  }

  async function startQuiz(subject, examConfig) {
    setLoading(true);
    try {
      const licCols = LICENCE_COLS[licence.licence_type] || ["applicable_all"];
      let url = `questions?subject_code=eq.${subject.subject_code}&${licCols[0]}=eq.true&limit=500`;
      if (examConfig.mode === "weak") {
        const wrongIds = history.filter(h => !h.is_correct && h.subject_code === subject.subject_code).map(h => h.question_id);
        if (wrongIds.length === 0) { alert("No weak areas found for this subject yet! Practice first."); setLoading(false); return; }
        url = `questions?id=in.(${[...new Set(wrongIds)].slice(0, 100).join(",")})&limit=100`;
      }
      let qs = await sbFetch(url);
      qs = qs.sort(() => Math.random() - 0.5).slice(0, examConfig.qCount);
      setQuizQuestions(qs);
      setQuizConfig({ ...examConfig, subjectCode: subject.subject_code });
      setScreen("quiz");
    } catch (e) { console.error(e); alert("Failed to load questions. Please try again."); }
    finally { setLoading(false); }
  }

  async function startDailyChallenge() {
    setLoading(true);
    try {
      const licCols = LICENCE_COLS[licence.licence_type] || ["applicable_all"];
      const qs = await sbFetch(`questions?${licCols[0]}=eq.true&limit=500`);
      const shuffled = qs.sort(() => Math.random() - 0.5).slice(0, 10);
      setQuizQuestions(shuffled);
      setQuizConfig({ mode: "timed_sprint", qCount: 10, timed: true, minutes: 10, subjectCode: "daily", isDaily: true });
      setScreen("quiz");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleQuizComplete(answers) {
    if (answers.length === 0) { setScreen(selectedSubject ? "exam_picker" : "home"); return; }
    const correct = answers.filter(a => a.is_correct).length;
    const total = answers.length;
    const pct = Math.round((correct / total) * 100);
    const xp = correct * 10 + (total - correct) * 5 + (quizConfig?.isDaily ? 50 : 0) + (pct >= 75 ? 20 : 0);
    setXpEarned(xp);
    try {
      for (const ans of answers) {
        await sbFetch("user_progress", {
          method: "POST",
          body: JSON.stringify({ user_id: user.id, question_id: ans.question_id, subject_code: ans.subject_code, subtopic_code: ans.subtopic_name, selected_answer: ans.selected_answer, is_correct: ans.is_correct, answered_at: new Date().toISOString() }),
        });
      }
      const hist = await sbFetch(`user_progress?user_id=eq.${user.id}&select=*&order=answered_at.desc&limit=500`);
      setHistory(hist);
      const totalAnswered = hist.length;
      const totalCorrect = hist.filter(h => h.is_correct).length;
      const newXp = totalCorrect * 10 + (totalAnswered - totalCorrect) * 5;
      const days = new Set(hist.map(h => new Date(h.answered_at).toDateString()));
      let streak = 0; let d = new Date();
      while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
      setStats(s => ({ ...s, xp: newXp, streak, totalAnswered, totalCorrect }));
    } catch (e) { console.error("Save error:", e); }
    setScreen("results");
  }

  async function handleAIAnalysis() {
    setAiLoading(true);
    try {
      const analysis = await getAIAnalysis(history);
      setAiAnalysis(analysis);
      setScreen("ai_analysis");
    } catch (e) { alert("AI analysis failed. Please try again."); }
    finally { setAiLoading(false); }
  }

  useEffect(() => {
    document.title = "AeroPrep by FTA";
    let meta = document.querySelector("meta[name='theme-color']") || document.createElement("meta");
    meta.name = "theme-color"; meta.content = "#00D46A"; document.head.appendChild(meta);
    let apple = document.querySelector("meta[name='apple-mobile-web-app-capable']") || document.createElement("meta");
    apple.name = "apple-mobile-web-app-capable"; apple.content = "yes"; document.head.appendChild(apple);
  }, []);

  const showNav = !["login", "quiz"].includes(screen);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg(dark), flexDirection: "column", gap: 16 }}>
      <Logo size={36} />
      <div style={{ width: 200 }}>
        <div className="progress-bar" style={{ height: 3 }}>
          <div className="progress-fill" style={{ width: "60%", height: "100%" }} />
        </div>
      </div>
      <p style={{ fontSize: 13, color: muted(dark) }}>Loading your cockpit…</p>
    </div>
  );

  return (
    <>
      <GlobalStyles dark={dark} />
      {screen === "login" && <LoginScreen onLogin={handleLogin} dark={dark} />}
      {screen !== "login" && screen !== "quiz" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: `${card(dark)}cc`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${border(dark)}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={28} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StreakFlame count={stats.streak} dark={dark} />
            <div style={{ background: "rgba(0,212,106,0.12)", borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13 }}>⚡</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{stats.xp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      <div style={{ paddingTop: screen !== "login" && screen !== "quiz" ? 70 : 0 }}>
        {screen === "home" && <HomeScreen user={user} licence={licence} stats={stats} subjects={subjects} history={history} dark={dark} onSelectSubject={(s) => { setSelectedSubject(s); setScreen("exam_picker"); }} onDailyChallenge={startDailyChallenge} />}
        {screen === "subjects" && <SubjectsScreen subjects={subjects} history={history} dark={dark} onSelectSubject={(s) => { setSelectedSubject(s); setScreen("exam_picker"); }} />}
        {screen === "exam_picker" && selectedSubject && <ExamPickerScreen subject={selectedSubject} dark={dark} onBack={() => setScreen("subjects")} onStart={(cfg) => startQuiz(selectedSubject, cfg)} />}
        {screen === "quiz" && <QuizScreen questions={quizQuestions} config={quizConfig} dark={dark} onComplete={handleQuizComplete} />}
        {screen === "results" && <ResultsScreen answers={quizQuestions.map((q, i) => ({ ...q, ...(history[i] || {}) }))} config={quizConfig} dark={dark} xpEarned={xpEarned} onRetry={() => { if (selectedSubject) startQuiz(selectedSubject, quizConfig); }} onHome={() => setScreen("home")} />}
        {screen === "progress" && <ProgressScreen user={user} history={history} subjects={subjects} stats={stats} dark={dark} onAIAnalysis={handleAIAnalysis} aiLoading={aiLoading} />}
        {screen === "ai_analysis" && <AIAnalysisScreen analysis={aiAnalysis} dark={dark} onBack={() => setScreen("progress")} />}
        {screen === "profile" && <ProfileScreen user={user} licence={licence} stats={stats} dark={dark} toggleDark={toggleDark} onLogout={handleLogout} />}
      </div>
      {showNav && <BottomNav screen={["exam_picker", "quiz", "results", "ai_analysis"].includes(screen) ? null : screen} onNav={(s) => setScreen(s)} dark={dark} />}
    </>
  );
}
