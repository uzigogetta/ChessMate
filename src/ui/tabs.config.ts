export type TabDef = {
  name: string;
  label: string;
  ios: { sfDefault: string; sfSelected: string };
  android: { ionicon: string };
};

export const TABS: TabDef[] = [
  {
    name: 'index',
    label: 'Home',
    ios: { sfDefault: 'house', sfSelected: 'house.fill' },
    android: { ionicon: 'home-outline' }
  },
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
    name: 'friends',
    label: 'Friends',
    ios: { sfDefault: 'person.2', sfSelected: 'person.2.fill' },
    android: { ionicon: 'people-outline' }
  },
  {
    name: 'profile',
    label: 'Profile',
    ios: { sfDefault: 'person', sfSelected: 'person.fill' },
    android: { ionicon: 'person-outline' }
  }
];


