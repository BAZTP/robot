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

export type ZoneId = 'north' | 'mist' | 'solar';
export type SpeciesId = 'aster' | 'fern' | 'copper';
export type JournalKind = 'explore' | 'care' | 'garden';
export interface GardenPlot { species: SpeciesId | null; waters: number }
export interface JournalEntry { id: number; at: number; kind: JournalKind; title: string; detail: string }
export interface RobotSettings {
  livery: string;
  shell: string;
  light: string;
  orbit: boolean;
  autoDemo: boolean;
  sound: boolean;
  reducedMotion: boolean;
  night: boolean;
}
export interface LabState {
  settings: RobotSettings;
  energy: number;
  affection: number;
  plant: boolean;
  waterCount: number;
  discoveries: string[];
  name: string;
  xp: number;
  seeds: number;
  zone: ZoneId;
  garden: GardenPlot[];
  journal: JournalEntry[];
}
export const defaultState: LabState = {
  settings: { livery: liveries[0].color, shell: shells[0].color, light: lights[0].color,
    orbit: true, autoDemo: false, sound: false, reducedMotion: false, night: false },
  energy: 82, affection: 68, plant: true, waterCount: 0, discoveries: ['seed'],
  name: 'WEE', xp: 0, seeds: 3, zone: 'north',
  garden: Array.from({ length: 3 }, () => ({ species: null, waters: 0 })), journal: [],
};
const KEY = 'wee-lab-v1';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, fallback: number, max = 1_000_000) => Math.floor(Math.max(0, Math.min(max, typeof value === 'number' && Number.isFinite(value) ? value : fallback)));
const text = (value: unknown, fallback: string, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;

export function normalizeState(value: unknown): LabState {
    if (!isRecord(value)) return structuredClone(defaultState);
    const saved = value;
    const cfg = isRecord(saved.settings) ? saved.settings : {};
    const validColor = (value: unknown, choices: readonly { color: string }[], fallback: string) =>
      choices.some(c => c.color === value) ? value as string : fallback;
    const boolean = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
    const bounded = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value)) : fallback;
    const discoveries = Array.isArray(saved.discoveries) ? [...new Set(saved.discoveries.filter((id: unknown) => typeof id === 'string' && collectibles.some(c => c.id === id))) ] as string[] : ['seed'];
    const waterCount = integer(saved.waterCount, 0);
    const xp = integer(saved.xp, Math.max(0, discoveries.length - 1) * 12 + waterCount * 6);
    const rawGarden = Array.isArray(saved.garden) ? saved.garden : [];
    const garden = Array.from({ length: 3 }, (_, index) => {
      const plot = isRecord(rawGarden[index]) ? rawGarden[index] : {};
      const species = ['aster', 'fern', 'copper'].includes(String(plot.species)) ? plot.species as SpeciesId : null;
      return { species, waters: species ? integer(plot.waters, 0, 3) : 0 };
    });
    const rawJournal = Array.isArray(saved.journal) ? saved.journal : [];
    const journalIds = new Set<number>();
    const journal = rawJournal.filter((entry: unknown): entry is Record<string, unknown> => isRecord(entry)
      && ['explore', 'care', 'garden'].includes(String(entry.kind))
      && typeof entry.at === 'number' && Number.isFinite(entry.at) && entry.at > 0 && entry.at <= 8_640_000_000_000_000)
      .slice(0, 40).map((entry, index) => {
        let id = integer(entry.id, index + 1, Number.MAX_SAFE_INTEGER - 100);
        while (journalIds.has(id)) id += 1;
        journalIds.add(id);
        return { id, at: entry.at as number, kind: entry.kind as JournalKind,
          title: text(entry.title, 'Un pequeño recuerdo', 100), detail: text(entry.detail, '', 400) };
      });
    return {
      settings: {
        livery: validColor(cfg.livery, liveries, defaultState.settings.livery),
        shell: validColor(cfg.shell, shells, defaultState.settings.shell),
        light: validColor(cfg.light, lights, defaultState.settings.light),
        orbit: boolean(cfg.orbit, true), autoDemo: boolean(cfg.autoDemo, false),
        sound: boolean(cfg.sound, false), reducedMotion: boolean(cfg.reducedMotion, false),
        night: boolean(cfg.night, false),
      },
      energy: bounded(saved.energy, 82), affection: bounded(saved.affection, 68),
      plant: boolean(saved.plant, true),
      waterCount, discoveries, xp, garden, journal,
      name: text(saved.name, 'WEE', 18), seeds: integer(saved.seeds, 3, 99),
      zone: saved.zone === 'mist' && xp >= 20 ? 'mist' : saved.zone === 'solar' && xp >= 45 ? 'solar' : 'north',
    };
}

export function loadState(): LabState {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
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
  { id: 'moss', name: 'Aurora diminuta', type: 'BOTÁNICA · 005', description: 'Este musgo guarda el brillo del bosque. Desbloquea el helecho aurora en tu jardín.', icon: 'sprout', color: '#6dada3' },
  { id: 'dew', name: 'Una gota de cielo', type: 'CRISTAL · 006', description: 'Rocío atrapado en un cristal. Un recuerdo de la primera mañana del bosque.', icon: 'droplet', color: '#7caebe' },
  { id: 'crystal', name: 'Sol de bolsillo', type: 'MINERAL · 007', description: 'Un cristal tibio que recoge la luz de las dunas. Desbloquea la flor de cobre.', icon: 'gem', color: '#d0a266' },
  { id: 'cog', name: 'El tiempo entre dunas', type: 'ARTEFACTO · 008', description: 'Una pieza cubierta de arena. Incluso lo olvidado puede tener un nuevo propósito.', icon: 'bolt', color: '#ba8166' },
] as const;

export function createBackup(state: LabState) { return JSON.stringify({ app: 'wee-regreen', version: 2, state }, null, 2); }
export function restoreBackup(json: string): LabState {
  if (json.length > 262_144) throw new Error('El archivo es demasiado grande.');
  const data: unknown = JSON.parse(json);
  if (!isRecord(data) || data.app !== 'wee-regreen' || data.version !== 2 || !isRecord(data.state)
    || !isRecord(data.state.settings) || typeof data.state.energy !== 'number') throw new Error('Esta copia no pertenece a WEE.');
  return normalizeState(data.state);
}
