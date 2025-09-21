export type TabDef = {
  name: 'play' | 'puzzles' | 'archive' | 'profile' | (string & {});
  label: string;
  ios: { sfDefault: string; sfSelected: string };
  android: { ionicon: string };
};

export const TABS: TabDef[] = [
  {
    name: 'play',
    label: 'Play',
    ios: { sfDefault: 'gamecontroller', sfSelected: 'gamecontroller.fill' },
    android: { ionicon: 'game-controller-outline' }
  },
  {
    name: 'puzzles',
    label: 'Puzzles',
    ios: { sfDefault: 'square.grid.2x2', sfSelected: 'square.grid.2x2.fill' },
    android: { ionicon: 'grid-outline' }
  },
  {
    name: 'archive',
    label: 'Archive',
    ios: { sfDefault: 'archivebox', sfSelected: 'archivebox.fill' },
    android: { ionicon: 'archive-outline' }
  },
  {
    name: 'profile',
    label: 'Profile',
    ios: { sfDefault: 'person', sfSelected: 'person.fill' },
    android: { ionicon: 'person-outline' }
  }
];


