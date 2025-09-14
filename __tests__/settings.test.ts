import { useSettings } from '@/features/settings/settings.store';

describe('settings.store', () => {
  it('persists and updates boardTheme', () => {
    const initial = useSettings.getState().boardTheme;
    useSettings.getState().setBoardTheme('classicGreen');
    expect(useSettings.getState().boardTheme).toBe('classicGreen');
    useSettings.getState().setBoardTheme('default');
    expect(useSettings.getState().boardTheme).toBe('default');
    // reset
    useSettings.setState({ boardTheme: initial });
  });
});


