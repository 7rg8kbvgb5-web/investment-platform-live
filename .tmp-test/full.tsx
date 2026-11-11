import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { writeFileSync } from 'fs'
import { ClientProposalDocument } from '../lib/pdf/ClientProposalDocument'
const T = 1500000
const rh = (code: string, name: string, assetClass: string, weight: number, y: number | null, f: number | null, holdingType: string, inModel = true) =>
  ({ code, name, assetClass, weight, value: Math.round(weight / 100 * T), yield: y, frankingPct: f, inModel, holdingType })
const resultingHoldings = [
  rh('ANZ','ANZ Group Holdings','Australian Equities',4.5,5.6,70,'direct_equity'),
  rh('BHP','BHP Group','Australian Equities',5,4.2,100,'direct_equity'),
  rh('CAR','CAR Group','Australian Equities',3,2.0,100,'direct_equity'),
  rh('CBA','Commonwealth Bank','Australian Equities',5,3.1,100,'direct_equity'),
  rh('CSL','CSL Limited','Australian Equities',4,1.8,0,'direct_equity'),
  rh('WES','Wesfarmers','Australian Equities',4,3.0,100,'direct_equity'),
  rh('VGS','Vanguard MSCI Index International Shares ETF','International Equities',12,1.9,0,'listed_fund'),
  rh('IVV','iShares S&P 500 ETF','International Equities',8,1.2,0,'listed_fund'),
  rh('TCL','Transurban Group','Listed Property / Infrastructure',4,4.6,0,'direct_equity'),
  rh('GMG','Goodman Group','Listed Property / Infrastructure',4,1.0,0,'direct_equity'),
  rh('CHN0548AU','KKR Private Equity (K-PRIME) Fund','Alternatives',6,null,null,'unlisted_fund'),
  rh('MAQ0001AU','Metrics Direct Income Fund','Alternatives',6,8.5,0,'unlisted_fund'),
  rh('AU3CB0326452','AGL 5.77% Sep-35','Australian Fixed Interest',10,5.8,0,'direct_bond'),
  rh('PGF','PIMCO Global Bond Fund','Global Fixed Interest',10,4.5,0,'listed_fund'),
  rh('CASH','Cash','Cash',8.5,4.0,0,'cash'),
  rh('TLS','Telstra Group','Australian Equities',6,4.0,100,'direct_equity', false),
]
const cls = (assetClass: string, type: 'Growth'|'Defensive', clientWeight: number, modelWeight: number) => ({ assetClass, type, clientWeight, modelWeight, difference: clientWeight - modelWeight, status: Math.abs(clientWeight-modelWeight) < 2.5 ? 'in-line' : clientWeight > modelWeight ? 'overweight' : 'underweight' })
const advice: any = {
  reviewId: 'r1', clientName: 'Smith Family Trust', asAtDate: '2026-10-31', riskProfile: 'Balanced', riskProfileSource: 'agreed',
  model: { riskProfile: 'Balanced', objective: 'x', growthWeight: 66, defensiveWeight: 34, assetClasses: [] },
  hasBespokeWeights: false, isNewMoney: false, existingValue: T, newCash: 0, totalAfter: T, approach: 'rebalance',
  assetClasses: [cls('Australian Equities','Growth',52,25.5), cls('International Equities','Growth',6,20), cls('Listed Property / Infrastructure','Growth',3,8), cls('Alternatives','Growth',0,12), cls('Australian Fixed Interest','Defensive',5,10), cls('Global Fixed Interest','Defensive',0,10), cls('Cash','Defensive',34,8.5)],
  maxDriftPp: 26.5, driftStatus: 'outside-tolerance',
  trades: [
    { code:'CAR', name:'CAR Group', assetClass:'Australian Equities', action:'buy', value:45000, units:1300, currentValue:0, currentWeight:0, targetWeight:3, rationale:'Not currently held.' },
    { code:'VGS', name:'Vanguard MSCI Index International Shares ETF', assetClass:'International Equities', action:'increase', value:90000, units:600, currentValue:90000, currentWeight:6, targetWeight:12, rationale:'Below target.' },
    { code:'IVV', name:'iShares S&P 500 ETF', assetClass:'International Equities', action:'buy', value:120000, units:1800, currentValue:0, currentWeight:0, targetWeight:8, rationale:'New.' },
    { code:'CHN0548AU', name:'KKR Private Equity (K-PRIME) Fund', assetClass:'Alternatives', action:'buy', value:90000, units:null, currentValue:0, currentWeight:0, targetWeight:6, rationale:'New.' },
    { code:'MAQ0001AU', name:'Metrics Direct Income Fund', assetClass:'Alternatives', action:'buy', value:90000, units:null, currentValue:0, currentWeight:0, targetWeight:6, rationale:'New.' },
    { code:'PGF', name:'PIMCO Global Bond Fund', assetClass:'Global Fixed Interest', action:'buy', value:150000, units:9000, currentValue:0, currentWeight:0, targetWeight:10, rationale:'New.' },
    { code:'NAB', name:'National Australia Bank', assetClass:'Australian Equities', action:'sell', value:-180000, units:-4500, currentValue:180000, currentWeight:12, targetWeight:0, rationale:'Outside the model.' },
    { code:'CBA', name:'Commonwealth Bank', assetClass:'Australian Equities', action:'reduce', value:-150000, units:-900, currentValue:225000, currentWeight:15, targetWeight:5, rationale:'Above weight.' },
    { code:'XYZ0001AU', name:'Legacy Managed Fund', assetClass:'Australian Equities', action:'sell', value:-60000, units:null, currentValue:60000, currentWeight:4, targetWeight:0, rationale:'Outside the model.', treatment:'staged_exit' },
  ],
  cashDeployment: null, holdingsOutsideModel: 3, unmappedHoldings: [], currentIncome: 48000, currentYieldPct: 3.2, currentFrankingCredits: 14000,
  currentIncomeCoveragePct: 100, incomeLookupNeeded: [], unclassifiedWeightPct: 0,
  retainedHoldings: [{ code:'TLS', name:'Telstra Group', assetClass:'Australian Equities', currentValue:90000, currentWeight:6, reason:'Client wishes to retain; long-held, low cost base.' }],
  resultingHoldings, projectedIncome: 56000, projectedYieldPct: 3.9, yieldCoveragePct: 94,
  frankingBenefitByClass: { current: { 'Australian Equities': 1.35 }, projected: { 'Australian Equities': 1.12 } },
  projectedFrankingCredits: 9500, projectedGrossedUpYieldPct: 4.6, relevantDecisions: [], reviewModelVersion: 7, currentModelVersion: 7, warnings: [],
}
const commentary = {
  'CAR:buy': 'A high-quality online marketplace business with strong pricing power and global growth options; adds a quality-growth tilt to the Australian share allocation.',
  'IVV:buy': 'Gives low-cost exposure to the 500 largest US companies, addressing the portfolio’s current underweight to global growth.',
  'NAB:sell': 'Reduces a heavy concentration in Australian banks; we prefer to hold banking exposure through CBA and ANZ alongside broader diversification.',
  'VGS:exposure': 'Tracks around 1,300 companies across developed markets outside Australia.',
  'MAQ0001AU:buy': 'A diversified portfolio of senior secured loans to Australian companies, providing monthly income with a floating-rate return.',
  'BHP:exposure': 'Core exposure to global resources demand, with a strong, fully franked dividend record.',
}
;(async () => {
  const buf = await renderToBuffer(<ClientProposalDocument advice={advice} adviserNotes={'Following our meeting, this proposal repositions the portfolio from a concentrated, cash-heavy position into a diversified Balanced allocation, while retaining your Telstra holding as discussed.'} objectives={{ primaryGoal: 'balanced', incomeNeed: 50000, timeframeYears: 10, constraints: 'Retain Telstra shares. No tobacco.' }} preparedOn="12 November 2026" commentary={commentary} />)
  writeFileSync('/tmp/t/full.pdf', buf)
  console.log('ok', buf.length)
})()
