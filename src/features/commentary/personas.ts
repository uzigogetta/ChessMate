import { CommentaryPersonaId } from './commentary.types';

export type PersonaPreset = {
  id: CommentaryPersonaId;
  name: string;
  title: string;
  description: string;
  fallback: string;
  gradient: string[];
  accent: string;
  engine: {
    skill: number;
    depthBias?: number;
    movetimeBiasMs?: number;
  };
};

export const DEFAULT_PERSONA_ID: CommentaryPersonaId = 'coach';

export const PERSONA_PRESETS: Record<CommentaryPersonaId, PersonaPreset> = {
  coach: {
    id: 'coach',
    name: 'Coach Nova',
    title: 'Supportive mentor',
    description: 'Balanced feedback with gentle guidance.',
    fallback: '🎯',
    gradient: ['rgba(191,90,242,0.34)', 'rgba(31,31,35,0.6)'],
    accent: '#be7bff',
    engine: { skill: 5, movetimeBiasMs: 80 },
  },
  rival: {
    id: 'rival',
    name: 'Rival Blaze',
    title: 'Competitive sparring partner',
    description: 'Aggressive tone and sharper tactical pressure.',
    fallback: '🔥',
    gradient: ['rgba(255,94,99,0.28)', 'rgba(31,31,35,0.58)'],
    accent: '#ff5e63',
    engine: { skill: 7, depthBias: 1, movetimeBiasMs: 120 },
  },
  analyst: {
    id: 'analyst',
    name: 'Analyst Vega',
    title: 'Calm strategist',
    description: 'Objective commentary with deeper calculations.',
    fallback: '🧠',
    gradient: ['rgba(67,97,238,0.36)', 'rgba(25,25,35,0.6)'],
    accent: '#4361ee',
    engine: { skill: 9, depthBias: 2, movetimeBiasMs: 160 },
  },
};

export function resolvePersona(id: string | undefined): PersonaPreset {
  if (!id) return PERSONA_PRESETS[DEFAULT_PERSONA_ID];
  const key = id as CommentaryPersonaId;
  return PERSONA_PRESETS[key] ?? PERSONA_PRESETS[DEFAULT_PERSONA_ID];
}


