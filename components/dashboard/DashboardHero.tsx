import { LiveClock } from './LiveClock';
import { getSignedInAdviser } from '../../lib/adviser-identity';
import { SetNameInline } from './SetNameInline';

function timeOfDayGreeting(): string {
  // The server runs on UTC - the greeting follows Sydney time.
  const hour = Number(
    new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Australia/Sydney' }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardHero() {
  const adviser = await getSignedInAdviser();
  return (
    <section style={hero}>
      <div style={heroTop}>
        <p style={eyebrow}>Adviser Command Centre</p>
        <LiveClock />
      </div>
      <h1 style={title}>
        {timeOfDayGreeting()}
        {adviser.firstName ? `, ${adviser.firstName}` : ''}
      </h1>
      {!adviser.firstName && adviser.email ? <SetNameInline /> : null}
      <p style={subtitle}>
        A quick read on what&apos;s worth a look today — the live signals below come straight
        from each area of the platform. Click any card to go straight to it.
      </p>
    </section>
  );
}

const hero = {
  marginBottom: '24px',
  padding: '26px 30px',
  background: '#0b2342',
  borderRadius: '18px',
  border: '1px solid #2d4a6b',
};

const heroTop = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '4px',
};

const eyebrow = {
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  color: '#8fb7e8',
  fontSize: '13px',
  margin: 0,
};

const title = {
  fontSize: '32px',
  margin: '10px 0 10px 0',
};

const subtitle = {
  fontSize: '16px',
  maxWidth: '820px',
  opacity: 0.85,
  lineHeight: 1.5,
  margin: 0,
};
