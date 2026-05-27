export default function DashboardHero() {
  return (
    <section style={hero}>
      <p style={eyebrow}>Investment Platform</p>
      <h1 style={title}>Portfolio Construction Engine</h1>
      <p style={subtitle}>
        Strategic asset allocation by risk profile, with live Supabase data,
        growth/defensive validation and portfolio guardrail foundations.
      </p>
    </section>
  );
}

const hero = {
  marginBottom: '40px',
  padding: '30px',
  background: '#0b2342',
  borderRadius: '18px',
  border: '1px solid #2d4a6b',
};

const eyebrow = {
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  color: '#8fb7e8',
  fontSize: '13px',
  marginBottom: '10px',
};

const title = {
  fontSize: '48px',
  margin: '0 0 15px 0',
};

const subtitle = {
  fontSize: '18px',
  maxWidth: '900px',
  opacity: 0.85,
  lineHeight: 1.5,
};
