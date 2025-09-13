export type EngineRequest = { fen: string };
export type EngineResponse = { bestMove: string; eval: number };

export async function evaluatePosition(request: EngineRequest): Promise<EngineResponse> {
	// Placeholder mock: returns random move/eval for scaffolding
	const moves = ['e2e4', 'd2d4', 'g1f3', 'c2c4'];
	return {
		bestMove: moves[Math.floor(Math.random() * moves.length)],
		eval: Math.round((Math.random() * 2 - 1) * 100) / 100
	};
}


