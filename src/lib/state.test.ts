import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultState, loadState, saveState } from './state';

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
});
