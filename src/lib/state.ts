export const liveries = [
  { name: 'Coral', color: '#f04946' },
  { name: 'Mandarina', color: '#ed8b35' },
  { name: 'Lima', color: '#88ab47' },
  { name: 'Océano', color: '#477dc0' },
  { name: 'Lavanda', color: '#9982bc' },
] as const;
export const shells = [
  { name: 'Porcelana', color: '#e6e4db' },
  { name: 'Arena', color: '#c4b69d' },
  { name: 'Grafito', color: '#454849' },
] as const;
export const lights = [
  { name: 'Ámbar', color: '#ffb45f' },
  { name: 'Hielo', color: '#8ed8ec' },
  { name: 'Menta', color: '#a5ec8d' },
  { name: 'Violeta', color: '#d4a2f6' },
] as const;

export interface RobotSettings {
  livery: string;
  shell: string;
  light: string;
  orbit: boolean;
  autoDemo: boolean;
  sound: boolean;
  reducedMotion: boolean;
}
export interface LabState {
  settings: RobotSettings;
  energy: number;
  affection: number;
  plant: boolean;
  waterCount: number;
  discoveries: string[];
}
export const defaultState: LabState = {
  settings: { livery: liveries[0].color, shell: shells[0].color, light: lights[0].color,
    orbit: true, autoDemo: false, sound: false, reducedMotion: false },
  energy: 82, affection: 68, plant: true, waterCount: 0, discoveries: ['seed'],
};
const KEY = 'wee-lab-v1';

export function loadState(): LabState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return structuredClone(defaultState);
    const cfg = saved.settings ?? {};
    const validColor = (value: unknown, choices: readonly { color: string }[], fallback: string) =>
      choices.some(c => c.color === value) ? value as string : fallback;
    const boolean = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
    const bounded = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value)) : fallback;
    return {
      settings: {
        livery: validColor(cfg.livery, liveries, defaultState.settings.livery),
        shell: validColor(cfg.shell, shells, defaultState.settings.shell),
        light: validColor(cfg.light, lights, defaultState.settings.light),
        orbit: boolean(cfg.orbit, true), autoDemo: boolean(cfg.autoDemo, false),
        sound: boolean(cfg.sound, false), reducedMotion: boolean(cfg.reducedMotion, false),
      },
      energy: bounded(saved.energy, 82), affection: bounded(saved.affection, 68),
      plant: boolean(saved.plant, true),
      waterCount: typeof saved.waterCount === 'number' && Number.isFinite(saved.waterCount) ? Math.max(0, Math.floor(saved.waterCount)) : 0,
      discoveries: Array.isArray(saved.discoveries) ? [...new Set(saved.discoveries.filter((id: unknown) => typeof id === 'string' && ['seed', 'stone', 'bolt', 'flower'].includes(id))) ] as string[] : ['seed'],
    };
  } catch { return structuredClone(defaultState); }
}

export function saveState(state: LabState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export const collectibles = [
  { id: 'seed', name: 'Un nuevo comienzo', type: 'SEMILLA · 001', description: 'Las grandes aventuras empiezan con algo pequeño.', icon: 'sprout', color: '#6a8549' },
  { id: 'stone', name: 'Piedra lunar', type: 'MINERAL · 002', description: 'Un pequeño tesoro encontrado en el sector norte.', icon: 'gem', color: '#9398a6' },
  { id: 'bolt', name: 'Pieza de historia', type: 'ARTEFACTO · 003', description: 'Un tornillo antiguo. WEE cree que perteneció a un amigo.', icon: 'bolt', color: '#ae8250' },
  { id: 'flower', name: 'Vida entre el metal', type: 'BOTÁNICA · 004', description: 'Una flor que encontró su lugar en el laboratorio.', icon: 'flower', color: '#da8c87' },
] as const;
