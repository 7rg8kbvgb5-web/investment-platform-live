'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const riskProfiles = [
  { name:'Conservative', growth:35, defensive:65, aus:20, intl:5, property:5, alts:5, fixed:35, floating:15, cash:15 },
  { name:'Moderately Conservative', growth:45, defensive:55, aus:30, intl:5, property:5, alts:5, fixed:30, floating:15, cash:10 },
  { name:'Balanced', growth:60, defensive:40, aus:40, intl:10, property:5, alts:5, fixed:20, floating:10, cash:10 },
  { name:'Growth', growth:80, defensive:20, aus:50, intl:20, property:5, alts:5, fixed:10, floating:5, cash:5 },
  { name:'High Growth', growth:95, defensive:5, aus:55, intl:30, property:5, alts:5, fixed:3, floating:1, cash:1 },
];

const sectors = [
  { sector:'Major Banks', benchmark:21, portfolio:24, position:'Moderate Overweight' },
  { sector:'Diversified Financials', benchmark:7, portfolio:6, position:'Neutral' },
  { sector:'Base Materials / Resources', benchmark:18, portfolio:20, position:'Moderate Overweight' },
  { sector:'Industrial / Production Materials', benchmark:6, portfolio:5, position:'Neutral' },
  { sector:'Healthcare', benchmark:10, portfolio:8, position:'Moderate Underweight' },
  { sector:'Energy', benchmark:5, portfolio:5, position:'Neutral' },
];

const houseView = [
  ['Australian Equities','Moderate Overweight'],['Major Banks','Strong Overweight'],['Gold','Moderate Overweight'],['Duration','Moderate Underweight'],['Cash','Neutral']
];

const allocation = [
  { name:'Australian Equities', value:40 },{ name:'International Equities', value:10 },{ name:'Property', value:5 },{ name:'Alternatives', value:5 },{ name:'Fixed Interest', value:20 },{ name:'Floating Rate', value:10 },{ name:'Cash', value:10 },
];
const colours = ['#6ea8fe','#55d187','#f2b84b','#b58cff','#8fb3ff','#76d7c4','#98a2b3'];

export default function Home(){
  return <div className="shell">
    <aside className="sidebar"><div className="brand">Investment Strategy Hub</div><nav className="nav">
      {['Dashboard','Risk Profiles','Model Portfolios','Australian Equities','Fixed Income','Alternatives','House View','Governance','Reports'].map((x,i)=><a className={i===0?'active':''} href="#" key={x}>{x}</a>)}
    </nav></aside>
    <main className="main">
      <div className="topbar"><div><h1>Investment Committee Dashboard</h1><p className="muted">Internal adviser and IC operating platform — Version 1 prototype</p></div><div><button className="btn secondary">🎙 Voice Command</button> <button className="btn">Reset to Strategic</button></div></div>
      <div className="grid cols3 section">
        <div className="card"><h3>House View Status</h3>{houseView.map(([a,b])=><p key={a}><b>{a}</b><br/><span className="pill green">{b}</span></p>)}</div>
        <div className="card"><h3>Balanced Allocation</h3><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={allocation} dataKey="value" innerRadius={55} outerRadius={90}>{allocation.map((_,i)=><Cell key={i} fill={colours[i%colours.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
        <div className="card"><h3>Guardrail Warnings</h3><p><span className="pill amber">Warning</span> Balanced portfolio nearing max banks overweight.</p><p><span className="pill amber">Review</span> Gold overlay expires in 14 days.</p><p><span className="pill green">OK</span> Growth/defensive ranges within tolerance.</p></div>
      </div>
      <div className="grid cols2 section"><div className="card"><h3>Risk Profile Models</h3><table><thead><tr><th>Profile</th><th>Growth</th><th>Defensive</th><th>Aus Eq</th><th>Intl Eq</th></tr></thead><tbody>{riskProfiles.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.growth}%</td><td>{r.defensive}%</td><td>{r.aus}%</td><td>{r.intl}%</td></tr>)}</tbody></table></div>
      <div className="card"><h3>Australian Equity Sector Positioning</h3><ResponsiveContainer width="100%" height={280}><BarChart data={sectors}><XAxis dataKey="sector" hide/><YAxis/><Tooltip/><Bar dataKey="benchmark" fill="#27324f"/><Bar dataKey="portfolio" fill="#6ea8fe"/></BarChart></ResponsiveContainer></div></div>
      <div className="card section"><h3>Governance / Approval Workflow</h3><table><thead><tr><th>Item</th><th>Trigger</th><th>Status</th><th>Action</th></tr></thead><tbody><tr><td>Gold tactical overlay</td><td>Geopolitical risk</td><td><span className="pill amber">Pending Review</span></td><td>Approve / Edit / Skip</td></tr><tr><td>Preferred bank idea</td><td>Manual IC input</td><td><span className="pill green">Approved</span></td><td>Logged</td></tr><tr><td>Healthcare underweight</td><td>Sector view</td><td><span className="pill amber">Review due</span></td><td>Generate note</td></tr></tbody></table></div>
      <div className="grid cols2"><div className="card"><h3>Anonymised Meeting Notes</h3><textarea placeholder="Paste anonymised meeting notes here..."></textarea><button className="btn">Extract Actions</button></div><div className="card"><h3>Research Upload / House View Capture</h3><input className="input" type="file"/><button className="btn">Analyse Research</button><p className="muted">Prototype only: live AI extraction will be connected later.</p></div></div>
    </main>
  </div>
}
