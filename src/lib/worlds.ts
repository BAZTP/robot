import type { SpeciesId, ZoneId } from './state';

export const zones: { id: ZoneId; name: string; subtitle: string; coordinates: string; cost: number; xp: number; requiredXp: number; duration: number; color: string; treasures: string[] }[] = [
  { id: 'north', name: 'Sector norte', subtitle: 'Donde todo empieza', coordinates: '23° N / 09° E', cost: 12, xp: 12, requiredXp: 0, duration: 7000, color: '#87986c', treasures: ['stone', 'bolt', 'flower'] },
  { id: 'mist', name: 'Bosque de niebla', subtitle: 'Vida que brilla en silencio', coordinates: '41° N / 16° E', cost: 16, xp: 18, requiredXp: 20, duration: 6000, color: '#65a59b', treasures: ['moss', 'dew'] },
  { id: 'solar', name: 'Desierto solar', subtitle: 'El calor guarda sus secretos', coordinates: '12° S / 32° E', cost: 20, xp: 24, requiredXp: 45, duration: 8000, color: '#c29362', treasures: ['crystal', 'cog'] },
];

export const species: { id: SpeciesId; name: string; subtitle: string; color: string; unlock: string | null }[] = [
  { id: 'aster', name: 'Aster de luz', subtitle: 'Un pequeño sol en tu jardín', color: '#d4ad62', unlock: null },
  { id: 'fern', name: 'Helecho aurora', subtitle: 'Un recuerdo del bosque', color: '#70ada2', unlock: 'moss' },
  { id: 'copper', name: 'Flor de cobre', subtitle: 'Vida entre las dunas', color: '#d48771', unlock: 'crystal' },
];

const levels = [
  { xp: 0, name: 'Aprendiz' }, { xp: 25, name: 'Botánico' },
  { xp: 60, name: 'Explorador' }, { xp: 120, name: 'Guardián' },
];
export function getLevel(xp: number) {
  const index = levels.reduce((current, level, index) => xp >= level.xp ? index : current, 0);
  const current = levels[Math.max(0, index)];
  const next = levels[index + 1];
  return { number: Math.max(0, index) + 1, name: current.name, next: next?.xp ?? null,
    progress: next ? Math.min(100, (xp - current.xp) / (next.xp - current.xp) * 100) : 100 };
}
export function growthStage(waters: number) { return ['Semilla', 'Brote', 'Creciendo', 'En flor'][Math.min(3, Math.max(0, Math.floor(waters)))]; }
