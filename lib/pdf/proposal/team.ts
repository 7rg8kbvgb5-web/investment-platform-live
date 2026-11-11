// The advice team shown in the proposal. Phone and email appear only once
// filled in here - nothing is printed for a blank field.

export type TeamMember = { name: string; title: string; phone?: string; email?: string }

export const ADVICE_TEAM: TeamMember[] = [
  { name: 'Sean Allitt', title: 'Senior Private Wealth Adviser', phone: '(02) 8216 6464', email: 'sallitt@ords.com.au' },
  { name: 'Louie Ognenovski', title: 'Senior Private Wealth Adviser', phone: '(02) 8216 6372', email: 'lognen@ords.com.au' },
]
