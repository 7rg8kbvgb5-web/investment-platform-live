import { Svg, Path, Rect, Line, Polyline, Circle, View, Text } from '@react-pdf/renderer'

// Ord Minnett palette - as used in the PARS pitch deck.
export const OM = {
  navy: '#012C55',
  red: '#ED1C2F',
  silver: '#8E9196',
  dusty: '#6E8BA8',
  paleSilver: '#B9C3D0',
  paleGrey: '#F2F4F7',
  grid: '#E3E7EC',
  ink: '#1A2733',
  slate: '#4F5D6B',
  white: '#FFFFFF',
}

export const ASSET_CLASS_COLOURS: Record<string, string> = {
  'Australian Equities': '#012C55',
  'International Equities': '#2E5B88',
  'Listed Property / Infrastructure': '#6E8BA8',
  Alternatives: '#A7BACD',
  'Australian Fixed Interest': '#8E9196',
  'Global Fixed Interest': '#C5C9CE',
  Cash: '#ED1C2F',
}

export function colourFor(assetClass: string): string {
  return ASSET_CLASS_COLOURS[assetClass] ?? OM.paleSilver
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const sweep = end - start
  if (sweep >= 359.99) end = start + 359.99
  const large = end - start > 180 ? 1 : 0
  const o1 = polar(cx, cy, rOuter, start)
  const o2 = polar(cx, cy, rOuter, end)
  const i2 = polar(cx, cy, rInner, end)
  const i1 = polar(cx, cy, rInner, start)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ')
}

/** Donut chart with a centred caption. */
export function Donut({
  segments,
  size = 130,
  caption,
  subCaption,
}: {
  segments: { label: string; value: number; colour: string }[]
  size?: number
  caption?: string
  subCaption?: string
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  const r = size / 2
  let angle = 0
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total <= 0 ? (
          <Circle cx={r} cy={r} r={r - 1} fill={OM.grid} />
        ) : (
          segments
            .filter((x) => x.value > 0)
            .map((x) => {
              const sweep = (x.value / total) * 360
              const d = arcPath(r, r, r, r * 0.62, angle, angle + sweep)
              angle += sweep
              return <Path key={x.label} d={d} fill={x.colour} stroke={OM.white} strokeWidth={1} />
            })
        )}
      </Svg>
      {caption ? (
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: OM.navy }}>{caption}</Text>
          {subCaption ? <Text style={{ fontSize: size < 130 ? 5 : 5.8, color: OM.slate, marginTop: 2, letterSpacing: 0.3 }}>{subCaption}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

export function LegendRow({ colour, label, value }: { colour: string; label: string; value?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
      <View style={{ width: 7, height: 7, backgroundColor: colour, marginRight: 5 }} />
      <Text style={{ fontSize: 7.5, color: OM.ink, flexGrow: 1 }}>{label}</Text>
      {value ? <Text style={{ fontSize: 7.5, color: OM.ink, fontFamily: 'Helvetica-Bold' }}>{value}</Text> : null}
    </View>
  )
}

/** Stacked horizontal growth / defensive bar. */
export function GrowthDefensiveBar({ growth, defensive, label }: { growth: number; defensive: number; label?: string }) {
  const total = growth + defensive || 1
  const g = (growth / total) * 100
  return (
    <View style={{ marginBottom: 8 }}>
      {label ? <Text style={{ fontSize: 7.5, color: OM.slate, marginBottom: 3, letterSpacing: 0.5 }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', height: 16 }}>
        <View style={{ width: `${g}%`, backgroundColor: OM.navy, justifyContent: 'center', paddingLeft: 5 }}>
          {g >= 8 ? <Text style={{ fontSize: 7.5, color: OM.white, fontFamily: 'Helvetica-Bold' }}>{g >= 26 ? 'Growth ' : ''}{Math.round(g)}%</Text> : null}
        </View>
        <View style={{ width: `${100 - g}%`, backgroundColor: OM.paleSilver, justifyContent: 'center', paddingLeft: 5 }}>
          {100 - g >= 8 ? <Text style={{ fontSize: 7.5, color: OM.navy, fontFamily: 'Helvetica-Bold' }}>{100 - g >= 26 ? 'Defensive ' : ''}{Math.round(100 - g)}%</Text> : null}
        </View>
      </View>
    </View>
  )
}

/** Five-step risk spectrum with the client's profile highlighted. */
export function ProfileSpectrum({ profiles, active }: { profiles: string[]; active: string }) {
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={{ flexDirection: 'row' }}>
        {profiles.map((p, i) => {
          const on = p === active
          const shade = ['#C9D3DE', '#A7BACD', '#6E8BA8', '#2E5B88', '#012C55'][i] ?? OM.dusty
          return (
            <View
              key={p}
              style={{
                flexGrow: 1,
                flexBasis: 0,
                marginRight: i < profiles.length - 1 ? 3 : 0,
                paddingVertical: 8,
                backgroundColor: on ? OM.red : shade,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: on || i >= 2 ? OM.white : OM.navy }}>{p}</Text>
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <Text style={{ fontSize: 6.5, color: OM.slate }}>Lower risk · lower expected return</Text>
        <Text style={{ fontSize: 6.5, color: OM.slate }}>Higher risk · higher expected return</Text>
      </View>
    </View>
  )
}

/** Current vs recommended weight per asset class, as paired horizontal bars. */
export function PairedBars({
  rows,
  showCurrent,
}: {
  rows: { label: string; current: number; after: number; colour: string }[]
  showCurrent: boolean
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.current, r.after)))
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ width: '30%', fontSize: 7.5, color: OM.ink }}>{r.label}</Text>
          <View style={{ width: '52%' }}>
            {showCurrent && r.current > 0 ? (
              <View style={{ height: 6, width: `${(r.current / max) * 100}%`, backgroundColor: OM.white, borderWidth: 0.7, borderColor: OM.silver, marginBottom: 1.5 }} />
            ) : null}
            <View style={{ height: 6, width: `${(r.after / max) * 100}%`, backgroundColor: r.colour }} />
          </View>
          <Text style={{ width: '18%', fontSize: 7.5, textAlign: 'right', color: OM.ink }}>
            {showCurrent ? `${round(r.current)}% to ` : ''}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{round(r.after)}%</Text>
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Diverging bar: net buy (right, navy) / sell (left, red) per asset class. */
export function NetFlowBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)))
  return (
    <View>
      {rows.map((r) => {
        const pct = (Math.abs(r.value) / max) * 100
        return (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ width: '28%', fontSize: 7.5, color: OM.ink }}>{r.label}</Text>
            <View style={{ width: '27%', flexDirection: 'row', justifyContent: 'flex-end' }}>
              {r.value < 0 ? <View style={{ height: 8, width: `${pct}%`, backgroundColor: OM.red }} /> : null}
            </View>
            <View style={{ width: 1, height: 12, backgroundColor: OM.silver }} />
            <View style={{ width: '27%' }}>
              {r.value > 0 ? <View style={{ height: 8, width: `${pct}%`, backgroundColor: OM.navy }} /> : null}
            </View>
            <Text style={{ width: '18%', fontSize: 7.5, textAlign: 'right', color: r.value < 0 ? OM.red : OM.navy, fontFamily: 'Helvetica-Bold' }}>
              {r.value < 0 ? '-' : '+'}
              {shortMoney(Math.abs(r.value))}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/** Multi-series line chart (e.g. 10-year value scenarios), with axis labels. */
export function LineChart({
  series,
  xLabels,
  width = 480,
  height = 170,
  yFormat = shortMoney,
  baseline,
}: {
  series: { label: string; values: number[]; colour: string; width?: number; dashed?: boolean }[]
  xLabels: string[]
  width?: number
  height?: number
  yFormat?: (v: number) => string
  baseline?: { value: number; label: string }
}) {
  const padL = 44
  const padB = 18
  const padT = 6
  const padR = 56
  const all = series.flatMap((s) => s.values).concat(baseline ? [baseline.value] : [])
  const rawMin = Math.min(...all)
  const rawMax = Math.max(...all)
  const { min, max, ticks } = niceScale(rawMin * 0.95, rawMax * 1.03)
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = Math.max(1, xLabels.length - 1)
  const x = (i: number) => padL + (i / n) * plotW
  const y = (v: number) => padT + plotH - ((v - min) / (max - min || 1)) * plotH

  return (
    <View style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((t) => (
          <Line key={t} x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke={OM.grid} strokeWidth={0.6} />
        ))}
        <Line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke={OM.silver} strokeWidth={0.8} />
        {baseline ? (
          <Line x1={padL} x2={padL + plotW} y1={y(baseline.value)} y2={y(baseline.value)} stroke={OM.red} strokeWidth={0.8} strokeDasharray="3 2" />
        ) : null}
        {series.map((s) => (
          <Polyline
            key={s.label}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={s.colour}
            strokeWidth={s.width ?? 1.6}
            strokeDasharray={s.dashed ? '4 2' : undefined}
          />
        ))}
      </Svg>
      {ticks.map((t) => (
        <Text key={`yl-${t}`} style={{ position: 'absolute', left: 0, width: padL - 5, top: y(t) - 4, fontSize: 6.5, color: OM.slate, textAlign: 'right' }}>
          {yFormat(t)}
        </Text>
      ))}
      {xLabels.map((l, i) =>
        l ? (
          <Text key={`xl-${i}`} style={{ position: 'absolute', left: x(i) - 15, width: 30, top: padT + plotH + 4, fontSize: 6.5, color: OM.slate, textAlign: 'center' }}>
            {l}
          </Text>
        ) : null,
      )}
      {series.map((s) => {
        const last = s.values[s.values.length - 1]
        return (
          <Text
            key={`end-${s.label}`}
            style={{ position: 'absolute', left: padL + plotW + 4, top: y(last) - 4, fontSize: 7, color: s.colour, fontFamily: 'Helvetica-Bold' }}
          >
            {yFormat(last)}
          </Text>
        )
      })}
      {baseline ? (
        <Text style={{ position: 'absolute', left: padL + 4, top: y(baseline.value) + 2, fontSize: 6.5, color: OM.red }}>{baseline.label}</Text>
      ) : null}
    </View>
  )
}

/** Vertical bar chart (e.g. annual income by year), optional range whiskers. */
export function BarChart({
  bars,
  width = 480,
  height = 150,
  yFormat = shortMoney,
}: {
  bars: { label: string; value: number; low?: number; high?: number }[]
  width?: number
  height?: number
  yFormat?: (v: number) => string
}) {
  const padL = 44
  const padB = 18
  const padT = 6
  const padR = 8
  const maxV = Math.max(1, ...bars.map((b) => b.high ?? b.value))
  const { max, ticks } = niceScale(0, maxV * 1.05)
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const slot = plotW / Math.max(1, bars.length)
  const bw = slot * 0.56
  const y = (v: number) => padT + plotH - (v / (max || 1)) * plotH
  return (
    <View style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((t) => (
          <Line key={t} x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke={OM.grid} strokeWidth={0.6} />
        ))}
        {bars.map((b, i) => {
          const cx = padL + slot * i + slot / 2
          return (
            <Rect key={`b-${i}`} x={cx - bw / 2} y={y(b.value)} width={bw} height={Math.max(0, padT + plotH - y(b.value))} fill={OM.navy} />
          )
        })}
        {bars.map((b, i) => {
          if (b.low === undefined || b.high === undefined) return null
          const cx = padL + slot * i + slot / 2
          return (
            <Line key={`w-${i}`} x1={cx} x2={cx} y1={y(b.high)} y2={y(b.low)} stroke={OM.red} strokeWidth={1.1} />
          )
        })}
        <Line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke={OM.silver} strokeWidth={0.8} />
      </Svg>
      {ticks.map((t) => (
        <Text key={`yl-${t}`} style={{ position: 'absolute', left: 0, width: padL - 5, top: y(t) - 4, fontSize: 6.5, color: OM.slate, textAlign: 'right' }}>
          {yFormat(t)}
        </Text>
      ))}
      {bars.map((b, i) => (
        <Text
          key={`xl-${i}`}
          style={{ position: 'absolute', left: padL + slot * i, width: slot, top: padT + plotH + 4, fontSize: 6.5, color: OM.slate, textAlign: 'center' }}
        >
          {b.label}
        </Text>
      ))}
    </View>
  )
}

/** Simple horizontal bars with values (e.g. income by asset class). */
export function HBars({ rows, format = shortMoney }: { rows: { label: string; value: number; colour: string }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ width: '34%', fontSize: 7.5, color: OM.ink }}>{r.label}</Text>
          <View style={{ width: '50%' }}>
            <View style={{ height: 8, width: `${(r.value / max) * 100}%`, backgroundColor: r.colour }} />
          </View>
          <Text style={{ width: '16%', fontSize: 7.5, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: OM.ink }}>{format(r.value)}</Text>
        </View>
      ))}
    </View>
  )
}

/** The "Financial Weave" motif for the cover - interlaced diagonal lines. */
export function Weave({ width, height }: { width: number; height: number }) {
  const lines: { x1: number; y1: number; x2: number; y2: number; c: string; w: number }[] = []
  for (let i = -height; i < width; i += 14) {
    lines.push({ x1: i, y1: height, x2: i + height * 0.9, y2: 0, c: '#1E4A75', w: 0.8 })
    lines.push({ x1: i + 7, y1: 0, x2: i + 7 + height * 0.9, y2: height, c: '#2E5B88', w: 0.5 })
  }
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {lines.map((l, i) => (
        <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c} strokeWidth={l.w} />
      ))}
      <Rect x={0} y={0} width={width} height={1.2} fill={OM.red} />
    </Svg>
  )
}

function niceScale(min: number, max: number) {
  const span = Math.max(1e-9, max - min)
  const rough = span / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 5) ?? 10 * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { min: lo, max: hi, ticks }
}

export function shortMoney(v: number): string {
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}m`
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(a >= 100_000 ? 0 : 1)}k`
  return `${sign}$${Math.round(a)}`
}

function round(v: number): string {
  return (Math.round(v * 10) / 10).toString()
}
