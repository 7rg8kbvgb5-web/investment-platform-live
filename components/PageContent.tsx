type PageContentProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function PageContent({
  title,
  description,
  children,
}: PageContentProps) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1 style={pageTitle}>{title}</h1>
          {description ? <p style={pageDescription}>{description}</p> : null}
        </div>
      </header>
      <section style={section}>{children}</section>
    </>
  );
}

const pageTitle = {
  margin: 0,
  fontSize: '32px',
  fontWeight: 700,
};

const pageDescription = {
  margin: '8px 0 0',
  color: '#98a2b3',
  fontSize: '16px',
  maxWidth: '900px',
  lineHeight: 1.5,
};

const section = {
  marginBottom: '35px',
  padding: '30px',
  background: '#0b2342',
  borderRadius: '18px',
  border: '1px solid #2d4a6b',
};
