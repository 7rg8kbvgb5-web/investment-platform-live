import { runInvestmentDeepDive, type SubjectType } from '../../../../lib/engines/investment-deep-dive'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const subjectName = typeof body?.subjectName === 'string' ? body.subjectName : ''
    const subjectTypeHint: SubjectType | null =
      body?.subjectTypeHint === 'ipo_listed' || body?.subjectTypeHint === 'unlisted_fund'
        ? body.subjectTypeHint
        : null

    if (!subjectName.trim()) {
      return Response.json({ ok: false, error: 'No investment name supplied.' }, { status: 400 })
    }

    const review = await runInvestmentDeepDive(subjectName, subjectTypeHint)
    return Response.json({ ok: true, review })
  } catch (error) {
    console.error('Investment deep dive failed:', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
