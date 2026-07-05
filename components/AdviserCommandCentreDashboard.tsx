const dashboardCards = [
  {
    label: "Client Workflow",
    value: "4 Active Reviews",
    description: "Portfolio analysis and proposal preparation in progress.",
  },
  {
    label: "Portfolio Health",
    value: "91% Average",
    description: "Overall alignment across model portfolios and client cases.",
  },
  {
    label: "Investment Committee",
    value: "2 Pending",
    description: "Items awaiting review, approval or governance sign-off.",
  },
  {
    label: "Proposal Pipeline",
    value: "5 Drafts",
    description: "Client proposals currently in preparation or awaiting adviser review.",
  },
];

export default function AdviserCommandCentreDashboard() {
  return (
    <section className="command-centre-dashboard">
      {dashboardCards.map((card) => (
        <article key={card.label} className="command-centre-card">
          <p>{card.label}</p>
          <h3>{card.value}</h3>
          <span>{card.description}</span>
        </article>
      ))}
    </section>
  );
}