import { useState, useEffect, useRef } from "react";

const SB_URL = "https://lxzeqqzhsharbocxpvqg.supabase.co";
const SB_KEY = "sb_publishable_336LVuv08rcJtp86WswWFQ_rugDbPWT";

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function getAIAnalysis(history) {
  const summary = history.slice(-100).map(h => `Q${h.q_number} (${h.subtopic_name}): ${h.is_correct ? "✓" : "✗"}`).join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000,
      system: "You are an ATPL/CPL aviation exam coach for AeroPrep by FTA (Flyaway Training Academy, Sri Lanka). Analyse the student's recent question history and give a concise, actionable performance report. Format: 1. Overall exam readiness % 2. Top 3 strongest subtopics 3. Top 3 weakest subtopics 4. 3-step study plan for next week. Under 300 words, encouraging and professional.",
      messages: [{ role: "user", content: `Recent practice history:\n${summary}\n\nPlease analyse my performance and give a personalised study plan.` }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Unable to generate analysis.";
}

function generateSessionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,"0")).join("");
}

function generateLicenceKey(type) {
  const prefix = type.toUpperCase().replace("_","").slice(0,4);
  const part = () => Math.random().toString(36).substring(2,6).toUpperCase();
  return `${prefix}-${part()}-${part()}-${part()}`;
}

const LICENCE_COLS = {
  air_atpl: ["air_atpl","air_cpl","air_ppl","applicable_all"],
  air_cpl: ["air_cpl","air_ppl","applicable_all"],
  air_ppl: ["air_ppl","applicable_all"],
  heli_atpl: ["heli_atpl","heli_cpl","heli_ppl","applicable_all"],
  heli_cpl: ["heli_cpl","heli_ppl","applicable_all"],
  heli_ppl: ["heli_ppl","applicable_all"],
};
const LICENCE_LABELS = { air_atpl:"AIR ATPL", air_cpl:"AIR CPL", air_ppl:"AIR PPL", heli_atpl:"HELI ATPL", heli_cpl:"HELI CPL", heli_ppl:"HELI PPL" };
const LICENCE_DURATIONS = [{label:"1 Month",months:1},{label:"3 Months",months:3},{label:"6 Months",months:6},{label:"1 Year",months:12},{label:"2 Years",months:24}];

function xpForLevel(l) { return l*l*100; }
function levelFromXP(xp) { let l=1; while(xp>=xpForLevel(l+1)) l++; return l; }

const BADGES = [
  {id:"first_q",icon:"✈️",label:"First Flight",desc:"Answer your first question",check:s=>s.totalAnswered>=1},
  {id:"streak_7",icon:"🔥",label:"On Fire",desc:"7-day streak",check:s=>s.streak>=7},
  {id:"streak_30",icon:"⚡",label:"Unstoppable",desc:"30-day streak",check:s=>s.streak>=30},
  {id:"correct_100",icon:"🎯",label:"Sharp Shooter",desc:"100 correct answers",check:s=>s.totalCorrect>=100},
  {id:"correct_500",icon:"🏆",label:"Ace Pilot",desc:"500 correct answers",check:s=>s.totalCorrect>=500},
  {id:"daily_done",icon:"📅",label:"Daily Challenger",desc:"Complete a daily challenge",check:s=>s.dailyChallengesDone>=1},
  {id:"mock_pass",icon:"📋",label:"Cleared for Takeoff",desc:"Score 75%+ on a mock exam",check:s=>s.bestMockScore>=75},
  {id:"subject_master",icon:"🌟",label:"Subject Master",desc:"80% mastery in any subject",check:s=>s.bestSubjectMastery>=80},
];

const C = {
  green:"#00D46A", navy:"#0A0F1E", navyCard:"#111827", navyCardHover:"#1a2436",
  blue:"#3B82F6", red:"#EF4444", amber:"#F59E0B", purple:"#8B5CF6",
  textLight:"#F9FAFB", textMuted:"#9CA3AF", border:"rgba(255,255,255,0.08)",
  lBg:"#F0F4F8", lCard:"#FFFFFF", lBorder:"rgba(0,0,0,0.08)", lText:"#111827", lMuted:"#6B7280",
};

function useTheme() {
  const [dark,setDark] = useState(()=>{ const s=localStorage.getItem("aeroprep_theme"); return s?s==="dark":true; });
  const toggle = ()=>setDark(d=>{ localStorage.setItem("aeroprep_theme",!d?"dark":"light"); return !d; });
  return {dark,toggle};
}
function bg(d){return d?C.navy:C.lBg;}
function card(d){return d?C.navyCard:C.lCard;}
function cardHover(d){return d?C.navyCardHover:"#F3F4F6";}
function border(d){return d?C.border:C.lBorder;}
function text(d){return d?C.textLight:C.lText;}
function muted(d){return d?C.textMuted:C.lMuted;}

function GlobalStyles({dark:d}) {
  useEffect(()=>{
    const el=document.getElementById("ap-global")||document.createElement("style");
    el.id="ap-global";
    el.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',sans-serif;background:${bg(d)};color:${text(d)};min-height:100vh;transition:background 0.3s,color 0.3s;-webkit-font-smoothing:antialiased;}
      ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${d?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};border-radius:2px;}
      button{cursor:pointer;border:none;outline:none;font-family:'Inter',sans-serif;}
      input,select{font-family:'Inter',sans-serif;outline:none;}
      .ap-card{background:${card(d)};border:1px solid ${border(d)};border-radius:16px;transition:background 0.2s,border 0.2s;}
      .ap-card-hover:hover{background:${cardHover(d)};cursor:pointer;}
      .ap-btn-primary{background:${C.green};color:#000;font-weight:600;border-radius:12px;padding:12px 24px;font-size:15px;transition:opacity 0.15s,transform 0.1s;}
      .ap-btn-primary:hover{opacity:0.9;}.ap-btn-primary:active{transform:scale(0.98);}
      .ap-btn-secondary{background:transparent;color:${text(d)};font-weight:500;border-radius:12px;padding:12px 24px;font-size:15px;border:1px solid ${border(d)};transition:background 0.15s;}
      .ap-btn-secondary:hover{background:${cardHover(d)};}
      .ap-btn-danger{background:rgba(239,68,68,0.1);color:${C.red};font-weight:600;border-radius:10px;padding:8px 16px;font-size:13px;border:1px solid rgba(239,68,68,0.2);}
      .ap-btn-danger:hover{background:rgba(239,68,68,0.2);}
      .ap-input{background:${card(d)};border:1px solid ${border(d)};border-radius:10px;padding:12px 16px;font-size:15px;color:${text(d)};width:100%;transition:border 0.2s;}
      .ap-input:focus{border-color:${C.green};}
      .ap-input::placeholder{color:${muted(d)};}
      .ap-select{background:${card(d)};border:1px solid ${border(d)};border-radius:10px;padding:10px 16px;font-size:14px;color:${text(d)};width:100%;}
      .nav-btn{background:transparent;color:${muted(d)};border-radius:12px;padding:8px 12px;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:4px;transition:color 0.15s;min-width:56px;}
      .nav-btn.active{color:${C.green};}
      .progress-bar{background:${d?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"};border-radius:99px;overflow:hidden;}
      .progress-fill{background:linear-gradient(90deg,${C.green},${C.blue});border-radius:99px;transition:width 0.6s ease;}
      .tag{display:inline-block;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;}
      .tag-green{background:rgba(0,212,106,0.15);color:${C.green};}
      .tag-blue{background:rgba(59,130,246,0.15);color:${C.blue};}
      .tag-red{background:rgba(239,68,68,0.15);color:${C.red};}
      .tag-amber{background:rgba(245,158,11,0.15);color:${C.amber};}
      .tag-purple{background:rgba(139,92,246,0.15);color:${C.purple};}
      .shimmer{background:linear-gradient(90deg,${d?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"} 25%,${d?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} 50%,${d?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"} 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px;}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
      .fade-in{animation:fadeIn 0.25s ease forwards;}
      .scale-in{animation:scaleIn 0.2s ease forwards;}
      .admin-nav-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;font-size:14px;font-weight:500;width:100%;text-align:left;background:transparent;color:${muted(d)};transition:all 0.15s;}
      .admin-nav-btn:hover{background:${cardHover(d)};color:${text(d)};}
      .admin-nav-btn.active{background:rgba(0,212,106,0.12);color:${C.green};}
      table{width:100%;border-collapse:collapse;}
      th{font-size:11px;font-weight:600;color:${muted(d)};text-transform:uppercase;letter-spacing:0.05em;padding:10px 14px;text-align:left;border-bottom:1px solid ${border(d)};}
      td{font-size:13px;color:${text(d)};padding:12px 14px;border-bottom:1px solid ${border(d)};vertical-align:middle;}
      tr:last-child td{border-bottom:none;}
      tr:hover td{background:${cardHover(d)};}
      @media(max-width:768px){.hide-mobile{display:none!important;}.show-mobile{display:flex!important;}}
      @media(min-width:769px){.show-mobile{display:none!important;}}
    `;
    document.head.appendChild(el);
  },[d]);
  return null;
}

function Logo({size=32}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill={C.green}/>
        <path d="M8 26L16 14L22 20L28 12L32 16" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="32" cy="16" r="2.5" fill="#000"/>
        <path d="M20 28H32" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 28H14" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:size*0.5,color:C.green,lineHeight:1}}>AeroPrep</div>
        <div style={{fontSize:size*0.28,color:"#6B7280",lineHeight:1,marginTop:1}}>by FTA</div>
      </div>
    </div>
  );
}

function StreakFlame({count,dark:d}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(245,158,11,0.12)",borderRadius:10,padding:"6px 12px"}}>
      <span style={{fontSize:18}}>🔥</span>
      <span style={{fontWeight:700,color:C.amber,fontSize:15}}>{count}</span>
      <span style={{fontSize:12,color:muted(d)}}>day streak</span>
    </div>
  );
}

function XPBar({xp,dark:d}) {
  const level=levelFromXP(xp);
  const pct=Math.round(((xp-xpForLevel(level))/(xpForLevel(level+1)-xpForLevel(level)))*100);
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{background:C.green,color:"#000",fontWeight:700,fontSize:12,width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>L{level}</div>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:11,color:muted(d)}}>{xp.toLocaleString()} XP</span>
          <span style={{fontSize:11,color:muted(d)}}>{xpForLevel(level+1).toLocaleString()} XP</span>
        </div>
        <div className="progress-bar" style={{height:6}}><div className="progress-fill" style={{width:`${pct}%`,height:"100%"}}/></div>
      </div>
    </div>
  );
}

function AdminDashboard({stats,dark:d}) {
  return (
    <div className="fade-in">
      <h2 style={{fontSize:20,fontWeight:700,color:text(d),marginBottom:20,fontFamily:"'Space Grotesk',sans-serif"}}>Dashboard Overview</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:24}}>
        {[
          {icon:"👥",label:"Total Students",value:stats.totalStudents||0,color:text(d)},
          {icon:"✅",label:"Active Subs",value:stats.activeSubscriptions||0,color:C.green},
          {icon:"⚠️",label:"Expiring 7d",value:stats.expiringSoon||0,color:C.amber},
          {icon:"❌",label:"Expired",value:stats.expired||0,color:C.red},
          {icon:"🔑",label:"Keys Generated",value:stats.totalKeys||0,color:text(d)},
          {icon:"🔓",label:"Unused Keys",value:stats.unusedKeys||0,color:C.blue},
          {icon:"📚",label:"Total Questions",value:(stats.totalQuestions||0).toLocaleString(),color:text(d)},
          {icon:"🎛️",label:"Subjects",value:stats.totalSubjects||0,color:text(d)},
        ].map(s=>(
          <div key={s.label} className="ap-card" style={{padding:18}}>
            <div style={{fontSize:26,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.color,fontFamily:"'Space Grotesk',sans-serif"}}>{s.value}</div>
            <div style={{fontSize:12,color:muted(d),marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
      {stats.expiringSoon>0&&(
        <div style={{padding:"14px 18px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,marginBottom:14}}>
          <p style={{fontSize:14,fontWeight:700,color:C.amber}}>⚠️ {stats.expiringSoon} subscription{stats.expiringSoon>1?"s":""} expiring within 7 days</p>
          <p style={{fontSize:12,color:muted(d),marginTop:3}}>Go to Students tab to view and contact them.</p>
        </div>
      )}
      {stats.suspended>0&&(
        <div style={{padding:"14px 18px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:12,marginBottom:14}}>
          <p style={{fontSize:14,fontWeight:700,color:C.red}}>🚫 {stats.suspended} account{stats.suspended>1?"s":""} currently suspended</p>
        </div>
      )}
      <div className="ap-card" style={{padding:20,marginTop:8}}>
        <h3 style={{fontSize:14,fontWeight:700,color:text(d),marginBottom:12}}>Questions Available by Licence Type</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
          {Object.entries(LICENCE_LABELS).map(([k,v])=>(
            <div key={k} style={{padding:12,background:d?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:11,color:muted(d),marginBottom:4}}>{v}</div>
              <div style={{fontSize:20,fontWeight:700,color:text(d)}}>{stats.questionsByLicence?.[k]||0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminKeys({dark:d}) {
  const [keys,setKeys]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showGen,setShowGen]=useState(false);
  const [form,setForm]=useState({licenceType:"air_atpl",duration:12,studentName:"",notes:"",quantity:1});
  const [newKeys,setNewKeys]=useState([]);
  const [generating,setGenerating]=useState(false);
  const [copied,setCopied]=useState(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");

  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setKeys(await sbFetch("licence_keys?select=*&order=created_at.desc&limit=200"));}catch(e){console.error(e);}finally{setLoading(false);}}

  async function generate(){
    setGenerating(true);
    try{
      const vf=new Date(),vu=new Date();
      vu.setMonth(vu.getMonth()+form.duration);
      const gen=[];
      for(let i=0;i<form.quantity;i++){
        const kc=generateLicenceKey(form.licenceType);
        const r=await sbFetch("licence_keys",{method:"POST",body:JSON.stringify({key_code:kc,licence_type:form.licenceType,aircraft_type:form.licenceType.startsWith("air")?"AIR":"HELI",valid_from:vf.toISOString(),valid_until:vu.toISOString(),is_active:true,student_name:form.studentName,notes:form.notes})});
        gen.push(r[0]);
      }
      setNewKeys(gen);
      await load();
    }catch(e){alert("Failed to generate key.");}
    finally{setGenerating(false);}
  }

  async function revoke(id){
    if(!window.confirm("Revoke this key? Student loses access immediately."))return;
    await sbFetch(`licence_keys?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({is_active:false})});
    await load();
  }

  async function extend(id,months){
    const k=keys.find(x=>x.id===id);
    const nd=new Date(k.valid_until);
    nd.setMonth(nd.getMonth()+months);
    await sbFetch(`licence_keys?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({valid_until:nd.toISOString()})});
    await load();
  }

  function copyKey(code,id){navigator.clipboard.writeText(code);setCopied(id);setTimeout(()=>setCopied(null),2000);}

  function status(k){
    if(!k.is_active)return{label:"Revoked",cls:"tag-red"};
    if(new Date(k.valid_until)<new Date())return{label:"Expired",cls:"tag-red"};
    if(!k.user_id)return{label:"Unused",cls:"tag-blue"};
    const days=Math.ceil((new Date(k.valid_until)-new Date())/(86400000));
    if(days<=7)return{label:`${days}d left`,cls:"tag-amber"};
    return{label:"Active",cls:"tag-green"};
  }

  const filtered=keys.filter(k=>{
    const s=status(k);
    if(filter==="active"&&s.label!=="Active")return false;
    if(filter==="unused"&&s.label!=="Unused")return false;
    if(filter==="expired"&&!["Expired","Revoked"].includes(s.label))return false;
    if(filter==="expiring"&&!s.label.includes("d left"))return false;
    if(search&&!k.key_code.includes(search.toUpperCase())&&!k.student_name?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return (
    <div className="fade-in">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,color:text(d),fontFamily:"'Space Grotesk',sans-serif"}}>Licence Keys</h2>
        <button className="ap-btn-primary" onClick={()=>{setShowGen(!showGen);setNewKeys([]);}} style={{padding:"10px 20px",fontSize:14}}>{showGen?"✕ Close":"＋ Generate Keys"}</button>
      </div>
      {showGen&&(
        <div className="ap-card scale-in" style={{padding:24,marginBottom:24,border:`1px solid rgba(0,212,106,0.2)`}}>
          <h3 style={{fontSize:15,fontWeight:700,color:text(d),marginBottom:16}}>🔑 Generate New Key(s)</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12,marginBottom:16}}>
            <div><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>Licence Type</label>
              <select className="ap-select" value={form.licenceType} onChange={e=>setForm({...form,licenceType:e.target.value})}>
                {Object.entries(LICENCE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>Duration</label>
              <select className="ap-select" value={form.duration} onChange={e=>setForm({...form,duration:+e.target.value})}>
                {LICENCE_DURATIONS.map(x=><option key={x.months} value={x.months}>{x.label}</option>)}
              </select></div>
            <div><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>Quantity</label>
              <select className="ap-select" value={form.quantity} onChange={e=>setForm({...form,quantity:+e.target.value})}>
                {[1,2,3,5,10,20].map(n=><option key={n} value={n}>{n} key{n>1?"s":""}</option>)}
              </select></div>
            <div><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>Student Name (optional)</label>
              <input className="ap-input" style={{padding:"10px 14px",fontSize:13}} placeholder="e.g. John Silva" value={form.studentName} onChange={e=>setForm({...form,studentName:e.target.value})}/></div>
            <div><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>Notes (optional)</label>
              <input className="ap-input" style={{padding:"10px 14px",fontSize:13}} placeholder="e.g. Batch Jan 2026" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <button className="ap-btn-primary" onClick={generate} disabled={generating} style={{padding:"11px 28px"}}>{generating?"Generating…":`Generate ${form.quantity} Key${form.quantity>1?"s":""}`}</button>
          {newKeys.length>0&&(
            <div style={{marginTop:20}}>
              <p style={{fontSize:13,fontWeight:600,color:C.green,marginBottom:10}}>✅ {newKeys.length} key{newKeys.length>1?"s":""} generated — copy and send to student(s):</p>
              {newKeys.map(k=>(
                <div key={k.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:d?"rgba(0,212,106,0.08)":"rgba(0,212,106,0.05)",borderRadius:10,marginBottom:8,border:"1px solid rgba(0,212,106,0.15)"}}>
                  <code style={{flex:1,fontSize:15,fontWeight:700,color:C.green,letterSpacing:"0.05em"}}>{k.key_code}</code>
                  <span style={{fontSize:11,color:muted(d)}}>{LICENCE_LABELS[k.licence_type]} · {LICENCE_DURATIONS.find(x=>x.months===form.duration)?.label}</span>
                  <button onClick={()=>copyKey(k.key_code,k.id)} style={{padding:"5px 12px",borderRadius:8,background:copied===k.id?C.green:"rgba(0,212,106,0.15)",color:copied===k.id?"#000":C.green,fontSize:12,fontWeight:600}}>{copied===k.id?"✓ Copied":"Copy"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["all","All"],["active","Active"],["unused","Unused"],["expiring","Expiring"],["expired","Expired"]].map(([f,l])=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:8,fontSize:13,fontWeight:600,background:filter===f?C.green:"transparent",color:filter===f?"#000":text(d),border:`1px solid ${filter===f?C.green:border(d)}`}}>{l}</button>
        ))}
        <input className="ap-input" placeholder="Search key or name…" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:"6px 14px",fontSize:13,width:200}}/>
      </div>
      <div className="ap-card" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Key Code</th><th>Licence</th><th>Student</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan={6} style={{textAlign:"center",padding:30,color:muted(d)}}>Loading…</td></tr>
               :filtered.length===0?<tr><td colSpan={6} style={{textAlign:"center",padding:30,color:muted(d)}}>No keys found</td></tr>
               :filtered.map(k=>{
                const s=status(k);
                return(
                  <tr key={k.id}>
                    <td><div style={{display:"flex",alignItems:"center",gap:8}}><code style={{fontSize:13,fontWeight:700}}>{k.key_code}</code><button onClick={()=>copyKey(k.key_code,k.id)} style={{padding:"2px 8px",borderRadius:6,background:copied===k.id?C.green:"rgba(0,212,106,0.1)",color:copied===k.id?"#000":C.green,fontSize:11}}>{copied===k.id?"✓":"Copy"}</button></div></td>
                    <td><span className="tag tag-blue">{LICENCE_LABELS[k.licence_type]}</span></td>
                    <td style={{color:muted(d)}}>{k.student_name||(k.user_id?"Registered":"—")}</td>
                    <td><span className={`tag ${s.cls}`}>{s.label}</span></td>
                    <td style={{fontSize:12,color:muted(d)}}>{new Date(k.valid_until).toLocaleDateString("en-GB")}</td>
                    <td><div style={{display:"flex",gap:6}}>
                      {k.is_active&&k.user_id&&<button onClick={()=>extend(k.id,3)} style={{padding:"4px 10px",borderRadius:6,background:"rgba(59,130,246,0.1)",color:C.blue,fontSize:11,fontWeight:600}}>+3mo</button>}
                      {k.is_active&&<button className="ap-btn-danger" onClick={()=>revoke(k.id)} style={{padding:"4px 10px",fontSize:11}}>Revoke</button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminStudents({dark:d}) {
  const [students,setStudents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");

  useEffect(()=>{load();},[]);
  async function load(){
    setLoading(true);
    try{
      const [users,keys,progress]=await Promise.all([
        sbFetch("users?select=*&order=created_at.desc"),
        sbFetch("licence_keys?select=*"),
        sbFetch("user_progress?select=user_id,is_correct"),
      ]);
      setStudents(users.map(u=>{
        const lic=keys.find(k=>k.user_id===u.id&&k.is_active);
        const up=progress.filter(p=>p.user_id===u.id);
        return{...u,licence:lic,totalAnswered:up.length,accuracy:up.length>0?Math.round((up.filter(p=>p.is_correct).length/up.length)*100):0};
      }));
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  }

  async function suspend(id,reason){await sbFetch(`users?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({is_suspended:true,suspension_reason:reason})});await load();}
  async function unsuspend(id){await sbFetch(`users?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({is_suspended:false,suspension_reason:null})});await load();}

  const filtered=students.filter(s=>{
    if(filter==="active"&&(!s.licence||new Date(s.licence?.valid_until)<new Date()))return false;
    if(filter==="expired"&&s.licence&&new Date(s.licence?.valid_until)>=new Date())return false;
    if(filter==="suspended"&&!s.is_suspended)return false;
    if(search&&!s.email?.toLowerCase().includes(search.toLowerCase())&&!s.full_name?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return (
    <div className="fade-in">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,color:text(d),fontFamily:"'Space Grotesk',sans-serif"}}>Students ({students.length})</h2>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["all","All"],["active","Active"],["expired","Expired"],["suspended","Suspended"]].map(([f,l])=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:8,fontSize:13,fontWeight:600,background:filter===f?C.green:"transparent",color:filter===f?"#000":text(d),border:`1px solid ${filter===f?C.green:border(d)}`}}>{l}</button>
        ))}
        <input className="ap-input" placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:"6px 14px",fontSize:13,width:220}}/>
      </div>
      <div className="ap-card" style={{overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Student</th><th>Licence</th><th>Expires</th><th>Questions</th><th>Accuracy</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan={7} style={{textAlign:"center",padding:30,color:muted(d)}}>Loading…</td></tr>
               :filtered.length===0?<tr><td colSpan={7} style={{textAlign:"center",padding:30,color:muted(d)}}>No students found</td></tr>
               :filtered.map(s=>{
                const exp=!s.licence||new Date(s.licence?.valid_until)<new Date();
                const days=s.licence?Math.ceil((new Date(s.licence.valid_until)-new Date())/86400000):0;
                const soon=days>0&&days<=7;
                return(
                  <tr key={s.id}>
                    <td><div><div style={{fontWeight:600}}>{s.full_name||"—"}</div><div style={{fontSize:12,color:muted(d)}}>{s.email}</div></div></td>
                    <td>{s.licence?<span className="tag tag-blue">{LICENCE_LABELS[s.licence.licence_type]}</span>:<span style={{color:muted(d),fontSize:12}}>None</span>}</td>
                    <td style={{fontSize:12,color:exp?C.red:soon?C.amber:text(d)}}>{s.licence?(exp?"Expired":soon?`${days}d left`:new Date(s.licence.valid_until).toLocaleDateString("en-GB")):"—"}</td>
                    <td>{s.totalAnswered.toLocaleString()}</td>
                    <td><span style={{color:s.accuracy>=75?C.green:s.accuracy>=50?C.amber:C.red,fontWeight:600}}>{s.totalAnswered>0?`${s.accuracy}%`:"—"}</span></td>
                    <td>{s.is_suspended?<span className="tag tag-red">Suspended</span>:exp?<span className="tag tag-red">Expired</span>:soon?<span className="tag tag-amber">Expiring</span>:<span className="tag tag-green">Active</span>}</td>
                    <td>{s.is_suspended?<button onClick={()=>unsuspend(s.id)} style={{padding:"4px 10px",borderRadius:6,background:"rgba(0,212,106,0.1)",color:C.green,fontSize:11,fontWeight:600}}>Reinstate</button>:<button className="ap-btn-danger" onClick={()=>{const r=prompt("Reason for suspension:");if(r)suspend(s.id,r);}} style={{padding:"4px 10px",fontSize:11}}>Suspend</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminSecurity({dark:d}) {
  const [sessions,setSessions]=useState([]);
  const [attempts,setAttempts]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{load();},[]);
  async function load(){
    setLoading(true);
    try{
      const [s,a]=await Promise.all([
        sbFetch("active_sessions?select=*&order=last_active.desc&limit=100"),
        sbFetch("login_attempts?select=*&order=attempted_at.desc&limit=50"),
      ]);
      setSessions(s);setAttempts(a);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  }

  async function terminate(id){await sbFetch(`active_sessions?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({is_active:false})});await load();}

  const activeSessions=sessions.filter(s=>s.is_active);
  const suspicious=activeSessions.filter((s,_,arr)=>arr.filter(x=>x.user_id===s.user_id).length>1);

  return (
    <div className="fade-in">
      <h2 style={{fontSize:20,fontWeight:700,color:text(d),marginBottom:20,fontFamily:"'Space Grotesk',sans-serif"}}>Security & Anti-Sharing</h2>
      {suspicious.length>0&&(
        <div style={{padding:"14px 18px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:12,marginBottom:16}}>
          <p style={{fontSize:14,fontWeight:700,color:C.red}}>🚨 {suspicious.length} suspicious session{suspicious.length>1?"s":""} — possible account sharing detected</p>
          <p style={{fontSize:12,color:muted(d),marginTop:3}}>Multiple simultaneous logins from the same account. Terminate sessions below.</p>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div className="ap-card" style={{padding:18}}><p style={{fontSize:12,color:muted(d),marginBottom:4}}>Active Sessions</p><p style={{fontSize:28,fontWeight:800,color:C.green,fontFamily:"'Space Grotesk',sans-serif"}}>{activeSessions.length}</p></div>
        <div className="ap-card" style={{padding:18}}><p style={{fontSize:12,color:muted(d),marginBottom:4}}>Suspicious</p><p style={{fontSize:28,fontWeight:800,color:suspicious.length>0?C.red:C.green,fontFamily:"'Space Grotesk',sans-serif"}}>{suspicious.length}</p></div>
      </div>
      <div className="ap-card" style={{padding:20,marginBottom:20}}>
        <h3 style={{fontSize:14,fontWeight:700,color:text(d),marginBottom:12}}>Active Sessions</h3>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>User ID</th><th>Device</th><th>Last Active</th><th>Flag</th><th>Action</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan={5} style={{textAlign:"center",padding:20,color:muted(d)}}>Loading…</td></tr>
               :activeSessions.length===0?<tr><td colSpan={5} style={{textAlign:"center",padding:20,color:muted(d)}}>No active sessions</td></tr>
               :activeSessions.map(s=>(
                <tr key={s.id}>
                  <td style={{fontSize:11,color:muted(d)}}>{s.user_id?.slice(0,12)}…</td>
                  <td style={{fontSize:11}}>{s.device_info?.slice(0,40)||"Unknown"}</td>
                  <td style={{fontSize:11,color:muted(d)}}>{new Date(s.last_active).toLocaleString("en-GB")}</td>
                  <td>{suspicious.find(x=>x.id===s.id)?<span className="tag tag-red">⚠️ Suspicious</span>:<span className="tag tag-green">Normal</span>}</td>
                  <td><button className="ap-btn-danger" onClick={()=>terminate(s.id)} style={{padding:"4px 10px",fontSize:11}}>Terminate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ap-card" style={{padding:20}}>
        <h3 style={{fontSize:14,fontWeight:700,color:text(d),marginBottom:12}}>Recent Login Attempts</h3>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Email</th><th>Time</th><th>Result</th><th>Device</th></tr></thead>
            <tbody>
              {attempts.length===0?<tr><td colSpan={4} style={{textAlign:"center",padding:20,color:muted(d)}}>No attempts recorded</td></tr>
               :attempts.map(a=>(
                <tr key={a.id}>
                  <td>{a.email}</td>
                  <td style={{fontSize:11,color:muted(d)}}>{new Date(a.attempted_at).toLocaleString("en-GB")}</td>
                  <td><span className={`tag ${a.success?"tag-green":"tag-red"}`}>{a.success?"✓ Success":"✗ Failed"}</span></td>
                  <td style={{fontSize:11,color:muted(d)}}>{a.device_info?.slice(0,35)||"Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminAdmins({currentAdmin,dark:d}) {
  const [admins,setAdmins]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({username:"",password:"",fullName:"",email:""});
  const [saving,setSaving]=useState(false);
  const [showPw,setShowPw]=useState(false);
  const [pw,setPw]=useState({current:"",newPw:"",confirm:""});
  const [pwMsg,setPwMsg]=useState("");

  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setAdmins(await sbFetch("admins?select=*&order=created_at.asc"));}catch(e){console.error(e);}finally{setLoading(false);}}

  async function create(){
    if(!form.username||!form.password){alert("Username and password required.");return;}
    setSaving(true);
    try{await sbFetch("admins",{method:"POST",body:JSON.stringify({username:form.username,password_hash:btoa(form.password),full_name:form.fullName,email:form.email,is_active:true})});setForm({username:"",password:"",fullName:"",email:""});setShowForm(false);await load();}
    catch(e){alert("Failed to create admin.");}
    finally{setSaving(false);}
  }

  async function toggle(id,active){await sbFetch(`admins?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({is_active:!active})});await load();}

  async function changePw(){
    setPwMsg("");
    if(btoa(pw.current)!==currentAdmin.password_hash){setPwMsg("Current password incorrect.");return;}
    if(pw.newPw.length<6){setPwMsg("New password must be at least 6 characters.");return;}
    if(pw.newPw!==pw.confirm){setPwMsg("Passwords do not match.");return;}
    await sbFetch(`admins?id=eq.${currentAdmin.id}`,{method:"PATCH",body:JSON.stringify({password_hash:btoa(pw.newPw)})});
    setPwMsg("✅ Password changed successfully!");setPw({current:"",newPw:"",confirm:""});
  }

  return (
    <div className="fade-in">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,color:text(d),fontFamily:"'Space Grotesk',sans-serif"}}>Admin Management</h2>
        <button className="ap-btn-primary" onClick={()=>setShowForm(!showForm)} style={{padding:"10px 20px",fontSize:14}}>{showForm?"✕ Close":"＋ New Admin"}</button>
      </div>
      <div className="ap-card" style={{padding:20,marginBottom:20,border:`1px solid rgba(59,130,246,0.2)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><p style={{fontSize:14,fontWeight:600,color:text(d)}}>🔐 Change Your Password</p><p style={{fontSize:12,color:muted(d)}}>Logged in as: {currentAdmin.username}</p></div>
          <button onClick={()=>setShowPw(!showPw)} className="ap-btn-secondary" style={{padding:"8px 16px",fontSize:13}}>{showPw?"Cancel":"Change Password"}</button>
        </div>
        {showPw&&(
          <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12}}>
            {[["current","Current Password"],["newPw","New Password"],["confirm","Confirm New Password"]].map(([f,l])=>(
              <div key={f}><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>{l}</label><input className="ap-input" type="password" style={{padding:"10px 14px",fontSize:13}} value={pw[f]} onChange={e=>setPw({...pw,[f]:e.target.value})}/></div>
            ))}
            <div style={{display:"flex",alignItems:"flex-end"}}><button className="ap-btn-primary" onClick={changePw} style={{padding:"10px 20px",fontSize:13,width:"100%"}}>Update</button></div>
            {pwMsg&&<div style={{gridColumn:"1/-1",fontSize:13,color:pwMsg.includes("✅")?C.green:C.red}}>{pwMsg}</div>}
          </div>
        )}
      </div>
      {showForm&&(
        <div className="ap-card scale-in" style={{padding:20,marginBottom:20}}>
          <h3 style={{fontSize:14,fontWeight:700,color:text(d),marginBottom:14}}>Create New Admin</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:14}}>
            {[["username","Username *","text","e.g. staff1"],["password","Password *","password","Min 6 chars"],["fullName","Full Name","text","e.g. Kusal Perera"],["email","Email","email","staff@flyaway.lk"]].map(([f,l,t,p])=>(
              <div key={f}><label style={{fontSize:12,color:muted(d),display:"block",marginBottom:6}}>{l}</label><input className="ap-input" type={t} placeholder={p} style={{padding:"10px 14px",fontSize:13}} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/></div>
            ))}
          </div>
          <button className="ap-btn-primary" onClick={create} disabled={saving} style={{padding:"10px 24px",fontSize:14}}>{saving?"Creating…":"Create Admin"}</button>
        </div>
      )}
      <div className="ap-card" style={{overflow:"hidden"}}>
        <table>
          <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Last Login</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={6} style={{textAlign:"center",padding:20,color:muted(d)}}>Loading…</td></tr>
             :admins.map(a=>(
              <tr key={a.id}>
                <td style={{fontWeight:600}}>{a.username} {a.username===currentAdmin.username&&<span className="tag tag-blue">You</span>}</td>
                <td>{a.full_name||"—"}</td>
                <td style={{fontSize:12,color:muted(d)}}>{a.email||"—"}</td>
                <td style={{fontSize:12,color:muted(d)}}>{a.last_login?new Date(a.last_login).toLocaleString("en-GB"):"Never"}</td>
                <td><span className={`tag ${a.is_active?"tag-green":"tag-red"}`}>{a.is_active?"Active":"Inactive"}</span></td>
                <td>{a.username!==currentAdmin.username&&<button onClick={()=>toggle(a.id,a.is_active)} style={{padding:"4px 10px",borderRadius:6,background:a.is_active?"rgba(239,68,68,0.1)":"rgba(0,212,106,0.1)",color:a.is_active?C.red:C.green,fontSize:11,fontWeight:600}}>{a.is_active?"Deactivate":"Activate"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPanel({admin,onLogout,dark:d,toggleDark}) {
  const [tab,setTab]=useState("dashboard");
  const [stats,setStats]=useState({});
  useEffect(()=>{loadStats();},[]);

  async function loadStats(){
    try{
      const [users,keys,questions]=await Promise.all([
        sbFetch("users?select=id,is_suspended"),
        sbFetch("licence_keys?select=*"),
        sbFetch("questions?select=subject_code,air_atpl,air_cpl,air_ppl,heli_atpl,heli_cpl,heli_ppl,applicable_all"),
      ]);
      const now=new Date();
      const qbl={};
      Object.keys(LICENCE_COLS).forEach(lic=>{ qbl[lic]=questions.filter(q=>q[lic]||q.applicable_all).length; });
      setStats({
        totalStudents:users.length,
        activeSubscriptions:keys.filter(k=>k.is_active&&k.user_id&&new Date(k.valid_until)>now).length,
        expired:keys.filter(k=>!k.is_active||(k.user_id&&new Date(k.valid_until)<=now)).length,
        expiringSoon:keys.filter(k=>{const days=Math.ceil((new Date(k.valid_until)-now)/86400000);return k.is_active&&k.user_id&&days>0&&days<=7;}).length,
        suspended:users.filter(u=>u.is_suspended).length,
        totalKeys:keys.length,
        unusedKeys:keys.filter(k=>!k.user_id&&k.is_active).length,
        totalQuestions:questions.length,
        totalSubjects:[...new Set(questions.map(q=>q.subject_code))].length,
        questionsByLicence:qbl,
      });
    }catch(e){console.error(e);}
  }

  const TABS=[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"keys",icon:"🔑",label:"Licence Keys"},{id:"students",icon:"👥",label:"Students"},{id:"security",icon:"🛡️",label:"Security"},{id:"admins",icon:"👤",label:"Admins"}];

  return (
    <div style={{minHeight:"100vh",background:bg(d),display:"flex",flexDirection:"column"}}>
      <div style={{background:card(d),borderBottom:`1px solid ${border(d)}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <Logo size={28}/>
          <div style={{width:1,height:24,background:border(d)}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.red}}/>
            <span style={{fontSize:13,fontWeight:600,color:C.red}}>ADMIN PANEL</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:13,color:muted(d)}}>👤 {admin.username}</span>
          <button onClick={toggleDark} style={{background:d?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:8,padding:"6px 10px",fontSize:14,color:text(d)}}>{d?"☀️":"🌙"}</button>
          <button onClick={onLogout} style={{padding:"7px 16px",borderRadius:8,background:"rgba(239,68,68,0.1)",color:C.red,fontSize:13,fontWeight:600,border:"1px solid rgba(239,68,68,0.2)"}}>Sign Out</button>
        </div>
      </div>
      <div style={{display:"flex",flex:1}}>
        <div className="hide-mobile" style={{width:210,background:card(d),borderRight:`1px solid ${border(d)}`,padding:"20px 12px",position:"sticky",top:58,height:"calc(100vh - 58px)",overflowY:"auto"}}>
          {TABS.map(t=><button key={t.id} className={`admin-nav-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}><span style={{fontSize:18}}>{t.icon}</span>{t.label}</button>)}
        </div>
        <div style={{flex:1,padding:"28px 24px 100px",overflowY:"auto"}}>
          {tab==="dashboard"&&<AdminDashboard stats={stats} dark={d}/>}
          {tab==="keys"&&<AdminKeys dark={d}/>}
          {tab==="students"&&<AdminStudents dark={d}/>}
          {tab==="security"&&<AdminSecurity dark={d}/>}
          {tab==="admins"&&<AdminAdmins currentAdmin={admin} dark={d}/>}
        </div>
      </div>
      <div className="show-mobile" style={{position:"fixed",bottom:0,left:0,right:0,background:card(d),borderTop:`1px solid ${border(d)}`,display:"none",justifyContent:"space-around",padding:"8px 0",zIndex:100}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",color:tab===t.id?C.green:muted(d),fontSize:10,padding:"4px 8px"}}><span style={{fontSize:20}}>{t.icon}</span>{t.label}</button>)}
      </div>
    </div>
  );
}

function LoginScreen({onLogin,onAdminLogin,dark:d}) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [code,setCode]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [showPass,setShowPass]=useState(false);

  async function handleLogin(e){
    e.preventDefault();setErr("");setLoading(true);
    try{
      if(email==="Admin"||email.toLowerCase()==="admin"){
        const admins=await sbFetch("admins?username=eq.Admin&select=*");
        if(admins.length&&admins[0].password_hash===btoa(password)){
          await sbFetch(`admins?id=eq.${admins[0].id}`,{method:"PATCH",body:JSON.stringify({last_login:new Date().toISOString()})});
          onAdminLogin(admins[0]);return;
        }else{setErr("Invalid admin credentials.");return;}
      }
      const users=await sbFetch(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      if(!users.length){setErr("No account found with this email.");return;}
      const user=users[0];
      if(user.is_suspended){setErr("Your account has been suspended. Please contact Flyaway Training Academy.");return;}
      if(user.password_hash!==btoa(password)){setErr("Incorrect password.");return;}
      const licences=await sbFetch(`licence_keys?user_id=eq.${user.id}&is_active=eq.true&select=*`);
      if(!licences.length){setErr("No active subscription. Please activate a code first.");return;}
      const licence=licences[0];
      if(new Date(licence.valid_until)<new Date()){setErr("Your subscription has expired. Contact FTA to renew.");return;}
      await sbFetch("login_attempts",{method:"POST",body:JSON.stringify({user_id:user.id,email,device_info:navigator.userAgent.slice(0,100),success:true})});
      const token=generateSessionToken();
      await sbFetch(`users?id=eq.${user.id}`,{method:"PATCH",body:JSON.stringify({current_session_token:token,last_login:new Date().toISOString(),login_count:(user.login_count||0)+1})});
      await sbFetch("active_sessions",{method:"POST",body:JSON.stringify({user_id:user.id,session_token:token,device_info:navigator.userAgent.slice(0,100),last_active:new Date().toISOString()})});
      localStorage.setItem("ap_session_token",token);
      onLogin(user,licence,token);
    }catch(e){setErr("Login failed. Please try again.");console.error(e);}
    finally{setLoading(false);}
  }

  async function handleActivate(e){
    e.preventDefault();setErr("");setLoading(true);
    try{
      const keys=await sbFetch(`licence_keys?key_code=eq.${encodeURIComponent(code.trim().toUpperCase())}&select=*`);
      if(!keys.length){setErr("Invalid activation code. Please check and try again.");return;}
      const key=keys[0];
      if(key.user_id){setErr("This code has already been activated on another account.");return;}
      if(new Date(key.valid_until)<new Date()){setErr("This activation code has expired.");return;}
      if(!key.is_active){setErr("This code has been revoked. Contact FTA.");return;}
      let users=await sbFetch(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      let user=users[0];
      if(!user){
        const created=await sbFetch("users",{method:"POST",body:JSON.stringify({email,full_name:email.split("@")[0],password_hash:btoa(password)})});
        user=created[0];
      }else{
        if(user.password_hash!==btoa(password)){setErr("An account with this email already exists. Use correct password or contact FTA.");return;}
      }
      await sbFetch(`licence_keys?id=eq.${key.id}`,{method:"PATCH",body:JSON.stringify({user_id:user.id,is_active:true,activated_at:new Date().toISOString()})});
      const token=generateSessionToken();
      await sbFetch(`users?id=eq.${user.id}`,{method:"PATCH",body:JSON.stringify({current_session_token:token,last_login:new Date().toISOString(),login_count:1})});
      await sbFetch("active_sessions",{method:"POST",body:JSON.stringify({user_id:user.id,session_token:token,device_info:navigator.userAgent.slice(0,100),last_active:new Date().toISOString()})});
      localStorage.setItem("ap_session_token",token);
      onLogin(user,{...key,user_id:user.id},token);
    }catch(e){setErr("Activation failed. Please try again.");console.error(e);}
    finally{setLoading(false);}
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",background:bg(d)}}>
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,106,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-20%",left:"-10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div className="fade-in" style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <Logo size={44}/>
          <p style={{marginTop:12,color:muted(d),fontSize:14}}>Your ATPL & CPL exam companion</p>
        </div>
        <div className="ap-card" style={{padding:32}}>
          <div style={{display:"flex",gap:4,background:d?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",borderRadius:10,padding:4,marginBottom:28}}>
            {[["login","Sign In"],["activate","Activate Code"]].map(([m,label])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:13,fontWeight:600,background:mode===m?(d?"#1F2937":"#FFF"):"transparent",color:mode===m?text(d):muted(d),border:"none",transition:"all 0.2s"}}>{label}</button>
            ))}
          </div>
          <form onSubmit={mode==="login"?handleLogin:handleActivate}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:500,color:muted(d),marginBottom:6}}>Email address</label>
              <input className="ap-input" type="text" placeholder="captain@flyaway.lk" value={email} onChange={e=>setEmail(e.target.value)} required/>
            </div>
            <div style={{marginBottom:mode==="activate"?16:0}}>
              <label style={{display:"block",fontSize:13,fontWeight:500,color:muted(d),marginBottom:6}}>Password</label>
              <div style={{position:"relative"}}>
                <input className="ap-input" type={showPass?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required style={{paddingRight:44}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",color:muted(d),fontSize:18}}>{showPass?"🙈":"👁️"}</button>
              </div>
            </div>
            {mode==="activate"&&(
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:500,color:muted(d),marginBottom:6}}>Activation code</label>
                <input className="ap-input" placeholder="e.g. AIRA-X7K2-9QP4-3MN" value={code} onChange={e=>setCode(e.target.value)} required style={{textTransform:"uppercase",letterSpacing:"0.05em"}}/>
              </div>
            )}
            {err&&<div style={{marginTop:14,padding:"10px 14px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,fontSize:13,color:C.red}}>{err}</div>}
            <button className="ap-btn-primary" type="submit" disabled={loading} style={{width:"100%",marginTop:20,opacity:loading?0.7:1}}>
              {loading?"Please wait…":mode==="login"?"Sign In":"Activate & Start"}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",marginTop:20,fontSize:13,color:muted(d)}}>
          Contact <a href="https://flyaway.lk" style={{color:C.green,textDecoration:"none"}} target="_blank" rel="noopener noreferrer">Flyaway Training Academy</a> to get a subscription
        </p>
      </div>
    </div>
  );
}

const SUBJECT_ICONS={"022":"🎛️","021":"⚙️","010":"🌍","033":"✈️","050":"🌤️","062":"🧭","031":"📊","032":"📡","040":"🧠","070":"⚖️","080":"🔧","034":"📻","020":"⚡","091":"📖"};

function SubjectCard({subject,mastery,dark:d,onClick}) {
  const icon=SUBJECT_ICONS[subject.subject_code]||"📚";
  const mc=mastery>=80?C.green:mastery>=50?C.amber:C.red;
  return (
    <div className="ap-card ap-card-hover fade-in" onClick={onClick} style={{padding:"20px",cursor:"pointer",transition:"transform 0.15s",position:"relative"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      {mastery>=80&&<div style={{position:"absolute",top:12,right:12,fontSize:16}}>🌟</div>}
      <div style={{fontSize:28,marginBottom:10}}>{icon}</div>
      <div style={{fontSize:11,color:muted(d),fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{subject.subject_code}</div>
      <div style={{fontSize:14,fontWeight:600,color:text(d),marginBottom:12,lineHeight:1.3}}>{subject.subject_name}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:12,color:muted(d)}}>{subject.total} questions</span>
        <span style={{fontSize:13,fontWeight:700,color:mc}}>{mastery}%</span>
      </div>
      <div className="progress-bar" style={{height:4}}><div style={{width:`${mastery}%`,height:"100%",background:mc,borderRadius:99,transition:"width 0.6s"}}/></div>
    </div>
  );
}

function HomeScreen({user,licence,stats,subjects,history,dark:d,onSelectSubject,onDailyChallenge}) {
  const [greeting]=useState(()=>{const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening";});
  const earnedBadges=BADGES.filter(b=>b.check(stats));
  const recentSubjects=[...subjects].filter(s=>history.some(h=>h.subject_code===s.subject_code)).slice(0,3);
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <p style={{fontSize:13,color:muted(d),marginBottom:2}}>{greeting},</p>
          <h1 style={{fontSize:22,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:text(d)}}>{user.full_name?.split(" ")[0]||"Captain"} 👋</h1>
          <p style={{fontSize:12,color:muted(d),marginTop:2}}>{LICENCE_LABELS[licence.licence_type]} · Expires {new Date(licence.valid_until).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p>
        </div>
        <StreakFlame count={stats.streak} dark={d}/>
      </div>
      <div className="ap-card" style={{padding:16,marginBottom:20}}><XPBar xp={stats.xp} dark={d}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        {[{label:"Answered",value:stats.totalAnswered.toLocaleString(),icon:"📝"},{label:"Correct",value:`${stats.totalAnswered>0?Math.round((stats.totalCorrect/stats.totalAnswered)*100):0}%`,icon:"🎯"},{label:"Subjects",value:`${subjects.length}`,icon:"📚"}].map(s=>(
          <div key={s.label} className="ap-card" style={{padding:"14px 12px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:700,color:text(d),fontFamily:"'Space Grotesk',sans-serif"}}>{s.value}</div>
            <div style={{fontSize:11,color:muted(d),marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="ap-card" style={{padding:20,marginBottom:24,border:`1px solid rgba(0,212,106,0.2)`,cursor:"pointer"}} onClick={onDailyChallenge}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:20}}>⚡</span><span style={{fontSize:14,fontWeight:700,color:C.green}}>Daily Challenge</span><span className="tag tag-green">+50 XP</span></div>
            <p style={{fontSize:13,color:muted(d)}}>10 random questions · All subjects · Timed</p>
          </div>
          <button className="ap-btn-primary" style={{padding:"10px 18px",fontSize:13,whiteSpace:"nowrap"}}>Fly Now ✈️</button>
        </div>
        {stats.dailyChallengeToday&&<div style={{marginTop:12,padding:"8px 12px",background:"rgba(0,212,106,0.1)",borderRadius:8,fontSize:12,color:C.green,fontWeight:600}}>✓ Challenge completed today!</div>}
      </div>
      {earnedBadges.length>0&&(
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:16,fontWeight:700,color:text(d),marginBottom:12}}>Your Badges</h2>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {earnedBadges.map(b=><div key={b.id} className="ap-card" style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>{b.icon}</span><div><div style={{fontSize:12,fontWeight:600,color:text(d)}}>{b.label}</div><div style={{fontSize:10,color:muted(d)}}>{b.desc}</div></div></div>)}
          </div>
        </div>
      )}
      {recentSubjects.length>0&&(
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:16,fontWeight:700,color:text(d),marginBottom:12}}>Continue Studying</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
            {recentSubjects.map(s=>{const sh=history.filter(h=>h.subject_code===s.subject_code);const m=sh.length>0?Math.round((sh.filter(h=>h.is_correct).length/sh.length)*100):0;return <SubjectCard key={s.subject_code} subject={s} mastery={m} dark={d} onClick={()=>onSelectSubject(s)}/>;})}
          </div>
        </div>
      )}
      <div>
        <h2 style={{fontSize:16,fontWeight:700,color:text(d),marginBottom:12}}>All Subjects</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
          {subjects.map(s=>{const sh=history.filter(h=>h.subject_code===s.subject_code);const m=sh.length>0?Math.round((sh.filter(h=>h.is_correct).length/sh.length)*100):0;return <SubjectCard key={s.subject_code} subject={s} mastery={m} dark={d} onClick={()=>onSelectSubject(s)}/>;})}
        </div>
      </div>
    </div>
  );
}

function ExamPickerScreen({subject,dark:d,onStart,onBack}) {
  const [mode,setMode]=useState(null);
  const [qCount,setQCount]=useState(20);
  const [timed,setTimed]=useState(false);
  const [minutes,setMinutes]=useState(30);
  const MODES=[
    {id:"practice",icon:"📖",label:"Practice Mode",desc:"Instant feedback after each question",tag:"Recommended",tc:"tag-green"},
    {id:"mock",icon:"📋",label:"Mock Exam",desc:"Exam conditions — results at the end",tag:"Exam Sim",tc:"tag-blue"},
    {id:"weak",icon:"🎯",label:"Weak Areas",desc:"Focus on questions you got wrong",tag:"Targeted",tc:"tag-amber"},
    {id:"timed_sprint",icon:"⚡",label:"Timed Sprint",desc:"Race the clock for bonus XP",tag:"+2x XP",tc:"tag-red"},
  ];
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:600,margin:"0 auto"}}>
      <button onClick={onBack} style={{background:"none",color:muted(d),fontSize:14,marginBottom:20}}>← Back</button>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:text(d)}}>{subject.subject_name}</h1>
        <p style={{fontSize:13,color:muted(d),marginTop:4}}>{subject.subject_code} · {subject.total} questions</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
        {MODES.map(m=>(
          <div key={m.id} className="ap-card ap-card-hover" onClick={()=>setMode(m.id)} style={{padding:"18px 20px",cursor:"pointer",border:mode===m.id?`1px solid ${C.green}`:`1px solid ${border(d)}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",gap:14}}><span style={{fontSize:24}}>{m.icon}</span><div><div style={{fontSize:15,fontWeight:600,color:text(d),marginBottom:3}}>{m.label}</div><div style={{fontSize:13,color:muted(d)}}>{m.desc}</div></div></div>
              <span className={`tag ${m.tc}`}>{m.tag}</span>
            </div>
          </div>
        ))}
      </div>
      {mode&&(
        <div className="ap-card scale-in" style={{padding:20,marginBottom:24}}>
          <h3 style={{fontSize:14,fontWeight:600,color:text(d),marginBottom:16}}>Configure session</h3>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:13,color:muted(d),display:"block",marginBottom:8}}>Number of questions</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[10,20,30,50,subject.total].filter((v,i,a)=>a.indexOf(v)===i&&v<=subject.total).map(n=>(
                <button key={n} onClick={()=>setQCount(n)} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,background:qCount===n?C.green:"transparent",color:qCount===n?"#000":text(d),border:`1px solid ${qCount===n?C.green:border(d)}`}}>{n===subject.total?"All":n}</button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:13,fontWeight:500,color:text(d)}}>Enable timer</div><div style={{fontSize:12,color:muted(d)}}>Adds time pressure</div></div>
            <button onClick={()=>setTimed(!timed)} style={{width:44,height:24,borderRadius:12,background:timed?C.green:d?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)",position:"relative"}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:"#FFF",position:"absolute",top:3,left:timed?23:3,transition:"left 0.2s"}}/>
            </button>
          </div>
          {timed&&<div style={{marginTop:16}}><label style={{fontSize:13,color:muted(d),display:"block",marginBottom:8}}>Time limit: {minutes} minutes</label><input type="range" min="5" max="120" step="5" value={minutes} onChange={e=>setMinutes(+e.target.value)} style={{width:"100%",accentColor:C.green}}/></div>}
        </div>
      )}
      {mode&&<button className="ap-btn-primary" style={{width:"100%",fontSize:16,padding:"16px"}} onClick={()=>onStart({mode,qCount,timed,minutes})}>Start {MODES.find(m2=>m2.id===mode)?.label} ✈️</button>}
    </div>
  );
}

function QuizScreen({questions,config,dark:d,onComplete}) {
  const [idx,setIdx]=useState(0);
  const [selected,setSelected]=useState(null);
  const [revealed,setRevealed]=useState(false);
  const [answers,setAnswers]=useState([]);
  const [timeLeft,setTimeLeft]=useState(config.timed?config.minutes*60:null);
  const timerRef=useRef(null);
  useEffect(()=>{
    if(config.timed&&timeLeft>0){timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);onComplete(answers);return 0;}return t-1;}),1000);}
    return()=>clearInterval(timerRef.current);
  },[]);
  const q=questions[idx];
  const isPractice=config.mode==="practice"||config.mode==="weak"||config.mode==="timed_sprint";
  function sel(opt){if(revealed&&isPractice)return;setSelected(opt);if(isPractice)setRevealed(true);}
  function next(){
    const ic=selected===q.correct_answer;
    const na=[...answers,{question_id:q.id,q_number:q.q_number,subject_code:q.subject_code,subtopic_name:q.subtopic_name,selected_answer:selected,is_correct:ic}];
    setAnswers(na);
    if(idx+1>=questions.length)onComplete(na);
    else{setIdx(idx+1);setSelected(null);setRevealed(false);}
  }
  function optLabel(k){return{A:q.option_a,B:q.option_b,C:q.option_c,D:q.option_d}[k];}
  function optStyle(k){
    const base={padding:"14px 18px",borderRadius:12,cursor:"pointer",fontSize:14,textAlign:"left",width:"100%",border:`1px solid ${border(d)}`,marginBottom:10,color:text(d),background:card(d),display:"block",lineHeight:1.5};
    if(!revealed){if(selected===k)return{...base,border:`1px solid ${C.blue}`,background:d?"rgba(59,130,246,0.15)":"rgba(59,130,246,0.08)"};return base;}
    if(k===q.correct_answer)return{...base,border:`1px solid ${C.green}`,background:d?"rgba(0,212,106,0.15)":"rgba(0,212,106,0.08)",color:C.green,fontWeight:600};
    if(k===selected&&k!==q.correct_answer)return{...base,border:`1px solid ${C.red}`,background:d?"rgba(239,68,68,0.15)":"rgba(239,68,68,0.08)",color:C.red};
    return{...base,opacity:0.5};
  }
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:680,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={()=>{if(window.confirm("Exit? Progress will be lost."))onComplete(answers);}} style={{background:"none",color:muted(d),fontSize:13}}>✕ Exit</button>
        <span style={{fontSize:13,fontWeight:600,color:text(d)}}>{idx+1} / {questions.length}</span>
        {config.timed&&timeLeft!==null?<span style={{fontSize:14,fontWeight:700,color:timeLeft<60?C.red:C.green,background:d?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.06)",padding:"4px 10px",borderRadius:8}}>⏱ {fmt(timeLeft)}</span>:<div style={{width:60}}/>}
      </div>
      <div className="progress-bar" style={{height:4,marginBottom:24}}><div className="progress-fill" style={{width:`${Math.round((idx/questions.length)*100)}%`,height:"100%"}}/></div>
      <div className="ap-card fade-in" key={idx} style={{padding:"24px",marginBottom:20}}>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <span className="tag tag-blue">{q.subject_code}</span>
          <span className="tag" style={{background:d?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",color:muted(d)}}>{q.subtopic_name}</span>
        </div>
        <p style={{fontSize:16,fontWeight:500,color:text(d),lineHeight:1.6}}>{q.question}</p>
      </div>
      <div>{["A","B","C","D"].map(k=><button key={k} style={optStyle(k)} onClick={()=>sel(k)}><span style={{fontWeight:700,marginRight:10,opacity:0.5}}>{k}</span>{optLabel(k)}</button>)}</div>
      {revealed&&isPractice&&<div className="scale-in" style={{padding:"14px 18px",borderRadius:12,marginBottom:16,background:selected===q.correct_answer?"rgba(0,212,106,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${selected===q.correct_answer?"rgba(0,212,106,0.3)":"rgba(239,68,68,0.3)"}`}}><p style={{fontSize:14,fontWeight:600,color:selected===q.correct_answer?C.green:C.red}}>{selected===q.correct_answer?"✓ Correct! +10 XP":`✗ Incorrect — answer was ${q.correct_answer}`}</p></div>}
      {(revealed||!isPractice)&&selected&&<button className="ap-btn-primary scale-in" style={{width:"100%",padding:"16px",fontSize:15,marginTop:8}} onClick={next}>{idx+1>=questions.length?"See Results 📊":"Next Question →"}</button>}
    </div>
  );
}

function ResultsScreen({answers,dark:d,onRetry,onHome,xpEarned}) {
  const total=answers.length,correct=answers.filter(a=>a.is_correct).length,pct=total>0?Math.round((correct/total)*100):0,passed=pct>=75;
  const bySubtopic={};
  answers.forEach(a=>{if(!bySubtopic[a.subtopic_name])bySubtopic[a.subtopic_name]={correct:0,total:0};bySubtopic[a.subtopic_name].total++;if(a.is_correct)bySubtopic[a.subtopic_name].correct++;});
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:600,margin:"0 auto"}}>
      <div className="fade-in" style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:56,marginBottom:12}}>{pct>=90?"🏆":pct>=75?"✅":pct>=50?"📈":"📚"}</div>
        <div style={{fontSize:48,fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:passed?C.green:C.amber}}>{pct}%</div>
        <div style={{fontSize:18,fontWeight:600,color:text(d),marginTop:4}}>{passed?"Well done! You passed.":"Keep practising — you will get there."}</div>
        <div style={{fontSize:14,color:muted(d),marginTop:6}}>{correct} correct out of {total}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:12,background:"rgba(0,212,106,0.12)",borderRadius:10,padding:"6px 16px"}}><span>⚡</span><span style={{fontWeight:700,color:C.green}}>+{xpEarned} XP earned</span></div>
      </div>
      <div className="ap-card" style={{padding:20,marginBottom:20}}>
        <h3 style={{fontSize:15,fontWeight:700,color:text(d),marginBottom:16}}>Subtopic Breakdown</h3>
        {Object.entries(bySubtopic).map(([name,data])=>{const p=Math.round((data.correct/data.total)*100);return <div key={name} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,color:text(d)}}>{name}</span><span style={{fontSize:13,fontWeight:700,color:p>=75?C.green:p>=50?C.amber:C.red}}>{p}%</span></div><div className="progress-bar" style={{height:6}}><div style={{width:`${p}%`,height:"100%",background:p>=75?C.green:p>=50?C.amber:C.red,borderRadius:99}}/></div></div>;})}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <button className="ap-btn-primary" style={{padding:"16px"}} onClick={onRetry}>Try Again ↻</button>
        <button className="ap-btn-secondary" style={{padding:"16px"}} onClick={onHome}>Back to Dashboard</button>
      </div>
    </div>
  );
}

function ProgressScreen({history,subjects,stats,dark:d,onAIAnalysis,aiLoading}) {
  const sg={};
  history.forEach(h=>{const day=new Date(h.answered_at).toLocaleDateString("en-GB");if(!sg[day])sg[day]={correct:0,total:0};sg[day].total++;if(h.is_correct)sg[day].correct++;});
  const days=Object.entries(sg).slice(-7).reverse();
  const ss=subjects.map(s=>{const sh=history.filter(h=>h.subject_code===s.subject_code);const c=sh.filter(h=>h.is_correct).length;return{...s,attempted:sh.length,mastery:sh.length>0?Math.round((c/sh.length)*100):0};}).sort((a,b)=>b.attempted-a.attempted);
  const ovr=history.length>0?Math.round((history.filter(h=>h.is_correct).length/history.length)*100):0;
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:700,margin:"0 auto"}}>
      <h1 style={{fontSize:22,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:text(d),marginBottom:24}}>Your Progress</h1>
      <div className="ap-card" style={{padding:20,marginBottom:24,border:`1px solid rgba(59,130,246,0.25)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:20}}>🤖</span><span style={{fontSize:15,fontWeight:700,color:C.blue}}>AI Analysis</span></div><p style={{fontSize:13,color:muted(d)}}>{history.length<20?`Answer ${20-history.length} more questions to unlock`:"Get a personalised study plan powered by Claude AI"}</p></div>
          <button className="ap-btn-primary" disabled={history.length<20||aiLoading} onClick={onAIAnalysis} style={{padding:"10px 18px",fontSize:13,opacity:history.length<20?0.4:1,background:C.blue,whiteSpace:"nowrap"}}>{aiLoading?"Analysing…":"Analyse ✨"}</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:24}}>
        {[{label:"Total answered",value:history.length.toLocaleString(),icon:"📝"},{label:"Overall accuracy",value:`${ovr}%`,icon:"🎯"},{label:"Current streak",value:`${stats.streak} days`,icon:"🔥"},{label:"Total XP",value:stats.xp.toLocaleString(),icon:"⚡"}].map(s=>(
          <div key={s.label} className="ap-card" style={{padding:"18px 16px"}}><div style={{fontSize:24,marginBottom:6}}>{s.icon}</div><div style={{fontSize:22,fontWeight:700,color:text(d),fontFamily:"'Space Grotesk',sans-serif"}}>{s.value}</div><div style={{fontSize:12,color:muted(d),marginTop:3}}>{s.label}</div></div>
        ))}
      </div>
      {days.length>0&&(
        <div className="ap-card" style={{padding:20,marginBottom:24}}>
          <h3 style={{fontSize:15,fontWeight:700,color:text(d),marginBottom:16}}>Recent Activity (last 7 days)</h3>
          {days.map(([day,data])=>{const p=Math.round((data.correct/data.total)*100);return <div key={day} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><span style={{fontSize:12,color:muted(d),width:80,flexShrink:0}}>{day}</span><div className="progress-bar" style={{flex:1,height:8}}><div style={{width:`${p}%`,height:"100%",background:p>=75?C.green:p>=50?C.amber:C.red,borderRadius:99}}/></div><span style={{fontSize:12,fontWeight:700,color:text(d),width:40,textAlign:"right"}}>{p}%</span><span style={{fontSize:11,color:muted(d),width:50,textAlign:"right"}}>{data.total} Qs</span></div>;})}
        </div>
      )}
      <div className="ap-card" style={{padding:20}}>
        <h3 style={{fontSize:15,fontWeight:700,color:text(d),marginBottom:16}}>Subject Performance</h3>
        {ss.filter(s=>s.attempted>0).length===0?<p style={{fontSize:14,color:muted(d),textAlign:"center",padding:"20px 0"}}>No practice sessions yet. Start studying!</p>
         :ss.filter(s=>s.attempted>0).map(s=>(
          <div key={s.subject_code} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span>{SUBJECT_ICONS[s.subject_code]||"📚"}</span><span style={{fontSize:13,fontWeight:600,color:text(d)}}>{s.subject_name}</span><span style={{fontSize:11,color:muted(d)}}>{s.attempted} Qs</span></div>
              <span style={{fontSize:14,fontWeight:700,color:s.mastery>=75?C.green:s.mastery>=50?C.amber:C.red}}>{s.mastery}%</span>
            </div>
            <div className="progress-bar" style={{height:6}}><div style={{width:`${s.mastery}%`,height:"100%",background:s.mastery>=75?C.green:s.mastery>=50?C.amber:C.red,borderRadius:99,transition:"width 0.8s"}}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIAnalysisScreen({analysis,dark:d,onBack}) {
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:640,margin:"0 auto"}}>
      <button onClick={onBack} style={{background:"none",color:muted(d),fontSize:14,marginBottom:20}}>← Back</button>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{width:44,height:44,borderRadius:12,background:"rgba(59,130,246,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🤖</div>
        <div><h1 style={{fontSize:20,fontWeight:700,color:text(d)}}>AI Performance Analysis</h1><p style={{fontSize:13,color:muted(d)}}>Powered by Claude AI · AeroPrep by FTA</p></div>
      </div>
      <div className="ap-card" style={{padding:24}}><div style={{fontSize:14,color:text(d),lineHeight:1.8,whiteSpace:"pre-wrap"}}>{analysis}</div></div>
    </div>
  );
}

function ProfileScreen({user,licence,stats,dark:d,toggleDark,onLogout}) {
  const level=levelFromXP(stats.xp);
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:600,margin:"0 auto"}}>
      <h1 style={{fontSize:22,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:text(d),marginBottom:24}}>Profile</h1>
      <div className="ap-card" style={{padding:24,marginBottom:20,textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${C.green},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:700,color:"#000",margin:"0 auto 12px"}}>{(user.full_name||user.email)[0].toUpperCase()}</div>
        <h2 style={{fontSize:18,fontWeight:700,color:text(d)}}>{user.full_name||user.email.split("@")[0]}</h2>
        <p style={{fontSize:13,color:muted(d),marginTop:2}}>{user.email}</p>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10}}><span className="tag tag-green">{LICENCE_LABELS[licence.licence_type]}</span><span className="tag tag-blue">Level {level}</span></div>
        <div style={{marginTop:16}}><div style={{fontSize:12,color:muted(d),marginBottom:4}}>Subscription expires</div><div style={{fontSize:14,fontWeight:600,color:text(d)}}>{new Date(licence.valid_until).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {[{label:"Questions",value:stats.totalAnswered},{label:"Correct",value:stats.totalCorrect},{label:"Streak",value:`${stats.streak}d`}].map(s=>(
          <div key={s.label} className="ap-card" style={{padding:"14px 10px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:text(d)}}>{s.value}</div><div style={{fontSize:11,color:muted(d),marginTop:2}}>{s.label}</div></div>
        ))}
      </div>
      <div className="ap-card" style={{padding:20,marginBottom:20}}>
        <h3 style={{fontSize:15,fontWeight:700,color:text(d),marginBottom:14}}>Badges ({BADGES.filter(b=>b.check(stats)).length}/{BADGES.length})</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {BADGES.map(b=>{const earned=b.check(stats);return <div key={b.id} style={{textAlign:"center",opacity:earned?1:0.35}}><div style={{fontSize:28,marginBottom:4}}>{b.icon}</div><div style={{fontSize:10,color:earned?text(d):muted(d),fontWeight:earned?600:400,lineHeight:1.2}}>{b.label}</div></div>;})}
        </div>
      </div>
      <div className="ap-card" style={{padding:20,marginBottom:20}}>
        <h3 style={{fontSize:15,fontWeight:700,color:text(d),marginBottom:14}}>Settings</h3>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0"}}>
          <div><div style={{fontSize:14,fontWeight:500,color:text(d)}}>{d?"Dark Mode":"Light Mode"}</div><div style={{fontSize:12,color:muted(d)}}>Switch interface theme</div></div>
          <button onClick={toggleDark} style={{width:44,height:24,borderRadius:12,background:d?C.green:"rgba(0,0,0,0.15)",position:"relative"}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:"#FFF",position:"absolute",top:3,left:d?23:3,transition:"left 0.2s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{d?"🌙":"☀️"}</div>
          </button>
        </div>
      </div>
      <div style={{marginBottom:12,padding:"12px 16px",background:d?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:12,textAlign:"center"}}>
        <p style={{fontSize:12,color:muted(d)}}>AeroPrep by <a href="https://flyaway.lk" style={{color:C.green,textDecoration:"none"}}>Flyaway Training Academy</a> · Sri Lanka</p>
      </div>
      <button onClick={onLogout} style={{width:"100%",padding:"14px",borderRadius:12,background:"rgba(239,68,68,0.1)",color:C.red,fontWeight:600,fontSize:14,border:"1px solid rgba(239,68,68,0.2)"}}>Sign Out</button>
    </div>
  );
}

function BottomNav({screen,onNav,dark:d}) {
  const items=[{id:"home",icon:"🏠",label:"Home"},{id:"subjects",icon:"📚",label:"Subjects"},{id:"progress",icon:"📊",label:"Progress"},{id:"profile",icon:"👤",label:"Profile"}];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:card(d),borderTop:`1px solid ${border(d)}`,display:"flex",justifyContent:"space-around",padding:"8px 0 max(8px,env(safe-area-inset-bottom))",zIndex:100,backdropFilter:"blur(10px)"}}>
      {items.map(item=><button key={item.id} className={`nav-btn ${screen===item.id?"active":""}`} onClick={()=>onNav(item.id)}><span style={{fontSize:22}}>{item.icon}</span><span style={{fontSize:11}}>{item.label}</span></button>)}
    </div>
  );
}

function SubjectsScreen({subjects,history,dark:d,onSelectSubject}) {
  const [search,setSearch]=useState("");
  const filtered=subjects.filter(s=>s.subject_name.toLowerCase().includes(search.toLowerCase())||s.subject_code.includes(search));
  return (
    <div style={{padding:"20px 20px 100px",maxWidth:800,margin:"0 auto"}}>
      <h1 style={{fontSize:22,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:text(d),marginBottom:16}}>All Subjects</h1>
      <input className="ap-input" placeholder="🔍 Search subjects…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:20}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14}}>
        {filtered.map(s=>{const sh=history.filter(h=>h.subject_code===s.subject_code);const m=sh.length>0?Math.round((sh.filter(h=>h.is_correct).length/sh.length)*100):0;return <SubjectCard key={s.subject_code} subject={s} mastery={m} dark={d} onClick={()=>onSelectSubject(s)}/>;})}
      </div>
    </div>
  );
}

export default function App() {
  const {dark,toggle:toggleDark}=useTheme();
  const [screen,setScreen]=useState("login");
  const [user,setUser]=useState(null);
  const [licence,setLicence]=useState(null);
  const [admin,setAdmin]=useState(null);
  const [sessionToken,setSessionToken]=useState(null);
  const [subjects,setSubjects]=useState([]);
  const [history,setHistory]=useState([]);
  const [stats,setStats]=useState({xp:0,streak:0,totalAnswered:0,totalCorrect:0,dailyChallengesDone:0,bestMockScore:0,bestSubjectMastery:0,dailyChallengeToday:false});
  const [selectedSubject,setSelectedSubject]=useState(null);
  const [quizQuestions,setQuizQuestions]=useState([]);
  const [quizConfig,setQuizConfig]=useState(null);
  const [loading,setLoading]=useState(false);
  const [aiAnalysis,setAiAnalysis]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [xpEarned,setXpEarned]=useState(0);

  useEffect(()=>{
    if(!user||!sessionToken)return;
    const iv=setInterval(async()=>{
      try{
        const s=await sbFetch(`active_sessions?session_token=eq.${sessionToken}&is_active=eq.true&select=id`);
        if(!s.length){alert("Your session was terminated. Please log in again.");handleLogout();return;}
        await sbFetch(`active_sessions?session_token=eq.${sessionToken}`,{method:"PATCH",body:JSON.stringify({last_active:new Date().toISOString()})});
      }catch(e){console.error("Heartbeat:",e);}
    },60000);
    return()=>clearInterval(iv);
  },[user,sessionToken]);

  async function loadUserData(u,lic){
    setLoading(true);
    try{
      const licCols=LICENCE_COLS[lic.licence_type]||["applicable_all"];
      const raw=await sbFetch(`questions?select=subject_code,subject_name&${licCols[0]}=eq.true&limit=1000`);
      const sm={};
      raw.forEach(q=>{if(!sm[q.subject_code])sm[q.subject_code]={subject_code:q.subject_code,subject_name:q.subject_name,total:0};sm[q.subject_code].total++;});
      setSubjects(Object.values(sm).sort((a,b)=>a.subject_code.localeCompare(b.subject_code)));
      const hist=await sbFetch(`user_progress?user_id=eq.${u.id}&select=*&order=answered_at.desc&limit=500`);
      setHistory(hist);
      const ta=hist.length,tc=hist.filter(h=>h.is_correct).length;
      const xp=tc*10+(ta-tc)*5;
      const dset=new Set(hist.map(h=>new Date(h.answered_at).toDateString()));
      let streak=0;let dd=new Date();
      while(dset.has(dd.toDateString())){streak++;dd.setDate(dd.getDate()-1);}
      const today=new Date().toDateString();
      const dct=hist.filter(h=>new Date(h.answered_at).toDateString()===today).length>=10;
      const sm2=Object.values(sm).map(s=>{const sh=hist.filter(h=>h.subject_code===s.subject_code);return sh.length>0?Math.round((sh.filter(h=>h.is_correct).length/sh.length)*100):0;});
      setStats({xp,streak,totalAnswered:ta,totalCorrect:tc,dailyChallengesDone:dct?1:0,bestMockScore:0,bestSubjectMastery:Math.max(0,...sm2),dailyChallengeToday:dct});
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  }

  async function handleLogin(u,lic,token){setUser(u);setLicence(lic);setSessionToken(token);await loadUserData(u,lic);setScreen("home");}
  function handleAdminLogin(a){setAdmin(a);setScreen("admin");}

  function handleLogout(){
    if(sessionToken)sbFetch(`active_sessions?session_token=eq.${sessionToken}`,{method:"PATCH",body:JSON.stringify({is_active:false})}).catch(()=>{});
    localStorage.removeItem("ap_session_token");
    setUser(null);setLicence(null);setAdmin(null);setSessionToken(null);setSubjects([]);setHistory([]);
    setStats({xp:0,streak:0,totalAnswered:0,totalCorrect:0,dailyChallengesDone:0,bestMockScore:0,bestSubjectMastery:0,dailyChallengeToday:false});
    setScreen("login");
  }

  async function startQuiz(subject,cfg){
    setLoading(true);
    try{
      const licCols=LICENCE_COLS[licence.licence_type]||["applicable_all"];
      let url=`questions?subject_code=eq.${subject.subject_code}&${licCols[0]}=eq.true&limit=500`;
      if(cfg.mode==="weak"){
        const wids=history.filter(h=>!h.is_correct&&h.subject_code===subject.subject_code).map(h=>h.question_id);
        if(!wids.length){alert("No weak areas found yet! Practice first.");setLoading(false);return;}
        url=`questions?id=in.(${[...new Set(wids)].slice(0,100).join(",")})&limit=100`;
      }
      let qs=await sbFetch(url);
      qs=qs.sort(()=>Math.random()-0.5).slice(0,cfg.qCount);
      setQuizQuestions(qs);setQuizConfig({...cfg,subjectCode:subject.subject_code});setScreen("quiz");
    }catch(e){alert("Failed to load questions.");}
    finally{setLoading(false);}
  }

  async function startDailyChallenge(){
    setLoading(true);
    try{
      const licCols=LICENCE_COLS[licence.licence_type]||["applicable_all"];
      const qs=await sbFetch(`questions?${licCols[0]}=eq.true&limit=500`);
      setQuizQuestions(qs.sort(()=>Math.random()-0.5).slice(0,10));
      setQuizConfig({mode:"timed_sprint",qCount:10,timed:true,minutes:10,subjectCode:"daily",isDaily:true});
      setScreen("quiz");
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  }

  async function handleQuizComplete(answers){
    if(!answers.length){setScreen(selectedSubject?"exam_picker":"home");return;}
    const correct=answers.filter(a=>a.is_correct).length;
    const pct=Math.round((correct/answers.length)*100);
    const xp=correct*10+(answers.length-correct)*5+(quizConfig?.isDaily?50:0)+(pct>=75?20:0);
    setXpEarned(xp);
    try{
      for(const ans of answers){
        await sbFetch("user_progress",{method:"POST",body:JSON.stringify({user_id:user.id,question_id:ans.question_id,subject_code:ans.subject_code,subtopic_code:ans.subtopic_name,selected_answer:ans.selected_answer,is_correct:ans.is_correct,answered_at:new Date().toISOString()})});
      }
      const hist=await sbFetch(`user_progress?user_id=eq.${user.id}&select=*&order=answered_at.desc&limit=500`);
      setHistory(hist);
      const ta=hist.length,tc=hist.filter(h=>h.is_correct).length;
      const newXp=tc*10+(ta-tc)*5;
      const dset=new Set(hist.map(h=>new Date(h.answered_at).toDateString()));
      let streak=0;let dd=new Date();while(dset.has(dd.toDateString())){streak++;dd.setDate(dd.getDate()-1);}
      setStats(s=>({...s,xp:newXp,streak,totalAnswered:ta,totalCorrect:tc}));
    }catch(e){console.error(e);}
    setScreen("results");
  }

  async function handleAIAnalysis(){
    setAiLoading(true);
    try{setAiAnalysis(await getAIAnalysis(history));setScreen("ai_analysis");}
    catch(e){alert("AI analysis failed.");}
    finally{setAiLoading(false);}
  }

  useEffect(()=>{
    document.title="AeroPrep by FTA";
    let m=document.querySelector("meta[name='theme-color']")||document.createElement("meta");
    m.name="theme-color";m.content="#00D46A";document.head.appendChild(m);
  },[]);

  const showNav=!["login","quiz","admin"].includes(screen);

  if(loading)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:bg(dark),flexDirection:"column",gap:16}}>
      <Logo size={36}/>
      <div style={{width:200}}><div className="progress-bar" style={{height:3}}><div className="progress-fill" style={{width:"60%",height:"100%"}}/></div></div>
      <p style={{fontSize:13,color:muted(dark)}}>Loading your cockpit…</p>
    </div>
  );

  return (
    <>
      <GlobalStyles dark={dark}/>
      {screen==="login"&&<LoginScreen onLogin={handleLogin} onAdminLogin={handleAdminLogin} dark={dark}/>}
      {screen==="admin"&&admin&&<AdminPanel admin={admin} onLogout={handleLogout} dark={dark} toggleDark={toggleDark}/>}
      {screen!=="login"&&screen!=="quiz"&&screen!=="admin"&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:`${card(dark)}cc`,backdropFilter:"blur(12px)",borderBottom:`1px solid ${border(dark)}`,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <Logo size={28}/>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <StreakFlame count={stats.streak} dark={dark}/>
            <div style={{background:"rgba(0,212,106,0.12)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:13}}>⚡</span><span style={{fontSize:13,fontWeight:700,color:C.green}}>{stats.xp.toLocaleString()}</span></div>
          </div>
        </div>
      )}
      <div style={{paddingTop:screen!=="login"&&screen!=="quiz"&&screen!=="admin"?70:0}}>
        {screen==="home"&&<HomeScreen user={user} licence={licence} stats={stats} subjects={subjects} history={history} dark={dark} onSelectSubject={s=>{setSelectedSubject(s);setScreen("exam_picker");}} onDailyChallenge={startDailyChallenge}/>}
        {screen==="subjects"&&<SubjectsScreen subjects={subjects} history={history} dark={dark} onSelectSubject={s=>{setSelectedSubject(s);setScreen("exam_picker");}}/>}
        {screen==="exam_picker"&&selectedSubject&&<ExamPickerScreen subject={selectedSubject} dark={dark} onBack={()=>setScreen("subjects")} onStart={cfg=>startQuiz(selectedSubject,cfg)}/>}
        {screen==="quiz"&&<QuizScreen questions={quizQuestions} config={quizConfig} dark={dark} onComplete={handleQuizComplete}/>}
        {screen==="results"&&<ResultsScreen answers={quizQuestions.map((q,i)=>({...q,...(history[i]||{})}))} dark={dark} xpEarned={xpEarned} onRetry={()=>{if(selectedSubject)startQuiz(selectedSubject,quizConfig);}} onHome={()=>setScreen("home")}/>}
        {screen==="progress"&&<ProgressScreen history={history} subjects={subjects} stats={stats} dark={dark} onAIAnalysis={handleAIAnalysis} aiLoading={aiLoading}/>}
        {screen==="ai_analysis"&&<AIAnalysisScreen analysis={aiAnalysis} dark={dark} onBack={()=>setScreen("progress")}/>}
        {screen==="profile"&&<ProfileScreen user={user} licence={licence} stats={stats} dark={dark} toggleDark={toggleDark} onLogout={handleLogout}/>}
      </div>
      {showNav&&<BottomNav screen={["exam_picker","results","ai_analysis"].includes(screen)?null:screen} onNav={s=>setScreen(s)} dark={dark}/>}
    </>
  );
}
