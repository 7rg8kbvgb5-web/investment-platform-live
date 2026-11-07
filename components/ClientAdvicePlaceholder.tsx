import Panel from './ui/Panel'
import StatusBox from './dashboard/StatusBox'

// Client Advice previously ran on a fully mock engine (hardcoded sample
// holdings) and could export that as a PDF proposal. Withdrawn until it is
// rebuilt on the real Construction output, so sample data can never reach
// a client.
export default function ClientAdvicePlaceholder() {
  return (
    <Panel eyebrow="Client Advice" title="Being rebuilt">
      <StatusBox variant="neutral">
        Client Advice is being rebuilt to draw directly on the Construction tab — the client&apos;s
        actual holdings, the recommended trades or new-cash buy list, Investment Committee decisions,
        and projected income — and produce the branded proposal from that. The previous version ran on
        sample data and has been withdrawn so it can&apos;t be sent to a client by mistake.
      </StatusBox>
    </Panel>
  )
}
