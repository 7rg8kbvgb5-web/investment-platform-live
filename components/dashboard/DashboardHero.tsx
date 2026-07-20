export default function DashboardHero() {
  return (
    <section style={hero}>
      <p style={eyebrow}>Adviser Command Centre</p>
      <h1 style={title}>Good morning, Sean</h1>
      <p style={subtitle}>
        Here&apos;s what&apos;s worth your attention today — outstanding Investment
        Committee reviews, macro developments, and where each client review is
        up to.
      </p>
    </section>
  );
}

const hero = {
  marginBottom: '30px',
  padding: '26px 30px',
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
  fontSize: '32px',
  margin: '0 0 10px 0',
};

const subtitle = {
  fontSize: '16px',
  maxWidth: '820px',
  opacity: 0.85,
  lineHeight: 1.5,
  margin: 0,
};
