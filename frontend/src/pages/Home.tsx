import { ArrowRight, Bell, BrainCircuit, Box, Check, ChevronRight, Cloud, Eye, GitBranch, Globe2, Layers3, MapPin, Route, Shield, Truck, UserRound, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/ThemeProvider";
import "./home.css";

const technologies = [
  [BrainCircuit, "AI/ML demand forecasting", "Learns historical consumption patterns to forecast future demand and identify potential shortages.", "Fixes: late anticipation"],
  [Globe2, "GIS-enabled planning", "Visualizes locations, routes, transport conditions and disruptions in one planning map.", "Fixes: fragmented planning visibility"],
  [Zap, "Real-time inventory & telemetry", "Tracks inventory, consumption and days of supply to identify low-stock and stock-out risks.", "Fixes: stale inventory visibility"],
  [Layers3, "Integrated decision support", "Connects forecasting, inventory, requests, transport, optimization and scenarios in one platform.", "Fixes: scattered information streams"],
] as const;

const platform = [
  [BrainCircuit, "Demand forecast", "Expected consumption by item and location over the coming planning horizon."],
  [Box, "Inventory health", "Green, amber and red status with days of supply for every category."],
  [Bell, "Risk alerts", "Critical shortage and stock-out warnings that need planner review."],
  [Truck, "Transport planning", "Vehicles, capacity and availability matched to what must move."],
  [Route, "Route comparison", "Route options evaluated against distance, time and constraints."],
  [GitBranch, "Scenario simulation", "What-if runs for disruptions, with resulting plans compared side by side."],
] as const;

function Logo() {
  return <div className="lf-logo">
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="13" fill="#0a2a33"/><path d="M13 31l11-14 11 14" stroke="#5eead4" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="24" cy="17" r="3.4" fill="#fff"/><circle cx="13" cy="31" r="2.6" fill="#14899a"/><circle cx="35" cy="31" r="2.6" fill="#14899a"/></svg>
    <div><b>logiforge<i>AI</i></b><small>Predictive logistics</small></div>
  </div>;
}

function NetworkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    let raf = 0; let w = 0; let h = 0;
    type Hub = { x:number; y:number; r:number; big:boolean; p:number };
    type Ship = { a:number; b:number; t:number; s:number };
    let hubs: Hub[] = []; let edges: [number,number][] = []; let ships: Ship[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const makeShip = (): Ship | null => { if (!edges.length) return null; const e=edges[Math.floor(Math.random()*edges.length)]; const f=Math.random()<.5; return {a:f?e[0]:e[1],b:f?e[1]:e[0],t:Math.random(),s:.002+Math.random()*.003}; };
    const resize=()=>{ const r=canvas.parentElement?.getBoundingClientRect(); if(!r)return; const d=Math.min(devicePixelRatio||1,2); w=r.width;h=r.height;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0); const n=Math.max(12,Math.round(w*h/30000)); hubs=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,r:1.5+Math.random()*2,big:Math.random()<.2,p:Math.random()*6.28})); edges=[]; hubs.forEach((a,i)=>hubs.map((b,j)=>({j,d:Math.hypot(a.x-b.x,a.y-b.y)})).filter(o=>o.j!==i).sort((a,b)=>a.d-b.d).slice(0,2).forEach(o=>{if(!edges.some(e=>(e[0]===i&&e[1]===o.j)||(e[0]===o.j&&e[1]===i)))edges.push([i,o.j]);})); ships=[];for(let i=0;i<Math.min(edges.length,20);i++){const s=makeShip();if(s)ships.push(s);}};
    const point=(a:number,b:number,t:number)=>{const A=hubs[a],B=hubs[b];if(!A||!B)return{x:0,y:0};const dx=Math.abs(B.x-A.x),dy=Math.abs(B.y-A.y),L=dx+dy||1,d=t*L;return d<dx?{x:A.x+(B.x-A.x)*(d/(dx||1)),y:A.y}:{x:B.x,y:A.y+(B.y-A.y)*((d-dx)/(dy||1))};};
    const draw=()=>{ctx.clearRect(0,0,w,h);ctx.strokeStyle="rgba(94,234,212,.14)";ctx.lineWidth=1.1;edges.forEach(([a,b])=>{const A=hubs[a],B=hubs[b];ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();});hubs.forEach(x=>{if(!reduced)x.p+=.018;ctx.beginPath();ctx.arc(x.x,x.y,x.r,0,6.28);ctx.fillStyle=x.big?"#5eead4":"rgba(190,235,240,.42)";ctx.fill();if(x.big){ctx.beginPath();ctx.arc(x.x,x.y,x.r*2.4+Math.sin(x.p)*2,0,6.28);ctx.strokeStyle="rgba(94,234,212,.23)";ctx.stroke();}});ships.forEach((s,i)=>{if(!reduced)s.t+=s.s;if(s.t>=1){const n=makeShip();if(n)ships[i]=n;return;}const p=point(s.a,s.b,Math.min(s.t,1));const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,9);g.addColorStop(0,"rgba(94,234,212,.9)");g.addColorStop(1,"rgba(94,234,212,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,9,0,6.28);ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(p.x-1.5,p.y-1.5,3,3);});if(!reduced)raf=requestAnimationFrame(draw);};
    resize();draw();const onResize=()=>{resize();if(reduced)draw();};window.addEventListener("resize",onResize);return()=>{window.removeEventListener("resize",onResize);cancelAnimationFrame(raf);};
  },[]);
  return <canvas ref={ref} className="lf-hero-canvas" aria-hidden="true"/>;
}

export default function Home(){
  const nav=useNavigate(); const {theme,toggleTheme}=useTheme();
  const scroll=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  return <div className="lf-home">
    <header className="lf-home-nav"><div className="lf-home-wrap lf-nav-inner">
      <button className="lf-home-logo-button" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><Logo/></button>
      <nav className="lf-home-links"><button onClick={()=>scroll("problem")}>Problem</button><button onClick={()=>scroll("technology")}>Technology</button><button onClick={()=>scroll("how")}>How it works</button><button onClick={()=>scroll("platform")}>Platform</button><button onClick={()=>scroll("trust")}>Trust</button></nav>
      <div className="lf-home-nav-actions"><button className="lf-theme-button" onClick={toggleTheme} aria-label="Toggle theme">{theme==="dark"?"☀":"☾"}</button><button className="lf-outline-button" onClick={()=>nav("/login")}>Sign in</button></div>
    </div></header>

    <main>
      <section className="lf-home-hero"><NetworkCanvas/><div className="lf-home-wrap lf-hero-grid">
        <div className="lf-hero-copy"><span className="lf-tag"><i/>AI-POWERED LOGISTICS DECISION SUPPORT</span><h1>Turn logistics data into <em>better decisions.</em></h1><p className="lf-hero-lead">LOGIFORGE AI brings predictive demand, inventory risk, transport planning, optimization and scenario simulation into one focused decision-support system.</p>
          <div className="lf-hero-actions"><button className="lf-primary-button" onClick={()=>nav("/login")}><span className="lf-btn-label">Enter Command Center</span><span className="lf-btn-arrow"><ArrowRight size={16}/></span></button><button className="lf-text-button" onClick={()=>scroll("technology")}>Explore system <ChevronRight size={16}/></button></div>
          <div className="lf-trust-row"><span><Check size={13}/> Explainable AI</span><span><Check size={13}/> Human-in-the-loop</span><span><Check size={13}/> Role-based access</span></div>
        </div>
        <div className="lf-command-window"><div className="lf-window-head"><div className="lf-window-dots"><i/><i/><i/></div><span>COMMAND CENTER · LIVE VIEW</span><b><u className="lf-live-dot"/>ONLINE</b></div><div className="lf-window-body">
          <div className="lf-mini-kpis"><div><small>LOCATIONS</small><b>24</b><span>+4.2%</span></div><div><small>RISK ALERTS</small><b>07</b><span className="warn">2 critical</span></div><div><small>ACTIVE ASSETS</small><b>31</b><span>+6.4%</span></div></div>
          <div className="lf-network"><div className="lf-network-label">LOGISTICS NETWORK <span>DECISION VIEW</span></div><svg viewBox="0 0 600 300"><path d="M65 92 C160 45 235 142 315 120 S445 60 535 98" className="cyan"/><path d="M65 92 C160 160 205 245 325 220 S460 185 535 215" className="teal"/><path d="M315 120 C330 165 320 190 325 220" className="dashed"/></svg>
            {[['A01','n1'],['D01','n2'],['A07','n3'],['A12','n4'],['D03','n5']].map(([x,c])=><div key={x} className={`lf-map-node ${c}`}><i/><span>{x}</span></div>)}
            <div className="lf-map-legend"><span><i className="cyan-dot"/> Depot</span><span><i className="teal-dot"/> Location</span><span><i className="amber-dot"/> Risk</span></div>
          </div>
          <div className="lf-window-bottom"><div><small>FORECAST</small><b>+12.8%</b></div><div><small>STOCK-OUT RISK</small><b className="red">05</b></div><div><small>PLAN STATUS</small><b className="green">READY</b></div></div>
        </div></div>
      </div></section>

      <section id="problem" className="lf-section"><div className="lf-home-wrap"><div className="lf-section-heading"><span>The problem</span><h2>Logistics support is hard to guarantee.</h2><p>Planning becomes difficult when demand, inventory, transport and disruption information is spread across separate streams.</p></div><div className="lf-problem-grid">
        <div className="lf-card"><h3>Information lives in separate streams</h3><p>Planners need a common decision view to anticipate what each location may need next.</p><div className="lf-stream-grid">{[[BrainCircuit,'Demand forecasting'],[Box,'Inventory levels'],[Truck,'Transport capacity'],[Cloud,'Terrain & weather'],[Zap,'Consumption patterns'],[MapPin,'Dispersed locations']].map(([I,t])=>{const Icon=I as typeof BrainCircuit;return <div className="lf-stream" key={t as string}><Icon size={17}/>{t as string}</div>})}</div><div className="lf-callout">The result: requirements can be anticipated late and planning becomes harder to coordinate.</div></div>
        <div className="lf-card"><h3>Mission context</h3><div className="lf-meta"><div><span>Title</span><b>Predictive Logistics &amp; Forward Supply Chain</b></div><div><span>Service</span><b>Indian Army</b></div><div><span>Organization</span><b>Ministry of Defence (MoD)</b></div><div><span>Goal</span><b>Assured, timely support to forward formations</b></div><div><span>Approach</span><b>AI/ML, GIS, integrated decision support</b></div></div></div>
      </div></div></section>

      <section id="technology" className="lf-section lf-alt-section"><div className="lf-home-wrap"><div className="lf-section-heading"><span>Technology opportunity</span><h2>Four technologies, one predictive logistics system.</h2><p>Each capability addresses a gap in the problem statement, and they work best together.</p></div><div className="lf-tech-grid">{technologies.map(([Icon,title,text,fix])=><article className="lf-tech-card" key={title}><div className="lf-tech-icon"><Icon size={21}/></div><h3>{title}</h3><p>{text}</p><small>{fix}</small></article>)}</div></div></section>

      <section id="how" className="lf-section"><div className="lf-home-wrap"><div className="lf-section-heading"><span>How it works</span><h2>From scattered data to a plan a planner can review.</h2></div><div className="lf-steps">{[['1','Observe','Collect inventory, transport and location data into one common picture.'],['2','Predict','Forecast demand and flag shortage or stock-out risk ahead of time.'],['3','Optimize','Evaluate supplies, routes and transport capacity against constraints.'],['4','Simulate','Test disruptions and compare the resulting planning scenarios.']].map(([n,t,p])=><div className="lf-step" key={t}><div className="lf-step-number">{n}</div><h3>{t}</h3><p>{p}</p></div>)}</div></div></section>

      <section id="platform" className="lf-section lf-alt-section"><div className="lf-home-wrap"><div className="lf-section-heading"><span>Platform</span><h2>What planners get inside the command center.</h2></div><div className="lf-platform-grid">{platform.map(([Icon,title,text])=><article className="lf-tech-card lf-platform-card" key={title}><div className="lf-tech-icon"><Icon size={21}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

      <section id="trust" className="lf-section"><div className="lf-home-wrap"><div className="lf-section-heading"><span>Built to be trusted</span><h2>Recommendations, not orders.</h2><p>LOGIFORGE AI supports the planner. It does not replace the decision.</p></div><div className="lf-trust-grid"><div className="lf-card"><h3>Human in the loop</h3><ul className="lf-trust-list"><li><UserRound size={18}/>Final logistics decisions stay with authorized users.</li><li><Eye size={18}/>Forecasts and recommendations are presented for review.</li><li><Shield size={18}/>Role-based access protects the decision-support workflow.</li></ul></div><div className="lf-card"><h3>Decision-support, by design</h3><p>LOGIFORGE AI is built to inform planning. The map is a decision-support visualization and is not intended for operational navigation.</p><div className="lf-callout">Every recommendation is explainable and open to planner review.</div></div></div></div></section>

      <section className="lf-final-section"><div className="lf-home-wrap"><div className="lf-final-band"><div><h2>Ready to see the command center?</h2><p>Sign in to explore forecasts, alerts, optimization and scenarios.</p></div><button className="lf-primary-button" onClick={()=>nav("/login")}><span className="lf-btn-label">Sign in</span><span className="lf-btn-arrow"><ArrowRight size={16}/></span></button></div></div></section>
    </main>

    <footer className="lf-footer"><div className="lf-home-wrap"><div className="lf-footer-grid"><div><Logo/><p>Predictive logistics decision support for a connected planning workflow.</p></div><div><h4>Explore</h4><button onClick={()=>scroll('problem')}>Problem</button><button onClick={()=>scroll('technology')}>Technology</button><button onClick={()=>scroll('how')}>How it works</button><button onClick={()=>scroll('platform')}>Platform</button></div><div><h4>Account</h4><button onClick={()=>nav('/login')}>Sign in</button><button onClick={()=>nav('/login')}>Command center</button></div><div><h4>Project</h4><span>Indian Army</span><span>Ministry of Defence (MoD)</span><span>Predictive Logistics &amp; Forward Supply Chain</span></div></div><div className="lf-footer-bottom"><span>© 2026 LOGIFORGE AI. All rights reserved.</span><span>AI-assisted · Human-reviewed decisions</span></div></div></footer>
  </div>;
}