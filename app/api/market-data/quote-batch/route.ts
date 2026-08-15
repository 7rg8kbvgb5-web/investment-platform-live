import { getQuotesForCodes } from '../../../../lib/engines/market-data';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { codes?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const codes = Array.isArray(body.codes)
    ? body.codes.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : null;

  if (!codes || codes.length === 0) {
    return Response.json({ ok: false, error: 'codes must be a non-empty string array.' }, { status: 400 });
  }

  // A client portfolio can list far more codes than the model universe -
  // keep this bounded so one upload can't trigger an unbounded fan-out of
  // upstream requests.
  const boundedCodes = codes.slice(0, 200);

  const quotes = await getQuotesForCodes(boundedCodes);

  return Response.json({ ok: true, quotes });
}
