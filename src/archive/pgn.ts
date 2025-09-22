function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function buildPGN({ whiteName, blackName, result, movesSAN, date = new Date(), event, termination }: { whiteName?: string; blackName?: string; result: '1-0' | '0-1' | '1/2-1/2' | '*'; movesSAN: string[]; date?: Date; event?: string; termination?: 'checkmate'|'stalemate'|'fifty-move'|'threefold'|'insufficient' }) {
  const headers = [
    `[Event "${event || 'Casual Game'}"]`,
    `[Date "${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}"]`,
    `[White "${whiteName || 'White'}"]`,
    `[Black "${blackName || 'Black'}"]`,
    `[Result "${result}"]`
  ];
  if (termination) headers.push(`[Termination "${termination}"]`);
  const body = movesSAN
    .map((san, i) => {
      const moveNo = Math.floor(i / 2) + 1;
      return i % 2 === 0 ? `${moveNo}. ${san}` : san;
    })
    .join(' ');
  return `${headers.join('\n')}\n\n${body} ${result}`.trim();
}


