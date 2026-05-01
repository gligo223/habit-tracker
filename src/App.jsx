import { useState, useEffect, useRef } from "react";

const SK="habit_tracker_v1", TK="habit_tracker_theme_v1";
const SKIP_TAGS=["busy","low energy","avoided","forgot"];
const DEF_H=[
  {id:1,name:"Pre-market review (NQ/ES)",category:"trading",weight:3,core:true},
  {id:2,name:"Backtest 1 setup",category:"trading",weight:3,core:true},
  {id:3,name:"Trade journal entry",category:"trading",weight:2,core:true},
  {id:4,name:"Exercise / movement",category:"health",weight:2,core:false},
  {id:5,name:"Sleep by midnight",category:"health",weight:2,core:true},
];

function loadData(){
  try{const r=localStorage.getItem(SK);if(r)return JSON.parse(r);}catch{}
  return{habits:DEF_H,goals:[],habitLog:{},goalSnapshots:{},skipLog:{},graceLog:{}};
}
function loadTheme(){try{const t=localStorage.getItem(TK);if(t)return t;}catch{}return"auto";}
function getToday(){return new Date().toISOString().split("T")[0];}
function autoTheme(){const h=new Date().getHours();return h>=7&&h<20?"light":"dark";}
function pad(n){return String(n).padStart(2,"0");}
function dateKey(y,m,d){return`${y}-${pad(m+1)}-${pad(d)}`;}
function monthOf(s){return s.slice(0,7);}

const MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WD=["Mo","Tu","We","Th","Fr","Sa","Su"];

const DARK={bg:"#0a0a0a",sur:"#141414",sur2:"#1e1e1e",b:"#2a2a2a",b2:"#3a3a3a",tx:"#f0f0f0",tm:"#777",td:"#444",bar:"#0a0a0a",ta:"#242424",ck:"#ccc",
  cat:{trading:{bg:"#0c2a4a",tx:"#7ab8f5",b:"#1a4a7a"},health:{bg:"#0a2e1a",tx:"#5ecc8a",b:"#1a5a30"},other:{bg:"#2a1a4a",tx:"#b09af5",b:"#4a2a8a"}},
  heat:["#1e1e1e","#0f4a2e","#1a7a4a","#1D9E75","#2ecc97"],ac:"#378ADD",gn:"#1D9E75",br:"#2ecc97",am:"#f0a500",rd:"#e05555"};
const LIGHT={bg:"#f7f7f3",sur:"#fff",sur2:"#f0f0ea",b:"#e2e2da",b2:"#ccc",tx:"#111",tm:"#666",td:"#bbb",bar:"#efefeb",ta:"#e8e8e2",ck:"#555",
  cat:{trading:{bg:"#deeefb",tx:"#1a4a7a",b:"#b5d4f4"},health:{bg:"#dff5e8",tx:"#1a5a30",b:"#a0ddb8"},other:{bg:"#eee8fb",tx:"#4a2a8a",b:"#c8b8f4"}},
  heat:["#e8e8e0","#c8e6d4","#8ecfaa","#1D9E75","#0f6e50"],ac:"#1a6bbf",gn:"#1a8050",br:"#167040",am:"#c47f00",rd:"#c0392b"};

function wScore(habits,dids){
  const tot=habits.reduce((a,h)=>a+h.weight,0);
  if(!tot)return 0;
  return Math.round(habits.filter(h=>dids.includes(h.id)).reduce((a,h)=>a+h.weight,0)/tot*100);
}
function calcStreak(hid,log,grace,upto){
  let s=0;const d=new Date(upto);
  while(true){
    const k=d.toISOString().split("T")[0];
    if(!(log[k]||[]).includes(hid)&&!(grace[k]||[]).includes(hid))break;
    s++;d.setDate(d.getDate()-1);
  }
  return s;
}
function calcBest(hid,log,grace){
  const all=[...new Set([...Object.keys(log),...Object.keys(grace)])].sort();
  let best=0,cur=0,prev=null;
  for(const d of all){
    const hit=(log[d]||[]).includes(hid)||(grace[d]||[]).includes(hid);
    if(!hit){cur=0;prev=d;continue;}
    cur=prev&&(new Date(d)-new Date(prev))/864e5===1?cur+1:1;
    if(cur>best)best=cur;prev=d;
  }
  return best;
}

function Badge({cat,T}){const c=T.cat[cat]||T.cat.other;return <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:16,background:c.bg,color:c.tx,border:`0.5px solid ${c.b}`,flexShrink:0}}>{cat}</span>;}
function WDots({w,T}){return <span style={{display:"inline-flex",gap:2}}>{[1,2,3].map(i=><span key={i} style={{width:5,height:5,borderRadius:"50%",display:"inline-block",background:i<=w?T.ac:T.b}}/>)}</span>;}
function Pips({n,T}){return <span style={{display:"inline-flex",gap:3,alignItems:"center"}}>{Array.from({length:7}).map((_,i)=><span key={i} style={{width:6,height:6,borderRadius:"50%",display:"inline-block",background:i<Math.min(n,7)?T.gn:T.b}}/>)}<span style={{fontSize:11,color:T.td,marginLeft:3}}>{n}d</span></span>;}
function Ck(){return <svg width="12" height="12" viewBox="0 0 14 14"><polyline points="2,7 5.5,11 12,3" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function TBtn({color,ch,onClick}){const[h,sh]=useState(false);return <div onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)} style={{width:12,height:12,borderRadius:"50%",background:color,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"rgba(0,0,0,0.5)",fontWeight:700}}>{h?ch:""}</div>;}

export default function App(){
  const[data,setData]=useState(loadData);
  const[sel,setSel]=useState(getToday);
  const[tab,setTab]=useState("today");
  const[calOpen,setCal]=useState(false);
  const[calY,setCY]=useState(()=>new Date().getFullYear());
  const[calM,setCM]=useState(()=>new Date().getMonth());
  const[addH,setAH]=useState(false);
  const[addG,setAG]=useState(false);
  const[nH,setNH]=useState({name:"",category:"trading",weight:2,core:false});
  const[nG,setNG]=useState({name:"",category:"trading",target:100,due:"",notes:""});
  const[theme,setTheme]=useState(loadTheme);
  const[mini,setMini]=useState(false);
  const[skipModal,setSkipModal]=useState(null);
  const[sTag,setSTag]=useState("");
  const[sNote,setSNote]=useState("");
  const calRef=useRef();

  const T=(theme==="auto"?autoTheme():theme)==="dark"?DARK:LIGHT;
  const today=getToday();
  const ro=sel!==today;
  const past=sel<today;

  useEffect(()=>{try{localStorage.setItem(SK,JSON.stringify(data));}catch{};},[data]);
  useEffect(()=>{try{localStorage.setItem(TK,theme);}catch{};},[theme]);
  useEffect(()=>{
    if(!calOpen)return;
    const fn=e=>{if(calRef.current&&!calRef.current.contains(e.target))setCal(false);};
    document.addEventListener("mousedown",fn);
    return()=>document.removeEventListener("mousedown",fn);
  },[calOpen]);

  const isDone=id=>(data.habitLog[sel]||[]).includes(id);
  const isGrace=id=>(data.graceLog[sel]||[]).includes(id);
  const skipOf=id=>(data.skipLog[sel]||{})[id];
  const graceUsed=hid=>Object.keys(data.graceLog).filter(d=>monthOf(d)===monthOf(sel)&&(data.graceLog[d]||[]).includes(hid)).length;
  const goalProg=gid=>{
    const s=data.goalSnapshots||{};
    const ds=Object.keys(s).filter(d=>s[d]&&s[d][gid]!=null&&d<=sel).sort();
    return ds.length?s[ds[ds.length-1]][gid]:0;
  };

  const dids=data.habits.filter(h=>isDone(h.id)).map(h=>h.id);
  const coreH=data.habits.filter(h=>h.core);
  const score=wScore(data.habits,dids);
  const minHit=coreH.length>0&&coreH.every(h=>isDone(h.id));
  const perfHit=data.habits.length>0&&data.habits.every(h=>isDone(h.id));

  const toggle=id=>{
    if(ro)return;
    setData(d=>{
      const l={...d.habitLog};const day=[...(l[sel]||[])];const i=day.indexOf(id);
      if(i>=0)day.splice(i,1);else day.push(id);
      const sk={...d.skipLog};
      if(i<0&&sk[sel]){sk[sel]={...sk[sel]};delete sk[sel][id];}
      return{...d,habitLog:{...l,[sel]:day},skipLog:sk};
    });
  };
  const doGrace=id=>{
    if(ro||graceUsed(id)>=1)return;
    setData(d=>{const g={...d.graceLog};const day=[...(g[sel]||[])];if(!day.includes(id))day.push(id);return{...d,graceLog:{...g,[sel]:day}};});
  };
  const saveSkip=()=>{
    if(!skipModal)return;
    setData(d=>{const sk={...d.skipLog};sk[sel]={...(sk[sel]||{}),[skipModal.id]:{tag:sTag,note:sNote}};return{...d,skipLog:sk};});
    setSkipModal(null);setSTag("");setSNote("");
  };
  const updGoal=(gid,v)=>setData(d=>{const s={...(d.goalSnapshots||{})};s[sel]={...(s[sel]||{}),[gid]:Math.max(0,Number(v))};return{...d,goalSnapshots:s};});
  const doAddH=()=>{
    if(!nH.name.trim())return;
    setData(d=>({...d,habits:[...d.habits,{id:Date.now(),name:nH.name.trim(),category:nH.category,weight:nH.weight,core:nH.core}]}));
    setNH({name:"",category:"trading",weight:2,core:false});setAH(false);
  };
  const delH=id=>setData(d=>({...d,habits:d.habits.filter(h=>h.id!==id)}));
  const doAddG=()=>{
    if(!nG.name.trim())return;
    setData(d=>({...d,goals:[...d.goals,{id:Date.now(),name:nG.name.trim(),category:nG.category,target:Number(nG.target),due:nG.due,notes:nG.notes}]}));
    setNG({name:"",category:"trading",target:100,due:"",notes:""});setAG(false);
  };
  const delG=id=>setData(d=>({...d,goals:d.goals.filter(g=>g.id!==id)}));

  // calendar
  const chMon=dir=>{let m=calM+dir,y=calY;if(m<0){m=11;y--;}if(m>11){m=0;y++;}if(y<2020||y>2028)return;setCM(m);setCY(y);};
  const calCells=()=>{
    const f=(new Date(calY,calM,1).getDay()+6)%7;
    const n=new Date(calY,calM+1,0).getDate();
    const c=[];for(let i=0;i<f;i++)c.push(null);for(let i=1;i<=n;i++)c.push(i);return c;
  };
  const pickDay=d=>{
    if(!d)return;
    const k=dateKey(calY,calM,d);
    if(k<"2020-01-01"||k>today)return;
    setSel(k);setCal(false);
  };
  const stepDate=dir=>{
    const p=sel.split("-");
    const dt=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
    dt.setDate(dt.getDate()+dir);
    const k=dt.toISOString().split("T")[0];
    if(k<"2020-01-01"||k>today)return;
    setSel(k);setCY(dt.getFullYear());setCM(dt.getMonth());
  };
  const goToday=()=>{setSel(today);setCY(new Date().getFullYear());setCM(new Date().getMonth());setCal(false);};

  const p=sel.split("-");
  const dispDate=new Date(Number(p[0]),Number(p[1])-1,Number(p[2])).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});

  // stats data
  const L30=Array.from({length:30}).map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));return d.toISOString().split("T")[0];});
  const L7=L30.slice(-7),P7=L30.slice(-14,-7);
  const minPct=Math.round(L30.filter(d=>coreH.every(h=>(data.habitLog[d]||[]).includes(h.id))).length/30*100);
  const perfPct=Math.round(L30.filter(d=>data.habits.every(h=>(data.habitLog[d]||[]).includes(h.id))).length/30*100);
  const thisW=data.habits.length?Math.round(L7.reduce((a,d)=>a+(data.habitLog[d]||[]).length,0)/(L7.length*data.habits.length)*100):0;
  const lastW=data.habits.length?Math.round(P7.reduce((a,d)=>a+(data.habitLog[d]||[]).length,0)/(P7.length*data.habits.length)*100):0;
  const catSc=hs=>{if(!hs.length)return 0;return Math.round(L30.reduce((a,d)=>a+hs.filter(h=>(data.habitLog[d]||[]).includes(h.id)).length,0)/(hs.length*30)*100);};
  const weeks=Array.from({length:4}).map((_,i)=>{const ds=L30.slice(i*7,i*7+7);const dn=ds.reduce((a,d)=>a+(data.habitLog[d]||[]).length,0);const pp=ds.length*data.habits.length;return{pct:pp?Math.round(dn/pp*100):0};});
  const bestWk=weeks.reduce((a,b)=>a.pct>=b.pct?a:b,{pct:0});
  const topMissed=[...data.habits].map(h=>({...h,ms:L7.filter(d=>!(data.habitLog[d]||[]).includes(h.id)).length})).sort((a,b)=>b.ms-a.ms)[0];

  // styles
  const B=(ex={})=>({padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:500,background:"transparent",border:`0.5px solid ${T.b2}`,color:T.tx,cursor:"pointer",...ex});
  const INP={width:"100%",padding:"8px 10px",borderRadius:7,border:`0.5px solid ${T.b2}`,background:T.sur2,color:T.tx,fontSize:13,boxSizing:"border-box"};
  const SEL={padding:"8px 10px",borderRadius:7,border:`0.5px solid ${T.b2}`,background:T.sur2,color:T.tx,fontSize:13,width:"100%"};
  const CARD={background:T.sur,border:`0.5px solid ${T.b}`,borderRadius:10,padding:"12px 14px",marginBottom:8};
  const MC={background:T.sur2,borderRadius:8,padding:"10px 12px",flex:1,minWidth:0};
  const TAB=a=>({padding:"5px 14px",borderRadius:16,fontSize:12,fontWeight:a?600:400,background:a?T.ta:"transparent",border:a?`0.5px solid ${T.b2}`:"0.5px solid transparent",color:a?T.tx:T.tm,cursor:"pointer",whiteSpace:"nowrap"});
  const CHK=(d,g)=>({width:24,height:24,borderRadius:"50%",border:g?`2px solid ${T.am}`:d?`2px solid ${T.gn}`:`2px solid ${T.ck}`,background:g?T.am:d?T.gn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:ro?"default":"pointer",transition:"all .15s"});

  if(mini)return(
    <div onClick={()=>setMini(false)} style={{background:T.bar,borderRadius:10,border:`0.5px solid ${T.b2}`,padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
      <span style={{fontSize:13,fontWeight:600,color:T.tx}}>📋 Habit Tracker</span>
      <span style={{fontSize:12,color:T.tm}}>{score}% · {minHit?"✓":"–"} · {perfHit?"★":"–"} ▲</span>
    </div>
  );

  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:T.bg,color:T.tx,borderRadius:12,border:`0.5px solid ${T.b2}`,overflow:"hidden",display:"flex",flexDirection:"column",width:"100%"}}>

      {/* Skip modal */}
      {skipModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.sur,border:`0.5px solid ${T.b2}`,borderRadius:14,padding:20,width:300,maxWidth:"90vw"}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:12,color:T.tx}}>Why skip "{skipModal.name}"?</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {SKIP_TAGS.map(t=><button key={t} onClick={()=>setSTag(t)} style={B({background:sTag===t?T.ac:"transparent",color:sTag===t?"#fff":T.tx,border:`0.5px solid ${sTag===t?T.ac:T.b2}`,borderRadius:16,padding:"4px 12px"})}>{t}</button>)}
            </div>
            <input style={{...INP,marginBottom:10}} placeholder="Optional note…" value={sNote} onChange={e=>setSNote(e.target.value)}/>
            <div style={{display:"flex",gap:8}}>
              <button style={B({flex:1,background:T.ac,border:"none",color:"#fff"})} onClick={saveSkip}>Save</button>
              <button style={B({flex:1})} onClick={()=>{setSkipModal(null);setSTag("");setSNote("");}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Title bar */}
      <div style={{background:T.bar,borderBottom:`0.5px solid ${T.b}`,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",userSelect:"none",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:6}}><TBtn color="#e74c3c" ch="✕" onClick={()=>{}}/><TBtn color="#f1c40f" ch="–" onClick={()=>setMini(true)}/></div>
          <span style={{fontSize:12,fontWeight:600,color:T.tx}}>Habit & Goal Tracker</span>
        </div>
        <div style={{display:"flex",gap:2,background:T.sur2,border:`0.5px solid ${T.b}`,borderRadius:16,padding:2}}>
          {[["dark","🌙"],["light","☀️"],["auto","⟳"]].map(([m,ic])=>(
            <button key={m} onClick={()=>setTheme(m)} style={{width:26,height:26,borderRadius:13,fontSize:13,border:"none",background:theme===m?T.ta:"transparent",color:T.tx,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{padding:"12px 14px 16px",overflowY:"auto",maxHeight:600}}>

        {/* Date nav */}
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,position:"relative"}} ref={calRef}>
          <button style={B({padding:"4px 10px"})} onClick={()=>stepDate(-1)}>‹</button>
          <button style={B({flex:1,textAlign:"center",fontSize:12})} onClick={()=>{const sp=sel.split("-");setCal(o=>!o);setCY(Number(sp[0]));setCM(Number(sp[1])-1);}}>
            {dispDate}{sel===today?" · Today":""}
          </button>
          <button style={B({padding:"4px 10px",opacity:sel>=today?.3:1,cursor:sel>=today?"default":"pointer"})} onClick={()=>{if(sel<today)stepDate(1);}}>›</button>
          {sel!==today&&<button style={B({padding:"4px 10px",fontSize:11})} onClick={goToday}>Today</button>}

          {calOpen&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:200,background:T.sur,border:`0.5px solid ${T.b2}`,borderRadius:12,padding:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <button style={B({padding:"3px 10px"})} onClick={()=>chMon(-1)}>‹</button>
                <span style={{fontSize:13,fontWeight:600,color:T.tx}}>{MO[calM]} {calY}</span>
                <button style={B({padding:"3px 10px"})} onClick={()=>chMon(1)}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                {WD.map(w=><div key={w} style={{textAlign:"center",fontSize:10,color:T.tm}}>{w}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {calCells().map((d,i)=>{
                  if(!d)return <div key={i}/>;
                  const k=dateKey(calY,calM,d);
                  const isT=k===today,isS=k===sel,isF=k>today;
                  const hd=(data.habitLog[k]||[]).length>0;
                  return(
                    <div key={i} onClick={()=>pickDay(d)} style={{textAlign:"center",padding:"5px 2px",borderRadius:6,fontSize:12,cursor:isF?"default":"pointer",fontWeight:isT?700:400,background:isS?T.ac:isT?T.sur2:"transparent",color:isF?T.td:isS?"#fff":T.tx,opacity:isF?.35:1}}>
                      {d}{hd&&!isS&&<div style={{width:3,height:3,borderRadius:"50%",background:T.gn,margin:"1px auto 0"}}/>}
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:10,textAlign:"center"}}><button style={B({fontSize:11})} onClick={goToday}>Jump to today</button></div>
            </div>
          )}
        </div>

        {ro&&<div style={{background:T.sur2,border:`0.5px solid ${T.b}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:T.tm,marginBottom:10}}>{past?"Viewing past — read only.":"Future date."}</div>}

        {/* Summary */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Score</div><div style={{fontSize:20,fontWeight:600}}>{score}%</div></div>
          <div style={{...MC,border:minHit?`0.5px solid ${T.gn}`:undefined,background:minHit?T.gn+"22":T.sur2}}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Min day</div><div style={{fontSize:20,fontWeight:600,color:minHit?T.gn:T.tx}}>{minHit?"✓":"–"}</div></div>
          <div style={{...MC,border:perfHit?`0.5px solid ${T.am}`:undefined,background:perfHit?T.am+"22":T.sur2}}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Perfect</div><div style={{fontSize:20,fontWeight:600,color:perfHit?T.am:T.tx}}>{perfHit?"★":"–"}</div></div>
          <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Goals</div><div style={{fontSize:20,fontWeight:600}}>{data.goals.filter(g=>goalProg(g.id)<g.target).length} active</div></div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:12,overflowX:"auto",scrollbarWidth:"none"}}>
          {[["today","Today"],["habits","Habits"],["goals","Goals"],["stats","Stats"],["week","Week"]].map(([t,l])=>(
            <button key={t} style={TAB(tab===t)} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {/* ── TODAY ── */}
        {tab==="today"&&(
          <div>
            {data.habits.map(h=>{
              const d=isDone(h.id),g=isGrace(h.id),sk=skipOf(h.id);
              const st=calcStreak(h.id,data.habitLog,data.graceLog,sel);
              const canG=!d&&!g&&!ro&&graceUsed(h.id)<1;
              return(
                <div key={h.id} style={{...CARD,display:"flex",alignItems:"center",gap:10}}>
                  <div style={CHK(d,g)} onClick={()=>toggle(h.id)}><Ck/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:500,textDecoration:d?"line-through":"none",color:d?T.tm:T.tx}}>{h.name}</span>
                      {g&&<span style={{fontSize:10,color:T.am,border:`0.5px solid ${T.am}`,borderRadius:10,padding:"1px 6px"}}>grace</span>}
                      {sk&&<span style={{fontSize:10,color:T.rd,border:`0.5px solid ${T.rd}`,borderRadius:10,padding:"1px 6px"}}>{sk.tag||"skipped"}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}><Pips n={st} T={T}/><WDots w={h.weight} T={T}/>{h.core&&<span style={{fontSize:10,color:T.ac}}>core</span>}</div>
                  </div>
                  <Badge cat={h.category} T={T}/>
                  {!ro&&!d&&!g&&<button style={B({padding:"3px 8px",fontSize:11,color:T.tm})} onClick={()=>setSkipModal(h)}>skip</button>}
                  {canG&&<button style={B({padding:"3px 8px",fontSize:11,color:T.am,border:`0.5px solid ${T.am}`})} onClick={()=>doGrace(h.id)}>🛡</button>}
                </div>
              );
            })}
            {data.goals.length>0&&(
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,color:T.tm,marginBottom:8}}>Goals</div>
                {data.goals.map(g=>{
                  const pg=goalProg(g.id),pct=Math.round(pg/g.target*100);
                  return(
                    <div key={g.id} style={CARD}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:13,fontWeight:500}}>{g.name}</span><Badge cat={g.category} T={T}/></div>
                      <div style={{height:5,background:T.sur2,borderRadius:3,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?T.gn:T.ac,borderRadius:3}}/></div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.tm}}><span>{pg}/{g.target}</span><span>{pct}%{g.due?` · due ${g.due}`:""}</span></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── HABITS ── */}
        {tab==="habits"&&(
          <div>
            {data.habits.map(h=>{
              const d=isDone(h.id),g=isGrace(h.id),st=calcStreak(h.id,data.habitLog,data.graceLog,sel);
              return(
                <div key={h.id} style={{...CARD,display:"flex",alignItems:"center",gap:10}}>
                  <div style={CHK(d,g)} onClick={()=>toggle(h.id)}><Ck/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:T.tx}}>{h.name}</div>
                    <div style={{display:"flex",gap:8,marginTop:3,alignItems:"center"}}><Pips n={st} T={T}/><WDots w={h.weight} T={T}/>{h.core&&<span style={{fontSize:10,color:T.ac}}>core</span>}</div>
                  </div>
                  <Badge cat={h.category} T={T}/>
                  <button style={{background:"transparent",border:"none",color:T.tm,fontSize:14,cursor:"pointer",padding:"4px 6px"}} onClick={()=>delH(h.id)}>✕</button>
                </div>
              );
            })}
            {addH?(
              <div style={CARD}>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input style={INP} placeholder="Habit name" value={nH.name} onChange={e=>setNH(h=>({...h,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doAddH()}/>
                  <select style={SEL} value={nH.category} onChange={e=>setNH(h=>({...h,category:e.target.value}))}><option value="trading">trading</option><option value="health">health</option><option value="other">other</option></select>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:12,color:T.tm}}>Weight:</span>
                    {[1,2,3].map(w=><button key={w} style={B({padding:"3px 10px",background:nH.weight===w?T.ac:"transparent",color:nH.weight===w?"#fff":T.tx,border:`0.5px solid ${nH.weight===w?T.ac:T.b2}`})} onClick={()=>setNH(h=>({...h,weight:w}))}>{w}</button>)}
                    <label style={{fontSize:12,color:T.tm,display:"flex",alignItems:"center",gap:4,marginLeft:8,cursor:"pointer"}}><input type="checkbox" checked={nH.core} onChange={e=>setNH(h=>({...h,core:e.target.checked}))}/> Core</label>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={B({flex:1,background:T.gn,border:"none",color:"#fff"})} onClick={doAddH}>Add</button>
                    <button style={B({flex:1})} onClick={()=>setAH(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            ):<button style={B({width:"100%",padding:8})} onClick={()=>setAH(true)}>+ Add habit</button>}
          </div>
        )}

        {/* ── GOALS ── */}
        {tab==="goals"&&(
          <div>
            {data.goals.map(g=>{
              const pg=goalProg(g.id),pct=Math.round(pg/g.target*100),done=pg>=g.target;
              return(
                <div key={g.id} style={{...CARD,opacity:done?.75:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{flex:1,paddingRight:8}}>
                      <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{g.name}</div>
                      {g.notes&&<div style={{fontSize:11,color:T.tm}}>{g.notes}</div>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <Badge cat={g.category} T={T}/>
                      <button style={{background:"transparent",border:"none",color:T.tm,fontSize:14,cursor:"pointer",padding:"2px 4px"}} onClick={()=>delG(g.id)}>✕</button>
                    </div>
                  </div>
                  <div style={{height:5,background:T.sur2,borderRadius:3,overflow:"hidden",margin:"8px 0 6px"}}><div style={{height:"100%",width:`${pct}%`,background:done?T.gn:T.ac,borderRadius:3}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.tm,marginBottom:8}}>
                    <span>{pg}/{g.target}{g.due?` · due ${g.due}`:""}</span>
                    <span style={{color:done?T.gn:T.tm}}>{pct}%{done?" · done":""}</span>
                  </div>
                  {!ro&&!done&&(
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="range" min={0} max={g.target} step={1} value={pg} style={{flex:1,accentColor:T.ac}} onChange={e=>updGoal(g.id,e.target.value)}/>
                      <input type="number" min={0} max={g.target} value={pg} style={{...INP,width:56,textAlign:"center"}} onChange={e=>updGoal(g.id,e.target.value)}/>
                    </div>
                  )}
                </div>
              );
            })}
            {addG?(
              <div style={CARD}>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input style={INP} placeholder="Goal name" value={nG.name} onChange={e=>setNG(g=>({...g,name:e.target.value}))}/>
                  <input style={INP} placeholder="Notes (optional)" value={nG.notes} onChange={e=>setNG(g=>({...g,notes:e.target.value}))}/>
                  <select style={SEL} value={nG.category} onChange={e=>setNG(g=>({...g,category:e.target.value}))}><option value="trading">trading</option><option value="health">health</option><option value="other">other</option></select>
                  <input style={INP} type="number" placeholder="Target" value={nG.target} onChange={e=>setNG(g=>({...g,target:e.target.value}))}/>
                  <input style={INP} type="date" min="2020-01-01" max="2028-12-31" value={nG.due} onChange={e=>setNG(g=>({...g,due:e.target.value}))}/>
                  <div style={{display:"flex",gap:8}}>
                    <button style={B({flex:1,background:T.ac,border:"none",color:"#fff"})} onClick={doAddG}>Add goal</button>
                    <button style={B({flex:1})} onClick={()=>setAG(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            ):<button style={B({width:"100%",padding:8})} onClick={()=>setAG(true)}>+ Add goal</button>}
          </div>
        )}

        {/* ── STATS ── */}
        {tab==="stats"&&(()=>{
          try{
            const hbg=s=>s===0?T.heat[0]:s<25?T.heat[1]:s<50?T.heat[2]:s<75?T.heat[3]:T.heat[4];
            const tH=data.habits.filter(h=>h.category==="trading");
            const hH=data.habits.filter(h=>h.category==="health");
            return(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Min days (30d)</div><div style={{fontSize:18,fontWeight:600,color:T.gn}}>{minPct}%</div></div>
                  <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Perfect (30d)</div><div style={{fontSize:18,fontWeight:600,color:T.am}}>{perfPct}%</div></div>
                  <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Best week</div><div style={{fontSize:18,fontWeight:600}}>{bestWk.pct}%</div></div>
                </div>
                <div style={CARD}>
                  <div style={{fontSize:12,color:T.tm,marginBottom:10}}>30-day heatmap</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(15,1fr)",gap:3}}>
                    {L30.map(d=>{
                      const s=data.habits.length?wScore(data.habits,(data.habitLog[d]||[])):0;
                      return <div key={d} title={`${d}: ${s}%`} style={{aspectRatio:"1",borderRadius:2,background:hbg(s)}}/>;
                    })}
                  </div>
                  <div style={{display:"flex",gap:5,marginTop:8,alignItems:"center"}}>
                    <span style={{fontSize:10,color:T.td}}>0%</span>
                    {T.heat.slice(1).map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:c}}/>)}
                    <span style={{fontSize:10,color:T.td}}>100%</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Trading (30d)</div><div style={{fontSize:18,fontWeight:600}}>{catSc(tH)}%</div></div>
                  <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Health (30d)</div><div style={{fontSize:18,fontWeight:600}}>{catSc(hH)}%</div></div>
                </div>
                <div style={CARD}>
                  <div style={{fontSize:12,color:T.tm,marginBottom:10}}>Per-habit — last 30 days</div>
                  {data.habits.map(h=>{
                    const dn=L30.filter(d=>(data.habitLog[d]||[]).includes(h.id)).length;
                    const pct=Math.round(dn/30*100);
                    const sk=L30.filter(d=>!!(data.skipLog[d]||{})[h.id]).length;
                    const col=pct>=70?T.br:pct>=40?T.am:T.rd;
                    return(
                      <div key={h.id} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><span style={{fontSize:12,color:T.tx}}>{h.name}</span><WDots w={h.weight} T={T}/><Badge cat={h.category} T={T}/></div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,marginLeft:6}}>
                            {sk>0&&<span style={{fontSize:10,color:T.rd}}>{sk} skips</span>}
                            <span style={{fontSize:11,color:T.td}}>Best:{calcBest(h.id,data.habitLog,data.graceLog)}d</span>
                            <span style={{fontSize:12,fontWeight:600,color:col}}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{height:4,background:T.sur2,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:2}}/></div>
                      </div>
                    );
                  })}
                  {data.habits.length===0&&<div style={{fontSize:12,color:T.td}}>No habits yet.</div>}
                </div>
                <div style={CARD}>
                  <div style={{fontSize:12,color:T.tm,marginBottom:10}}>Skip patterns (30d)</div>
                  {(()=>{
                    const rows=SKIP_TAGS.map(tag=>({tag,count:L30.reduce((a,d)=>a+Object.values(data.skipLog[d]||{}).filter(s=>s&&s.tag===tag).length,0)})).filter(r=>r.count>0);
                    return rows.length?rows.map(r=><div key={r.tag} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{color:T.tx}}>{r.tag}</span><span style={{color:T.tm}}>{r.count}×</span></div>):<div style={{fontSize:12,color:T.td}}>No skips logged yet.</div>;
                  })()}
                </div>
                {data.goals.length>0&&(
                  <div style={CARD}>
                    <div style={{fontSize:12,color:T.tm,marginBottom:10}}>Goal velocity</div>
                    {data.goals.map(g=>{
                      try{
                        const prog=goalProg(g.id);
                        const snaps=data.goalSnapshots||{};
                        const sds=Object.keys(snaps).filter(d=>snaps[d]&&snaps[d][g.id]!=null).sort();
                        let rate=0;
                        if(sds.length>=2){const o=sds[0],n=sds[sds.length-1];const days=Math.max(1,(new Date(n)-new Date(o))/864e5);rate=Math.round(((snaps[n][g.id]-snaps[o][g.id])/days)*7*10)/10;}
                        const proj=rate>0?(()=>{const d=new Date();d.setDate(d.getDate()+Math.ceil(((g.target-prog)/rate)*7));return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});})():null;
                        return(
                          <div key={g.id} style={{marginBottom:12,paddingBottom:12,borderBottom:`0.5px solid ${T.b}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:500}}>{g.name}</span><Badge cat={g.category} T={T}/></div>
                            <div style={{display:"flex",gap:14,fontSize:12,color:T.tm,flexWrap:"wrap"}}>
                              <span>Progress: <span style={{color:T.tx}}>{prog}/{g.target}</span></span>
                              <span>Rate: <span style={{color:T.tx}}>{rate>0?`+${rate}/wk`:"no data yet"}</span></span>
                              {proj&&<span>Est: <span style={{color:T.br}}>{proj}</span></span>}
                            </div>
                          </div>
                        );
                      }catch{return null;}
                    })}
                  </div>
                )}
              </div>
            );
          }catch(e){
            return <div style={{padding:16,fontSize:13,color:T.rd}}>Stats error: {e.message}</div>;
          }
        })()}

        {/* ── WEEK ── */}
        {tab==="week"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>This week</div><div style={{fontSize:22,fontWeight:600,color:thisW>=lastW?T.gn:T.rd}}>{thisW}%</div></div>
              <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Last week</div><div style={{fontSize:22,fontWeight:600}}>{lastW}%</div></div>
              <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:2}}>Change</div><div style={{fontSize:22,fontWeight:600,color:thisW>=lastW?T.gn:T.rd}}>{thisW>=lastW?"+":""}{thisW-lastW}%</div></div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:4}}>Min days this wk</div><div style={{fontSize:18,fontWeight:600,color:T.gn}}>{L7.filter(d=>coreH.every(h=>(data.habitLog[d]||[]).includes(h.id))).length}/{L7.length}</div></div>
              <div style={MC}><div style={{fontSize:11,color:T.tm,marginBottom:4}}>Perfect this wk</div><div style={{fontSize:18,fontWeight:600,color:T.am}}>{L7.filter(d=>data.habits.every(h=>(data.habitLog[d]||[]).includes(h.id))).length}/{L7.length}</div></div>
            </div>
            <div style={CARD}>
              <div style={{fontSize:12,color:T.tm,marginBottom:10}}>Daily breakdown</div>
              {L7.map(d=>{
                const ids=(data.habitLog[d]||[]),sc=wScore(data.habits,ids);
                const isMin=coreH.every(h=>ids.includes(h.id)),isPerf=data.habits.every(h=>ids.includes(h.id));
                const dp=d.split("-");
                const lbl=new Date(Number(dp[0]),Number(dp[1])-1,Number(dp[2])).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
                return(
                  <div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:11,color:T.tm,width:80,flexShrink:0}}>{lbl}</span>
                    <div style={{flex:1,height:6,background:T.sur2,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${sc}%`,background:isPerf?T.am:isMin?T.gn:T.ac,borderRadius:3}}/></div>
                    <span style={{fontSize:11,fontWeight:600,width:32,textAlign:"right",color:isPerf?T.am:isMin?T.gn:T.tx}}>{sc}%</span>
                    {isPerf&&<span style={{fontSize:11,color:T.am}}>★</span>}
                    {isMin&&!isPerf&&<span style={{fontSize:11,color:T.gn}}>✓</span>}
                  </div>
                );
              })}
            </div>
            {topMissed&&topMissed.ms>0&&(
              <div style={{...CARD,border:`0.5px solid ${T.rd}55`}}>
                <div style={{fontSize:12,color:T.tm,marginBottom:6}}>Top missed this week</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:500,color:T.tx}}>{topMissed.name}</span>
                  <span style={{fontSize:12,color:T.rd}}>{topMissed.ms}/7 missed</span>
                </div>
              </div>
            )}
            <div style={CARD}>
              <div style={{fontSize:12,color:T.tm,marginBottom:10}}>Streak status</div>
              {data.habits.map(h=>{
                const s=calcStreak(h.id,data.habitLog,data.graceLog,today);
                return(
                  <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,fontSize:12}}>
                    <span style={{color:T.tx}}>{h.name}</span>
                    <span style={{color:s>0?T.gn:T.rd,fontWeight:500}}>{s>0?`🔥 ${s}d`:"broken"}</span>
                  </div>
                );
              })}
            </div>
            {data.goals.length>0&&(
              <div style={CARD}>
                <div style={{fontSize:12,color:T.tm,marginBottom:10}}>Goal delta this week</div>
                {data.goals.map(g=>{
                  const now=goalProg(g.id);
                  const snaps=data.goalSnapshots||{};
                  const ds=Object.keys(snaps).filter(d=>snaps[d]&&snaps[d][g.id]!=null&&d<=L7[0]).sort();
                  const was=ds.length?snaps[ds[ds.length-1]][g.id]:0;
                  const delta=now-was;
                  return(
                    <div key={g.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                      <span style={{color:T.tx}}>{g.name}</span>
                      <span style={{color:delta>0?T.gn:T.tm,fontWeight:500}}>{delta>0?`+${delta}`:delta===0?"no change":delta}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}