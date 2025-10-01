import { InteractionManager, Image } from 'react-native';

let ran = false;

async function prewarmDev() {
  try {
    const [dbMod, _pgn, _cloud, _net, _engine] = await Promise.allSettled([
      import('@/archive/db'),
      import('@/archive/pgn'),
      import('@/shared/cloud'),
      import('@/net/supabaseAdapter'),
      import('@/features/chess/engine/stockfishBrowser').then((m) => m.createBrowserStockfish()),
    ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? (r as any).value : null)));

    // Light DB touch: init and list 1 (harmless probe)
    try {
      const db: any = dbMod;
      if (db?.init) await db.init();
      if (db?.listGames) {
        await db.listGames?.(
          { mode: 'all', result: 'any', sort: 'new', favoritesOnly: false, query: '' },
          1,
          0
        ).catch(() => {});
      }
    } catch {}
  } catch {}
}

async function prefetchPiecesProd() {
  try {
    // Prefer loader registry; generated map behind it
    const mod = await import('@/chess/pieces.loader').catch(() => null as any);
    const registry = mod?.PIECES as Record<string, any> | undefined;
    if (!registry) return;

    const uris = new Set<string>();
    for (const setName of Object.keys(registry)) {
      const themes = registry[setName] || {};
      for (const theme of Object.keys(themes)) {
        const codes = themes[theme] || {};
        for (const code of Object.keys(codes)) {
          const src = codes[code];
          try {
            // @ts-ignore resolveAssetSource exists on native
            const res = Image.resolveAssetSource(src) || {};
            if (res?.uri && typeof res.uri === 'string') {
              uris.add(res.uri);
            }
          } catch {}
        }
      }
    }
    if (!uris.size) return;
    await Promise.allSettled(Array.from(uris).map((u) => Image.prefetch(u)));
  } catch {}
}

export function prewarm() {
  if (ran) return;
  ran = true;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      if (__DEV__) {
        prewarmDev().catch(() => {});
      } else {
        // Prewarm engine in production too for instant AI games
        Promise.all([
          prefetchPiecesProd().catch(() => {}),
          import('@/features/chess/engine/stockfishBrowser').then((m) => m.createBrowserStockfish()).catch(() => {}),
        ]);
      }
    }, 300);
  });
}


