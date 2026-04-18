// XpenseOS — full app, no build step needed
// Uses: React via CDN, htm for JSX-like syntax, Supabase JS client

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { createElement as h, useState, useEffect, useRef, useCallback, Fragment } from 'https://cdn.jsdelivr.net/npm/react@18/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@18/client/+esm';
import htm from 'https://cdn.jsdelivr.net/npm/htm@3/+esm';
const html = htm.bind(h);

/* ══════════════════════════════════════════
   SUPABASE
══════════════════════════════════════════ */
const SB_URL = 'https://ywesuxgjkbnlrgddlatk.supabase.co';
const SB_KEY = 'sb_publishable_y9hmEKzGjpatFJFM52DrOw_Io3KorvJ';
const sb = createClient(SB_URL, SB_KEY);

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const CATS = [
  { id:'food',          label:'Food & Eating Out',  icon:'🍛', color:'#ff6b35', glow:'#ff6b3540', budget:4000 },
  { id:'house',         label:'House & Groceries',  icon:'🏠', color:'#00d4ff', glow:'#00d4ff40', budget:8000 },
  { id:'friends',       label:'Friends Hangout',    icon:'👥', color:'#a855f7', glow:'#a855f740', budget:2000 },
  { id:'lend',          label:'Lends',              icon:'🤝', color:'#f59e0b', glow:'#f59e0b40', budget:3000, subs:['Expect Back',"Don't Expect Back"] },
  { id:'shopping',      label:'Shopping',           icon:'🛒', color:'#ec4899', glow:'#ec489940', budget:3000, subs:['Online','Offline'] },
  { id:'entertainment', label:'Entertainment',      icon:'🎬', color:'#8b5cf6', glow:'#8b5cf640', budget:1500 },
  { id:'bike',          label:'Bike & Commute',     icon:'⛽', color:'#10b981', glow:'#10b98140', budget:2000 },
  { id:'travel',        label:'Travel',             icon:'✈️', color:'#06b6d4', glow:'#06b6d440', budget:3000 },
  { id:'health',        label:'Health & Medical',   icon:'💊', color:'#ef4444', glow:'#ef444440', budget:1000 },
  { id:'bills',         label:'Bills & Recharge',   icon:'📱', color:'#64748b', glow:'#64748b40', budget:1500 },
  { id:'gifts',         label:'Gifts & Occasions',  icon:'🎁', color:'#f43f5e', glow:'#f43f5e40', budget:1000 },
  { id:'learning',      label:'Learning',           icon:'📚', color:'#3b82f6', glow:'#3b82f640', budget:1000 },
  { id:'personal',      label:'Personal Care',      icon:'💈', color:'#14b8a6', glow:'#14b8a640', budget:500  },
];
const INC_SOURCES = ['Monthly Salary',"Father's Transfer",'Bonus','Freelance','Other'];
const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MSHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt   = n => '₹'+Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const uid   = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().split('T')[0];
const ls    = (k,fb) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } };
const lsSet = (k,v)  => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };

/* ══════════════════════════════════════════
   SUPABASE HELPERS
══════════════════════════════════════════ */
async function dbLoadExpenses(){ const {data}=await sb.from('expenses').select('*').order('created_at',{ascending:false}); return (data||[]).map(r=>({id:r.id,amount:r.amount,category:r.category,subType:r.sub_type,note:r.note,date:r.date,createdAt:r.created_at,settled:r.settled})); }
async function dbLoadIncome(){   const {data}=await sb.from('income').select('*').order('created_at',{ascending:false});   return (data||[]).map(r=>({id:r.id,amount:r.amount,source:r.source,note:r.note,date:r.date,createdAt:r.created_at})); }
async function dbLoadBudgets(){ const {data}=await sb.from('budgets').select('*').eq('id','default'); return data&&data[0]?data[0].data:null; }

async function dbAddExpense(e){  await sb.from('expenses').insert({id:e.id,amount:e.amount,category:e.category,sub_type:e.subType||null,note:e.note||null,date:e.date,created_at:e.createdAt,settled:false}); }
async function dbAddIncome(e){   await sb.from('income').insert({id:e.id,amount:e.amount,source:e.source,note:e.note||null,date:e.date,created_at:e.createdAt}); }
async function dbDeleteExpense(id){ await sb.from('expenses').delete().eq('id',id); }
async function dbDeleteIncome(id){  await sb.from('income').delete().eq('id',id); }
async function dbSettleLend(id){    await sb.from('expenses').update({settled:true}).eq('id',id); }
async function dbSaveBudgets(data){ await sb.from('budgets').upsert({id:'default',data}); }

/* ══════════════════════════════════════════
   SMALL COMPONENTS
══════════════════════════════════════════ */
function GlowBar({spent,budget,color}){
  const pct=Math.min((spent/Math.max(budget,1))*100,100);
  const c=pct>=90?'#ef4444':pct>=70?'#f59e0b':color;
  return html`<div style=${{height:5,background:'#0a0f1a',borderRadius:99,overflow:'hidden'}}>
    <div style=${{width:`${pct}%`,height:'100%',background:c,borderRadius:99,boxShadow:`0 0 8px ${c}80`,transition:'width .6s cubic-bezier(.34,1.56,.64,1)'}}/>
  </div>`;
}

function Pill({label,value,color,sub}){
  return html`<div style=${{background:`linear-gradient(135deg,${color}15,${color}05)`,border:`1px solid ${color}30`,borderRadius:14,padding:'14px 16px',flex:1,minWidth:0}}>
    <p style=${{fontSize:10,color:'#3a5070',margin:'0 0 4px',fontWeight:700,letterSpacing:1,textTransform:'uppercase',fontFamily:"'DM Mono',monospace"}}>${label}</p>
    <p style=${{fontSize:20,fontWeight:900,color,margin:0,fontFamily:"'Orbitron',monospace"}}>${value}</p>
    ${sub&&html`<p style=${{fontSize:10,color:'#3a5070',margin:'3px 0 0'}}>${sub}</p>`}
  </div>`;
}

function SyncDot({syncing,error}){
  const c=error?'#ef4444':syncing?'#f59e0b':'#00ff88';
  const label=error?'offline':syncing?'syncing':'synced';
  return html`<div style=${{display:'flex',alignItems:'center',gap:5}}>
    <div style=${{width:7,height:7,borderRadius:'50%',background:c,boxShadow:`0 0 8px ${c}`,animation:syncing?'pulse 1s infinite':'none'}}/>
    <span style=${{fontSize:10,color:c,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>${label}</span>
  </div>`;
}

function Toast({t}){
  if(!t)return null;
  const c={success:'#00ff88',error:'#ef4444',info:'#00d4ff'}[t.type]||'#00ff88';
  return html`<div style=${{position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',background:'#060d18',border:`1px solid ${c}`,color:c,borderRadius:12,padding:'10px 22px',fontSize:13,fontWeight:700,zIndex:9999,boxShadow:`0 0 24px ${c}40`,whiteSpace:'nowrap',fontFamily:"'DM Mono',monospace",animation:'toastIn .3s ease'}}>${t.msg}</div>`;
}

/* ══════════════════════════════════════════
   ADD VIEW
══════════════════════════════════════════ */
function AddView({eAmt,setEAmt,eCat,setECat,eSub,setESub,eNote,setENote,eDate,setEDate,onAddExp,iAmt,setIAmt,iSrc,setISrc,iNote,setINote,iDate,setIDate,onAddInc}){
  const cat=CATS.find(c=>c.id===eCat);
  const eAmtR=useRef(),eNoteR=useRef(),eDateR=useRef();
  const iAmtR=useRef(),iNoteR=useRef(),iDateR=useRef();
  const jump=(e,nr,action)=>{ if(e.key==='Enter'){e.preventDefault(); nr?nr.current?.focus():action?.(); } };

  return html`<div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>

    <div class="card" style=${{border:'1px solid #ff6b3520'}}>
      <div style=${{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#ff6b35,transparent)',borderRadius:'16px 16px 0 0'}}/>
      <p style=${{fontFamily:"'Orbitron',monospace",fontSize:15,color:'#ff6b35',marginBottom:4,fontWeight:700}}>⚡ Log Expense</p>
      <p style=${{fontSize:11,color:'#3a5070',marginBottom:18,fontFamily:"'DM Mono',monospace"}}><span class="kbd">Enter</span> jumps fields · <span class="kbd">Enter</span> on Date saves</p>

      <div style=${{marginBottom:14}}>
        <label class="lbl">Amount ₹</label>
        <input ref=${eAmtR} class="inp" type="number" inputMode="decimal" placeholder="0" autoFocus
          style=${{fontSize:28,fontWeight:900,color:'#ff6b35',fontFamily:"'Orbitron',monospace"}}
          value=${eAmt} onInput=${e=>setEAmt(e.target.value)} onKeyDown=${e=>jump(e,eNoteR)}/>
      </div>

      <div style=${{marginBottom:14}}>
        <label class="lbl">Category</label>
        <div style=${{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
          ${CATS.map(c=>html`<button key=${c.id} class="catbtn"
            onClick=${()=>{ setECat(c.id); setESub(''); }}
            style=${{background:eCat===c.id?`${c.color}18`:'#070e1c',border:`1px solid ${eCat===c.id?c.color:'#1a2840'}`,color:eCat===c.id?c.color:'#3a5070',boxShadow:eCat===c.id?`0 0 14px ${c.glow}`:'none'}}>
            <span style=${{fontSize:18}}>${c.icon}</span>
            <span style=${{fontSize:9,lineHeight:1.2}}>${c.label.split(' ')[0]}</span>
          </button>`)}
        </div>
      </div>

      ${cat?.subs&&html`<div style=${{marginBottom:14}}>
        <label class="lbl">Sub-type</label>
        <div style=${{display:'flex',gap:8}}>
          ${cat.subs.map(s=>html`<button key=${s} onClick=${()=>setESub(s)}
            style=${{flex:1,background:eSub===s?`${cat.color}18`:'#070e1c',border:`1px solid ${eSub===s?cat.color:'#1a2840'}`,color:eSub===s?cat.color:'#3a5070',borderRadius:10,padding:'9px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,transition:'all .15s'}}>
            ${s}
          </button>`)}
        </div>
      </div>`}

      <div style=${{marginBottom:14}}>
        <label class="lbl">${cat?.id==='lend'?'Who did you lend to?':'Note'}</label>
        <input ref=${eNoteR} class="inp" placeholder=${cat?.id==='lend'?'Person\'s name...':'What was this for? (optional)'}
          value=${eNote} onInput=${e=>setENote(e.target.value)} onKeyDown=${e=>jump(e,eDateR)}/>
      </div>

      <div style=${{marginBottom:20}}>
        <label class="lbl">Date</label>
        <input ref=${eDateR} class="inp" type="date" value=${eDate}
          onInput=${e=>setEDate(e.target.value)} onKeyDown=${e=>jump(e,null,onAddExp)}/>
      </div>
      <button class="btn-cyan" onClick=${onAddExp}>Add Expense ⚡</button>
    </div>

    <div class="card" style=${{border:'1px solid #00ff8820'}}>
      <div style=${{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#00ff88,transparent)',borderRadius:'16px 16px 0 0'}}/>
      <p style=${{fontFamily:"'Orbitron',monospace",fontSize:15,color:'#00ff88',marginBottom:4,fontWeight:700}}>💚 Log Income</p>
      <p style=${{fontSize:11,color:'#3a5070',marginBottom:18,fontFamily:"'DM Mono',monospace"}}><span class="kbd">Enter</span> jumps fields · <span class="kbd">Enter</span> on Date saves</p>

      <div style=${{marginBottom:14}}>
        <label class="lbl">Amount ₹</label>
        <input ref=${iAmtR} class="inp" type="number" inputMode="decimal" placeholder="0"
          style=${{fontSize:28,fontWeight:900,color:'#00ff88',fontFamily:"'Orbitron',monospace"}}
          value=${iAmt} onInput=${e=>setIAmt(e.target.value)} onKeyDown=${e=>jump(e,iNoteR)}/>
      </div>

      <div style=${{marginBottom:14}}>
        <label class="lbl">Source</label>
        <select class="inp" value=${iSrc} onChange=${e=>setISrc(e.target.value)}>
          ${INC_SOURCES.map(s=>html`<option key=${s}>${s}</option>`)}
        </select>
      </div>

      <div style=${{marginBottom:14}}>
        <label class="lbl">Note (optional)</label>
        <input ref=${iNoteR} class="inp" placeholder="e.g. March salary, dad sent money..."
          value=${iNote} onInput=${e=>setINote(e.target.value)} onKeyDown=${e=>jump(e,iDateR)}/>
      </div>

      <div style=${{marginBottom:20}}>
        <label class="lbl">Date</label>
        <input ref=${iDateR} class="inp" type="date" value=${iDate}
          onInput=${e=>setIDate(e.target.value)} onKeyDown=${e=>jump(e,null,onAddInc)}/>
      </div>
      <button class="btn-green" onClick=${onAddInc}>Add Income 💚</button>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════
   DASHBOARD VIEW
══════════════════════════════════════════ */
function DashView({month,setMonth,year,monthExp,monthInc,totalIncome,totalSpent,balance,byCategory,budgets,pendingLends,totalLend,settleLend,deleteExp,deleteInc}){
  const sorted=[...CATS].sort((a,b)=>(byCategory[b.id]||0)-(byCategory[a.id]||0));
  const overBudget=CATS.filter(c=>byCategory[c.id]>(budgets[c.id]||c.budget));
  const recent=[...monthExp.map(e=>({...e,_t:'exp'})),...monthInc.map(e=>({...e,_t:'inc'}))].sort((a,b)=>b.createdAt-a.createdAt).slice(0,8);

  return html`<div style=${{display:'flex',flexDirection:'column',gap:16}}>

    <div style=${{display:'flex',gap:5,overflowX:'auto',paddingBottom:2}}>
      ${MSHORT.map((m,i)=>html`<button key=${m} onClick=${()=>setMonth(i)} style=${{background:month===i?'linear-gradient(135deg,#00d4ff,#0088aa)':'#0a1020',color:month===i?'#060d18':'#3a5070',border:`1px solid ${month===i?'#00d4ff':'#1a2840'}`,borderRadius:20,padding:'5px 13px',cursor:'pointer',fontSize:11,fontWeight:800,whiteSpace:'nowrap',fontFamily:"'DM Mono',monospace",boxShadow:month===i?'0 0 14px #00d4ff40':'none',flexShrink:0,transition:'all .2s'}}>${m}</button>`)}
    </div>

    <div class="card">
      <div style=${{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,#00d4ff,transparent)',borderRadius:'16px 16px 0 0'}}/>
      <p style=${{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#3a5070',letterSpacing:2,marginBottom:6}}>${MONTHS[month].toUpperCase()} ${year} · OVERVIEW</p>
      <p style=${{fontFamily:"'Orbitron',monospace",fontSize:36,fontWeight:900,color:balance>=0?'#00ff88':'#ef4444',letterSpacing:-1,textShadow:`0 0 30px ${balance>=0?'#00ff8840':'#ef444440'}`,marginBottom:4}}>${balance>=0?'+':'-'}${fmt(balance)}</p>
      <p style=${{fontSize:12,color:'#3a5070',marginBottom:16}}>${totalIncome>0?`${Math.round((balance/totalIncome)*100)}% of income remaining`:'No income logged yet — go to Add tab'}</p>
      ${totalIncome>0&&html`<div style=${{marginBottom:16}}>
        <${GlowBar} spent=${totalSpent} budget=${totalIncome} color="#00d4ff"/>
        <div style=${{display:'flex',justifyContent:'space-between',marginTop:5}}>
          <span style=${{fontSize:11,color:'#3a5070',fontFamily:"'DM Mono',monospace"}}>spent ${fmt(totalSpent)}</span>
          <span style=${{fontSize:11,color:'#3a5070',fontFamily:"'DM Mono',monospace"}}>income ${fmt(totalIncome)}</span>
        </div>
      </div>`}
      <div style=${{display:'flex',gap:10,flexWrap:'wrap'}}>
        <${Pill} label="Income" value=${fmt(totalIncome)} color="#00ff88" sub=${`${monthInc.length} entries`}/>
        <${Pill} label="Spent"  value=${fmt(totalSpent)}  color="#ff6b35" sub=${`${monthExp.length} txns`}/>
        ${totalLend>0&&html`<${Pill} label="Owed to You" value=${fmt(totalLend)} color="#f59e0b" sub=${`${pendingLends.length} pending`}/>`}
      </div>
    </div>

    ${overBudget.length>0&&html`<div class="card" style=${{border:'1px solid #ef444440',background:'linear-gradient(135deg,#160505,#200808)',animation:'pulse 2s infinite'}}>
      <p style=${{fontSize:11,color:'#ef4444',fontWeight:800,marginBottom:10,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>⚡ BUDGET BREACH · ${overBudget.length} CATEGOR${overBudget.length>1?'IES':'Y'}</p>
      ${overBudget.map(c=>html`<div key=${c.id} style=${{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style=${{fontSize:12,color:'#fca5a5'}}>${c.icon} ${c.label}</span>
        <span style=${{fontSize:12,fontFamily:"'DM Mono',monospace",color:'#ef4444',fontWeight:700}}>${fmt(byCategory[c.id])} / ${fmt(budgets[c.id])}</span>
      </div>`)}
    </div>`}

    <div class="card">
      <p style=${{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#3a5070',letterSpacing:2,marginBottom:16}}>CATEGORY BREAKDOWN</p>
      ${sorted.filter(c=>byCategory[c.id]>0).length===0
        ?html`<div style=${{textAlign:'center',padding:'30px 0'}}><p style=${{fontSize:32,marginBottom:8}}>⚡</p><p style=${{color:'#3a5070',fontSize:13}}>No expenses this month — go to Add tab</p></div>`
        :html`<div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          ${sorted.filter(c=>byCategory[c.id]>0).map(c=>{
            const bud=budgets[c.id]||c.budget;
            return html`<div key=${c.id} style=${{background:'#070e1c',border:`1px solid ${c.color}20`,borderRadius:12,padding:'12px 14px'}}>
              <div style=${{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style=${{fontSize:13,fontWeight:700,color:'#8a9ab0'}}>${c.icon} ${c.label.split(' ')[0]}</span>
                <span style=${{fontFamily:"'DM Mono',monospace",fontSize:12,color:byCategory[c.id]>bud?'#ef4444':c.color,fontWeight:700}}>${fmt(byCategory[c.id])}</span>
              </div>
              <${GlowBar} spent=${byCategory[c.id]} budget=${bud} color=${c.color}/>
              <p style=${{fontSize:10,color:'#3a5070',marginTop:5,fontFamily:"'DM Mono',monospace"}}>of ${fmt(bud)}</p>
            </div>`;
          })}
        </div>`}
    </div>

    ${pendingLends.length>0&&html`<div class="card" style=${{border:'1px solid #f59e0b25'}}>
      <div style=${{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <p style=${{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#f59e0b',letterSpacing:2}}>🤝 MONEY OWED TO YOU</p>
        <span style=${{fontFamily:"'Orbitron',monospace",fontSize:14,color:'#f59e0b',fontWeight:700}}>${fmt(totalLend)}</span>
      </div>
      ${pendingLends.map((e,i)=>html`<div key=${e.id} style=${{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:i<pendingLends.length-1?'1px solid #0a1020':'none'}}>
        <div style=${{flex:1}}>
          <p style=${{fontSize:13,fontWeight:600,color:'#c8d8f0'}}>${e.note||'Someone'}</p>
          <p style=${{fontSize:11,color:'#3a5070',fontFamily:"'DM Mono',monospace"}}>${e.date}</p>
        </div>
        <span style=${{fontFamily:"'DM Mono',monospace",fontSize:13,color:'#f59e0b',fontWeight:700}}>${fmt(e.amount)}</span>
        <button onClick=${()=>settleLend(e.id)} style=${{background:'#f59e0b15',border:'1px solid #f59e0b40',color:'#f59e0b',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:11,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>✓ Received</button>
      </div>`)}
    </div>`}

    <div class="card">
      <p style=${{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#3a5070',letterSpacing:2,marginBottom:14}}>RECENT TRANSACTIONS</p>
      ${recent.length===0&&html`<p style=${{color:'#3a5070',fontSize:13,textAlign:'center',padding:'16px 0'}}>Nothing logged this month</p>`}
      ${recent.map((e,i)=>{
        const cat=CATS.find(c=>c.id===e.category);
        return html`<div key=${e.id} style=${{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<recent.length-1?'1px solid #0a1020':'none'}}>
          <div style=${{width:38,height:38,borderRadius:10,background:e._t==='inc'?'#00ff8818':`${cat?.color}18`,border:`1px solid ${e._t==='inc'?'#00ff8828':`${cat?.color}28`}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
            ${e._t==='inc'?'💚':cat?.icon}
          </div>
          <div style=${{flex:1,minWidth:0}}>
            <p style=${{fontSize:13,fontWeight:600,color:'#c8d8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>${e.note||(e._t==='inc'?e.source:cat?.label)}</p>
            <p style=${{fontSize:11,color:'#3a5070',fontFamily:"'DM Mono',monospace"}}>${e._t==='inc'?e.source:`${cat?.label}${e.subType?' · '+e.subType:''}`} · ${e.date}</p>
          </div>
          <div style=${{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style=${{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:e._t==='inc'?'#00ff88':'#ff6b35'}}>${e._t==='inc'?'+':'-'}${fmt(e.amount)}</span>
            <button class="del-btn" onClick=${()=>e._t==='inc'?deleteInc(e.id):deleteExp(e.id)} title="Delete">✕</button>
          </div>
        </div>`;
      })}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════
   HISTORY VIEW
══════════════════════════════════════════ */
function HistView({monthExp,monthInc,deleteExp,deleteInc,settleLend}){
  const [search,setSearch]=useState('');
  const [filterCat,setFilterCat]=useState('all');
  const [armed,setArmed]=useState(null);
  const all=[...monthExp.map(e=>({...e,_t:'exp'})),...monthInc.map(e=>({...e,_t:'inc'}))].sort((a,b)=>b.createdAt-a.createdAt);
  const filtered=all.filter(e=>{
    const cat=CATS.find(c=>c.id===e.category);
    const matchS=!search||[e.note,e.source,cat?.label].filter(Boolean).some(s=>s.toLowerCase().includes(search.toLowerCase()));
    const matchC=filterCat==='all'||(filterCat==='inc'&&e._t==='inc')||e.category===filterCat;
    return matchS&&matchC;
  });
  const tryDelete=(id,type)=>{
    if(armed===id){ type==='inc'?deleteInc(id):deleteExp(id); setArmed(null); }
    else{ setArmed(id); setTimeout(()=>setArmed(a=>a===id?null:a),3000); }
  };
  return html`<div style=${{display:'flex',flexDirection:'column',gap:14}}>
    <div class="card">
      <input class="inp" placeholder="🔍 Search by name, note or category..." value=${search} onInput=${e=>setSearch(e.target.value)} style=${{marginBottom:10}}/>
      <div style=${{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
        ${[{id:'all',label:'All',icon:'◈'},{id:'inc',label:'Income',icon:'💚'},...CATS].map(c=>html`<button key=${c.id} onClick=${()=>setFilterCat(c.id)} style=${{background:filterCat===c.id?'#00d4ff18':'#070e1c',border:`1px solid ${filterCat===c.id?'#00d4ff':'#1a2840'}`,color:filterCat===c.id?'#00d4ff':'#3a5070',borderRadius:20,padding:'4px 12px',cursor:'pointer',fontSize:11,fontWeight:700,whiteSpace:'nowrap',fontFamily:"'DM Mono',monospace",flexShrink:0}}>${c.icon} ${c.label}</button>`)}
      </div>
    </div>
    <div class="card">
      <p style=${{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#3a5070',letterSpacing:2,marginBottom:12}}>${filtered.length} TRANSACTIONS · <span style=${{color:'#2a3a50'}}>click ✕ once to arm · again to confirm</span></p>
      ${filtered.length===0&&html`<p style=${{color:'#3a5070',fontSize:13,textAlign:'center',padding:'20px 0'}}>No results</p>`}
      ${filtered.map((e,i)=>{
        const cat=CATS.find(c=>c.id===e.category);
        const isArmed=armed===e.id;
        return html`<div key=${e.id} style=${{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:i<filtered.length-1?'1px solid #0a1020':'none',background:isArmed?'#1a050510':'none',borderRadius:isArmed?8:0}}>
          <div style=${{width:38,height:38,borderRadius:10,background:e._t==='inc'?'#00ff8815':`${cat?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>${e._t==='inc'?'💚':cat?.icon}</div>
          <div style=${{flex:1,minWidth:0}}>
            <div style=${{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
              <p style=${{fontSize:13,fontWeight:600,color:'#c8d8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>${e.note||(e._t==='inc'?e.source:cat?.label)}</p>
              ${e.subType&&html`<span style=${{fontSize:9,background:`${cat?.color}20`,color:cat?.color,borderRadius:5,padding:'1px 6px',fontWeight:800,flexShrink:0}}>${e.subType}</span>`}
              ${e.settled&&html`<span style=${{fontSize:9,background:'#00ff8820',color:'#00ff88',borderRadius:5,padding:'1px 6px',fontWeight:800,flexShrink:0}}>✓ SETTLED</span>`}
            </div>
            <p style=${{fontSize:11,color:'#3a5070',fontFamily:"'DM Mono',monospace"}}>${e._t==='inc'?e.source:cat?.label} · ${e.date}</p>
          </div>
          <div style=${{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
            <span style=${{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:e._t==='inc'?'#00ff88':'#ff6b35'}}>${e._t==='inc'?'+':'-'}${fmt(e.amount)}</span>
            <div style=${{display:'flex',gap:4}}>
              ${e.category==='lend'&&!e.settled&&html`<button onClick=${()=>settleLend(e.id)} style=${{fontSize:10,background:'#f59e0b15',border:'1px solid #f59e0b40',color:'#f59e0b',borderRadius:6,padding:'2px 8px',cursor:'pointer',fontFamily:"'DM Mono',monospace",fontWeight:700}}>Got back</button>`}
              <button onClick=${()=>tryDelete(e.id,e._t)} style=${{fontSize:11,background:isArmed?'#ef444430':'#ef444410',border:`1px solid ${isArmed?'#ef4444':'#ef444430'}`,color:isArmed?'#ef4444':'#3a5070',borderRadius:6,padding:'2px 10px',cursor:'pointer',fontFamily:"'DM Mono',monospace",fontWeight:700,transition:'all .2s'}}>${isArmed?'confirm ✕':'✕'}</button>
            </div>
          </div>
        </div>`;
      })}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════
   BUDGET VIEW
══════════════════════════════════════════ */
function BudgetView({byCategory,budgets,saveBudgets,showToast}){
  const [local,setLocal]=useState({...budgets});
  return html`<div style=${{display:'flex',flexDirection:'column',gap:16}}>
    <div class="card">
      <p style=${{fontFamily:"'Orbitron',monospace",fontSize:15,color:'#00d4ff',marginBottom:4,fontWeight:700}}>Monthly Budgets</p>
      <p style=${{fontSize:12,color:'#3a5070',marginBottom:20}}>Type a new amount · press <span class="kbd">Enter</span> per field or hit Save All.</p>
      <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        ${CATS.map(c=>{
          const bud=local[c.id]||c.budget;
          const spent=byCategory[c.id]||0;
          const pct=Math.round((spent/Math.max(bud,1))*100);
          return html`<div key=${c.id} style=${{background:'#070e1c',border:`1px solid ${pct>=90?'#ef444430':'#1a2840'}`,borderRadius:12,padding:'14px'}}>
            <div style=${{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style=${{fontSize:13,fontWeight:700,color:'#8a9ab0'}}>${c.icon} ${c.label.split(' ')[0]}</span>
              <span style=${{fontFamily:"'DM Mono',monospace",fontSize:11,color:pct>=90?'#ef4444':pct>=70?'#f59e0b':c.color,fontWeight:700}}>${pct}%</span>
            </div>
            <${GlowBar} spent=${spent} budget=${bud} color=${c.color}/>
            <p style=${{fontSize:10,color:'#3a5070',margin:'5px 0 8px',fontFamily:"'DM Mono',monospace"}}>${fmt(spent)} of ${fmt(bud)}</p>
            <input class="inp" type="number" inputMode="decimal" placeholder=${String(bud)} style=${{fontSize:13,padding:'6px 10px'}}
              onInput=${e=>{ const v=Number(e.target.value); if(v>0) setLocal(p=>({...p,[c.id]:v})); }}
              onKeyDown=${e=>{ if(e.key==='Enter'){ saveBudgets({...local}); showToast('Budget saved ✓'); } }}/>
          </div>`;
        })}
      </div>
      <button class="btn-cyan" style=${{marginTop:16}} onClick=${()=>{ saveBudgets({...local}); showToast('All budgets saved ✓'); }}>Save All Budgets</button>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════
   SETTINGS VIEW
══════════════════════════════════════════ */
function SettingsView({expenses,income,pendingLends,showToast}){
  const totalS=expenses.reduce((s,e)=>s+e.amount,0);
  const totalI=income.reduce((s,e)=>s+e.amount,0);
  const months=[...new Set(expenses.map(e=>`${new Date(e.date).getFullYear()}-${new Date(e.date).getMonth()}`))].length||1;
  return html`<div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
    <div style=${{display:'flex',flexDirection:'column',gap:16}}>
      <div class="card" style=${{border:'1px solid #00d4ff20'}}>
        <p style=${{fontFamily:"'Orbitron',monospace",fontSize:14,color:'#00d4ff',marginBottom:14,fontWeight:700}}>☁️ Cloud Sync</p>
        <p style=${{fontSize:12,color:'#3a5070',lineHeight:1.7}}>Your data is automatically synced to Supabase cloud. Open the same URL on any device — laptop, iPhone — and your data will be there.</p>
        <div style=${{marginTop:12,background:'#070e1c',border:'1px solid #1a2840',borderRadius:10,padding:'10px 14px'}}>
          <p style=${{fontSize:11,color:'#3a5070',fontFamily:"'DM Mono',monospace"}}>🌐 hvbjgiy.github.io/xpenseos</p>
        </div>
      </div>
      <div class="card" style=${{border:'1px solid #ef444428'}}>
        <p style=${{fontFamily:"'Orbitron',monospace",fontSize:13,color:'#ef4444',marginBottom:10,fontWeight:700}}>☢ Danger Zone</p>
        <p style=${{fontSize:11,color:'#3a5070',marginBottom:12}}>This deletes data from the cloud database. Cannot be undone.</p>
        <button onClick=${async()=>{ if(window.confirm('Delete ALL data from cloud? Cannot be undone!')){ await sb.from('expenses').delete().neq('id','__none__'); await sb.from('income').delete().neq('id','__none__'); window.location.reload(); } }} style=${{background:'#160505',border:'1px solid #ef444440',color:'#ef4444',borderRadius:10,padding:'10px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",width:'100%'}}>🗑 Clear All Data</button>
      </div>
    </div>
    <div class="card">
      <p style=${{fontFamily:"'Orbitron',monospace",fontSize:14,color:'#00d4ff',marginBottom:16,fontWeight:700}}>📊 All-time Stats</p>
      ${[
        ['Months tracked',months],
        ['Total transactions',expenses.length+income.length],
        ['All-time spent',fmt(totalS)],
        ['All-time income',fmt(totalI)],
        ['Net saved',fmt(totalI-totalS)],
        ['Avg monthly spend',fmt(Math.round(totalS/months))],
        ['Total lent out',fmt(expenses.filter(e=>e.category==='lend').reduce((s,e)=>s+e.amount,0))],
        ['Pending recovery',fmt(pendingLends.reduce((s,e)=>s+e.amount,0))],
      ].map(([k,v])=>html`<div key=${k} style=${{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid #0a1020'}}>
        <span style=${{fontSize:12,color:'#3a5070'}}>${k}</span>
        <span style=${{fontFamily:"'DM Mono',monospace",fontSize:13,color:'#c8d8f0',fontWeight:700}}>${v}</span>
      </div>`)}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════ */
function App(){
  const now=new Date();
  const [expenses,setExpenses]=useState([]);
  const [income,setIncome]=useState([]);
  const [budgets,setBudgets]=useState(Object.fromEntries(CATS.map(c=>[c.id,c.budget])));
  const [month,setMonth]=useState(now.getMonth());
  const [year]=useState(now.getFullYear());
  const [tab,setTab]=useState('dashboard');
  const [toast,setToast]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [syncError,setSyncError]=useState(false);
  const [loaded,setLoaded]=useState(false);

  // form state
  const [eAmt,setEAmt]=useState('');
  const [eCat,setECat]=useState('food');
  const [eSub,setESub]=useState('');
  const [eNote,setENote]=useState('');
  const [eDate,setEDate]=useState(today());
  const [iAmt,setIAmt]=useState('');
  const [iSrc,setISrc]=useState('Monthly Salary');
  const [iNote,setINote]=useState('');
  const [iDate,setIDate]=useState(today());

  const showToast=(msg,type='success')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2600); };

  // load from supabase on mount, fallback to localStorage
  useEffect(()=>{
    (async()=>{
      setSyncing(true);
      try{
        const [exps,incs,buds]=await Promise.all([dbLoadExpenses(),dbLoadIncome(),dbLoadBudgets()]);
        setExpenses(exps); setIncome(incs);
        if(buds) setBudgets(buds);
        setSyncError(false);
      }catch(e){
        // fallback to localStorage if offline
        setExpenses(ls('xp_exp',[])); setIncome(ls('xp_inc',[]));
        const b=ls('xp_bud',null); if(b) setBudgets(b);
        setSyncError(true);
        showToast('Offline — using local data','info');
      }finally{ setSyncing(false); setLoaded(true); }
    })();
  },[]);

  // derived
  const monthExp=expenses.filter(e=>{ const d=new Date(e.date); return d.getMonth()===month&&d.getFullYear()===year; });
  const monthInc=income.filter(e=>{   const d=new Date(e.date); return d.getMonth()===month&&d.getFullYear()===year; });
  const totalIncome=monthInc.reduce((s,e)=>s+e.amount,0);
  const totalSpent=monthExp.reduce((s,e)=>s+e.amount,0);
  const balance=totalIncome-totalSpent;
  const byCategory=Object.fromEntries(CATS.map(c=>[c.id,0]));
  monthExp.forEach(e=>{ if(byCategory[e.category]!==undefined) byCategory[e.category]+=e.amount; });
  const pendingLends=expenses.filter(e=>e.category==='lend'&&e.subType==='Expect Back'&&!e.settled);
  const totalLend=pendingLends.reduce((s,e)=>s+e.amount,0);

  const onAddExp=async()=>{
    if(!eAmt||Number(eAmt)<=0){ showToast('Enter valid amount','error'); return; }
    const cat=CATS.find(c=>c.id===eCat);
    if(cat?.subs&&!eSub){ showToast('Select a sub-type','error'); return; }
    const entry={id:uid(),amount:Number(eAmt),category:eCat,subType:eSub,note:eNote,date:eDate,createdAt:Date.now()};
    setExpenses(p=>[entry,...p]); setEAmt(''); setENote(''); setESub('');
    showToast('Expense logged ⚡');
    setSyncing(true);
    try{ await dbAddExpense(entry); setSyncError(false); }
    catch{ setSyncError(true); lsSet('xp_exp',[entry,...expenses]); }
    finally{ setSyncing(false); }
  };

  const onAddInc=async()=>{
    if(!iAmt||Number(iAmt)<=0){ showToast('Enter valid amount','error'); return; }
    const entry={id:uid(),amount:Number(iAmt),source:iSrc,note:iNote,date:iDate,createdAt:Date.now()};
    setIncome(p=>[entry,...p]); setIAmt(''); setINote('');
    showToast('Income added 💚');
    setSyncing(true);
    try{ await dbAddIncome(entry); setSyncError(false); }
    catch{ setSyncError(true); lsSet('xp_inc',[entry,...income]); }
    finally{ setSyncing(false); }
  };

  const deleteExp=async(id)=>{
    setExpenses(p=>p.filter(e=>e.id!==id));
    showToast('Deleted','info');
    try{ await dbDeleteExpense(id); }catch{}
  };

  const deleteInc=async(id)=>{
    setIncome(p=>p.filter(e=>e.id!==id));
    showToast('Deleted','info');
    try{ await dbDeleteIncome(id); }catch{}
  };

  const settleLend=async(id)=>{
    setExpenses(p=>p.map(e=>e.id===id?{...e,settled:true}:e));
    showToast('Marked received ✓');
    try{ await dbSettleLend(id); }catch{}
  };

  const saveBudgets=async(b)=>{
    setBudgets(b); lsSet('xp_bud',b);
    try{ await dbSaveBudgets(b); }catch{}
  };

  const TABS=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'add',      icon:'⚡',label:'Add'},
    {id:'history',  icon:'◎',label:'History'},
    {id:'budget',   icon:'◐',label:'Budget'},
    {id:'settings', icon:'◉',label:'Settings'},
  ];

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#060d18}::-webkit-scrollbar-thumb{background:#1a2840;border-radius:99px}
    @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .card{background:linear-gradient(145deg,#0a1020,#0d1830);border:1px solid #1a2840;border-radius:16px;padding:22px;animation:fadeUp .35s ease both;position:relative;overflow:hidden}
    .card:hover{border-color:#1e3255;transition:border-color .2s}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    input[type=number]{-moz-appearance:textfield}
    .inp{background:#070e1c;border:1px solid #1a2840;border-radius:10px;padding:10px 14px;color:#c8d8f0;font-size:14px;font-family:'DM Sans',sans-serif;width:100%;transition:border .2s,box-shadow .2s;outline:none}
    .inp:focus{border-color:#00d4ff;box-shadow:0 0 0 3px #00d4ff18}
    .inp::placeholder{color:#2a3a50}
    select.inp option{background:#0a1020}
    .btn-cyan{background:linear-gradient(135deg,#00d4ff,#0099cc);color:#060d18;border:none;border-radius:12px;padding:12px 24px;font-weight:800;font-size:15px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 0 20px #00d4ff30;width:100%}
    .btn-cyan:hover{transform:translateY(-2px);box-shadow:0 0 36px #00d4ff50}
    .btn-green{background:linear-gradient(135deg,#00ff88,#00bb66);color:#060d18;border:none;border-radius:12px;padding:12px 24px;font-weight:800;font-size:15px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 0 20px #00ff8830;width:100%}
    .btn-green:hover{transform:translateY(-2px);box-shadow:0 0 36px #00ff8850}
    .btn-ghost{background:transparent;border:1px solid #1a2840;color:#4a6080;border-radius:10px;padding:9px 18px;font-family:'DM Sans',sans-serif;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
    .btn-ghost:hover{border-color:#00d4ff;color:#00d4ff}
    .lbl{font-size:10px;color:#3a5070;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px;display:block;font-family:'DM Mono',monospace}
    .catbtn{background:#070e1c;border:1px solid #1a2840;border-radius:12px;padding:10px 6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;transition:all .15s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px}
    .catbtn:hover{border-color:#2a4060}
    .navtab{background:none;border:1px solid transparent;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border-radius:12px;transition:all .2s;flex:1}
    .del-btn{background:none;border:none;color:#2a3a50;cursor:pointer;font-family:'DM Mono',monospace;font-size:12px;padding:3px 7px;border-radius:6px;transition:all .15s}
    .del-btn:hover{background:#ef444420;color:#ef4444}
    .kbd{display:inline-block;background:#0a1020;border:1px solid #1a2840;border-radius:5px;padding:1px 6px;font-family:'DM Mono',monospace;font-size:10px;color:#3a5070;margin:0 2px}
    .scanlines{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,212,255,.012) 2px,rgba(0,212,255,.012) 4px)}
  `;

  if(!loaded) return html`<div style=${{minHeight:'100vh',background:'#060d18'}}><style>${css}</style></div>`;

  return html`<div style=${{minHeight:'100vh',background:'#060d18',color:'#c8d8f0',fontFamily:"'DM Sans',sans-serif"}}>
    <style>${css}</style>
    <div class="scanlines"/>
    <${Toast} t=${toast}/>

    <div style=${{position:'sticky',top:0,zIndex:50,background:'#060d18ee',backdropFilter:'blur(24px)',borderBottom:'1px solid #1a2840'}}>
      <div style=${{maxWidth:1200,margin:'0 auto',padding:'14px 28px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <p style=${{fontFamily:"'Orbitron',monospace",fontSize:20,fontWeight:900,color:'#00d4ff',margin:0,letterSpacing:3,textShadow:'0 0 24px #00d4ff50'}}>XPENSE<span style=${{color:'#00ff88'}}>OS</span></p>
          <div style=${{display:'flex',alignItems:'center',gap:10,marginTop:2}}>
            <p style=${{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#3a5070',margin:0,letterSpacing:1.5}}>${MONTHS[month].toUpperCase()} ${year} · ${monthExp.length} transactions</p>
            <${SyncDot} syncing=${syncing} error=${syncError}/>
          </div>
        </div>
        <div style=${{display:'flex',gap:24,alignItems:'center'}}>
          ${[['INCOME',fmt(totalIncome),'#00ff88'],['SPENT',fmt(totalSpent),'#ff6b35'],['BALANCE',`${balance>=0?'+':''}${fmt(balance)}`,balance>=0?'#00ff88':'#ef4444']].map(([k,v,c])=>html`<div key=${k} style=${{textAlign:'right'}}>
            <p style=${{fontSize:10,color:'#3a5070',margin:0,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>${k}</p>
            <p style=${{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:900,color:c,margin:0,textShadow:`0 0 14px ${c}60`}}>${v}</p>
          </div>`)}
        </div>
      </div>
      <div style=${{maxWidth:1200,margin:'0 auto',padding:'10px 28px 10px'}}>
        <div style=${{display:'flex',gap:4,background:'#0a1020',border:'1px solid #1a2840',borderRadius:14,padding:4}}>
          ${TABS.map(t=>html`<button key=${t.id} class="navtab" onClick=${()=>setTab(t.id)} style=${{color:tab===t.id?'#00d4ff':'#3a5070',background:tab===t.id?'linear-gradient(135deg,#00d4ff14,#00d4ff06)':'none',border:tab===t.id?'1px solid #00d4ff28':'1px solid transparent',fontWeight:tab===t.id?800:500,boxShadow:tab===t.id?'0 0 18px #00d4ff18':'none'}}>
            <span style=${{fontSize:16,fontFamily:'monospace'}}>${t.icon}</span>
            <span style=${{fontSize:11,letterSpacing:0.5}}>${t.label}</span>
          </button>`)}
        </div>
      </div>
    </div>

    <div style=${{maxWidth:1200,margin:'0 auto',padding:'20px 28px 48px',position:'relative',zIndex:1}}>
      ${tab==='dashboard'&&html`<${DashView} month=${month} setMonth=${setMonth} year=${year} monthExp=${monthExp} monthInc=${monthInc} totalIncome=${totalIncome} totalSpent=${totalSpent} balance=${balance} byCategory=${byCategory} budgets=${budgets} pendingLends=${pendingLends} totalLend=${totalLend} settleLend=${settleLend} deleteExp=${deleteExp} deleteInc=${deleteInc}/>`}
      ${tab==='add'&&html`<${AddView} eAmt=${eAmt} setEAmt=${setEAmt} eCat=${eCat} setECat=${setECat} eSub=${eSub} setESub=${setESub} eNote=${eNote} setENote=${setENote} eDate=${eDate} setEDate=${setEDate} onAddExp=${onAddExp} iAmt=${iAmt} setIAmt=${setIAmt} iSrc=${iSrc} setISrc=${setISrc} iNote=${iNote} setINote=${setINote} iDate=${iDate} setIDate=${setIDate} onAddInc=${onAddInc}/>`}
      ${tab==='history'&&html`<${HistView} monthExp=${monthExp} monthInc=${monthInc} deleteExp=${deleteExp} deleteInc=${deleteInc} settleLend=${settleLend}/>`}
      ${tab==='budget'&&html`<${BudgetView} byCategory=${byCategory} budgets=${budgets} saveBudgets=${saveBudgets} showToast=${showToast}/>`}
      ${tab==='settings'&&html`<${SettingsView} expenses=${expenses} income=${income} pendingLends=${pendingLends} showToast=${showToast}/>`}
    </div>
  </div>`;
}

// boot
const root=createRoot(document.getElementById('root'));
root.render(html`<${App}/>`);
document.getElementById('splash').style.opacity='0';
setTimeout(()=>{ const s=document.getElementById('splash'); if(s) s.remove(); },600);
