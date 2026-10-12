import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackup, defaultState, loadState, normalizeState, restoreBackup, saveState } from './state';

describe('local lab storage', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts with a complete independent default state', () => {
    const state = loadState();
    expect(state).toEqual(defaultState);
    state.discoveries.push('stone');
    expect(defaultState.discoveries).toEqual(['seed']);
  });
  it('restores personalization and progress after a reload', () => {
    const state = { ...loadState(), energy: 58, waterCount: 3, discoveries: ['seed', 'stone'] };
    expect(saveState(state)).toBe(true);
    expect(loadState()).toEqual(state);
  });
  it('recovers from corrupt storage', () => {
    values.set('wee-lab-v1', 'not json');
    expect(loadState()).toEqual(defaultState);
  });
  it('validates stored colors, percentages, booleans and item identifiers', () => {
    values.set('wee-lab-v1', JSON.stringify({ settings: { livery: 'url(evil)', orbit: 'false' },
      energy: -20, affection: 200, waterCount: -3, discoveries: ['stone', 'stone', 'unknown', 4] }));
    const state = loadState();
    expect(state.settings.livery).toBe(defaultState.settings.livery);
    expect(state.settings.orbit).toBe(true);
    expect(state.energy).toBe(0);
    expect(state.affection).toBe(100);
    expect(state.waterCount).toBe(0);
    expect(state.discoveries).toEqual(['stone']);
  });
  it('remains usable when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } });
    expect(loadState()).toEqual(defaultState);
    expect(saveState(defaultState)).toBe(false);
  });
  it('migrates the original lab without losing colors, treasures or care', () => {
    values.set('wee-lab-v1', JSON.stringify({ energy: 58, affection: 91, waterCount: 2,
      discoveries: ['seed', 'stone', 'bolt'], settings: { livery: '#477dc0' } }));
    const state = loadState();
    expect(state.settings.livery).toBe('#477dc0');
    expect(state.energy).toBe(58);
    expect(state.affection).toBe(91);
    expect(state.xp).toBe(36);
    expect(state.discoveries).toEqual(['seed', 'stone', 'bolt']);
    expect(state.garden).toHaveLength(3);
    expect(state.garden.every(plot => plot.species === null)).toBe(true);
  });
  it('round-trips a complete companion, garden and journal in a backup', () => {
    const state = { ...loadState(), name: 'NOVA', xp: 70, seeds: 5, zone: 'mist' as const,
      garden: [{ species: 'aster' as const, waters: 3 }, { species: null, waters: 0 }, { species: null, waters: 0 }],
      journal: [{ id: 7, at: 12345, kind: 'garden' as const, title: 'Una nueva flor', detail: 'El jardín floreció.' }] };
    expect(restoreBackup(createBackup(state))).toEqual(state);
  });
  it('rejects foreign, malformed and oversized backups', () => {
    expect(() => restoreBackup('{')).toThrow();
    expect(() => restoreBackup(JSON.stringify({ app: 'other', version: 2, state: defaultState }))).toThrow();
    expect(() => restoreBackup('x'.repeat(262145))).toThrow();
  });
  it('validates new progress fields, locked zones and garden stages', () => {
    const state = normalizeState({ xp: -1, seeds: 200, zone: 'solar', name: ' x '.repeat(100),
      garden: [{ species: 'aster', waters: 200 }, { species: 'invalid', waters: 3 }],
      journal: [{ id: 1, at: 'invalid', kind: 'garden' }, { id: 2, at: 10, kind: 'explore', title: 'valid' }, { id: 2, at: 11, kind: 'care', title: 'also valid' }] });
    expect(state.xp).toBe(0);
    expect(state.seeds).toBe(99);
    expect(state.zone).toBe('north');
    expect(state.name.length).toBeLessThanOrEqual(18);
    expect(state.garden).toEqual([{ species: 'aster', waters: 3 }, { species: null, waters: 0 }, { species: null, waters: 0 }]);
    expect(state.journal).toHaveLength(2);
    expect(new Set(state.journal.map(entry => entry.id)).size).toBe(2);
  });
});
