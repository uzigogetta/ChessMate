import { create } from 'zustand';
import { COMMENTARY_DETAIL_LEVELS, COMMENTARY_PERSONA_IDS, type CommentaryDetailLevel, type CommentaryPersonaId } from './commentary.types';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import { useSettings } from '@/features/settings/settings.store';

type CommentarySettingsState = {
  enabled: boolean;
  persona: CommentaryPersonaId;
  detail: CommentaryDetailLevel;
  typingIndicator: boolean;
  setEnabled: (value: boolean) => void;
  setPersona: (persona: CommentaryPersonaId) => void;
  setDetail: (detail: CommentaryDetailLevel) => void;
  setTypingIndicator: (value: boolean) => void;
  reset: () => void;
};

type StoredCommentarySettings = Partial<CommentarySettingsState> & { version?: number };

const COMMENTARY_SETTINGS_VERSION = 1;

const DEFAULTS: Pick<CommentarySettingsState, 'enabled' | 'persona' | 'detail' | 'typingIndicator'> = {
  enabled: false,
  persona: 'coach',
  detail: 'standard',
  typingIndicator: true,
};

function loadSettings(): Pick<CommentarySettingsState, 'enabled' | 'persona' | 'detail' | 'typingIndicator'> {
  try {
    const stored = getJSON<StoredCommentarySettings>(KEYS.commentarySettings);
    if (!stored) return DEFAULTS;
    const { version, ...rest } = stored;
    const persona = COMMENTARY_PERSONA_IDS.includes(rest.persona as CommentaryPersonaId) ? (rest.persona as CommentaryPersonaId) : DEFAULTS.persona;
    const detail = COMMENTARY_DETAIL_LEVELS.includes(rest.detail as CommentaryDetailLevel) ? (rest.detail as CommentaryDetailLevel) : DEFAULTS.detail;
    return {
      enabled: typeof rest.enabled === 'boolean' ? rest.enabled : DEFAULTS.enabled,
      typingIndicator: typeof rest.typingIndicator === 'boolean' ? rest.typingIndicator : DEFAULTS.typingIndicator,
      persona,
      detail,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(settings: Pick<CommentarySettingsState, 'enabled' | 'persona' | 'detail' | 'typingIndicator'>) {
  setJSON(KEYS.commentarySettings, { ...settings, version: COMMENTARY_SETTINGS_VERSION });
}

export const useCommentarySettings = create<CommentarySettingsState>((set) => ({
  ...loadSettings(),
          setEnabled(value) {
            set((state) => {
              const next = { ...state, enabled: value };
              persist(next);
              return next;
            });
  },
  setPersona(persona) {
    set((state) => {
      const constrained = COMMENTARY_PERSONA_IDS.includes(persona) ? persona : DEFAULTS.persona;
      const next = { ...state, persona: constrained };
      persist(next);
      return next;
    });
  },
  setDetail(detail) {
    set((state) => {
      const constrained = COMMENTARY_DETAIL_LEVELS.includes(detail) ? detail : DEFAULTS.detail;
      const next = { ...state, detail: constrained };
      persist(next);
      return next;
    });
  },
  setTypingIndicator(value) {
    set((state) => {
      const next = { ...state, typingIndicator: value };
      persist(next);
      return next;
    });
  },
  reset() {
    persist(DEFAULTS);
    set(DEFAULTS as CommentarySettingsState);
  },
}));

