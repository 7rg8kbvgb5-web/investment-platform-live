type ProfileCardHeaderProps = {
  name: string;
  description: string;
  growthAssets: number | string;
  defensiveAssets: number | string;
};

export default function ProfileCardHeader({
  name,
  description,
  growthAssets,
  defensiveAssets,
}: ProfileCardHeaderProps) {
  return (
    <div style={profileHeader}>
      <div>
        <h2 style={profileTitle}>{name}</h2>
        <p style={profileDescription}>{description}</p>
      </div>

      <div style={riskSplitBox}>
        <p>Growth: {growthAssets}%</p>
        <p>Defensive: {defensiveAssets}%</p>
      </div>
    </div>
  );
}

const profileHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '25px',
  marginBottom: '25px',
};

const profileTitle = {
  fontSize: '32px',
  margin: '0 0 10px 0',
};

const profileDescription = {
  opacity: 0.8,
  maxWidth: '800px',
  lineHeight: 1.5,
};

const riskSplitBox = {
  minWidth: '220px',
  padding: '18px',
  background: '#12345b',
  borderRadius: '14px',
  border: '1px solid #2d4a6b',
};
