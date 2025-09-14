export type ArchiveGame = {
  id?: string;
  roomId: string;
  players: { id: string; name: string }[];
  mode: '1v1' | '2v2';
  historySAN: string[];
  result?: string;
  startedAt: number;
  endedAt: number;
};

const memory: ArchiveGame[] = [];

export async function saveGame(g: ArchiveGame): Promise<string> {
  const id = g.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  memory.push({ ...g, id });
  return id;
}

export async function listGames(): Promise<ArchiveGame[]> {
  return memory.slice().reverse();
}

export async function getGame(id: string): Promise<ArchiveGame | undefined> {
  return memory.find((g) => g.id === id);
}


