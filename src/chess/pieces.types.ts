export type PieceCode = 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP' | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';
export type PieceTheme = 'light' | 'dark';
export type PieceSetName = 'default' | 'native' | (string & {});

export type PieceRegistry = {
  [set in PieceSetName]?: {
    [theme in PieceTheme]?: { [code in PieceCode]?: any };
  };
};


