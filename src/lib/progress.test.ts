import { describe, expect, it } from 'vitest';
import { defaultState } from './state';
import { activityBlocked, finishActivity, harvestPlot, plantPlot } from './progress';
import { getLevel, growthStage } from './worlds';

const fresh = () => structuredClone(defaultState);

describe('RE:GREEN adventure and garden rules', () => {
  it('protects locked zones and insufficient energy without awarding progress', () => {
    const state = fresh();
    expect(finishActivity(state, 'explore', 'mist').state).toBe(state);
    expect(activityBlocked(state, 'explore', 'mist')).toContain('20 XP');
    state.energy = 14;
    expect(finishActivity(state, 'explore', 'north').state).toBe(state);
    expect(state.xp).toBe(0);
    expect(state.seeds).toBe(3);
  });
  it('discovers each regional treasure once and rewards repeated exploration', () => {
    let state = fresh();
    for (let i = 0; i < 3; i++) state = finishActivity(state, 'explore', 'north', null, 1000 + i).state;
    expect(state.discoveries).toEqual(['seed', 'stone', 'bolt', 'flower']);
    expect(state.energy).toBe(46);
    expect(state.xp).toBe(36);
    expect(state.seeds).toBe(6);
    expect(state.journal).toHaveLength(3);
    state = finishActivity(state, 'explore', 'north').state;
    expect(state.discoveries).toHaveLength(4);
    expect(state.seeds).toBe(7);
    expect(state.xp).toBe(48);
  });
  it('unlocks a regional species only after finding its treasure', () => {
    let state = { ...fresh(), xp: 20 };
    expect(plantPlot(state, 0, 'fern').state).toBe(state);
    state = finishActivity(state, 'explore', 'mist').state;
    expect(state.discoveries).toContain('moss');
    expect(state.energy).toBe(66);
    expect(state.xp).toBe(38);
    state = plantPlot(state, 0, 'fern').state;
    expect(state.garden[0]).toEqual({ species: 'fern', waters: 0 });
  });
  it('completes a plant lifecycle and prevents harvesting twice', () => {
    const original = fresh();
    let state = plantPlot(original, 1, 'aster', 1000).state;
    expect(original.garden[1].species).toBeNull();
    expect(state.seeds).toBe(2);
    expect(harvestPlot(state, 1).state).toBe(state);
    for (let i = 0; i < 3; i++) state = finishActivity(state, 'water', 'north', 1, 2000 + i).state;
    expect(state.garden[1].waters).toBe(3);
    expect(growthStage(state.garden[1].waters)).toBe('En flor');
    expect(state.journal[0].title).toBe('Y un día, floreció');
    state = harvestPlot(state, 1, 3000).state;
    expect(state.garden[1]).toEqual({ species: null, waters: 0 });
    expect(state.seeds).toBe(4);
    expect(state.xp).toBe(44);
    expect(state.energy).toBe(92);
    expect(state.waterCount).toBe(3);
    expect(harvestPlot(state, 1).state).toBe(state);
  });
  it('recovers the solar crystal and unlocks copper flowers with the solar energy cost', () => {
    const state = { ...fresh(), xp: 45 };
    const explored = finishActivity(state, 'explore', 'solar').state;
    expect(explored.discoveries).toContain('crystal');
    expect(explored.energy).toBe(62);
    expect(explored.xp).toBe(69);
    expect(plantPlot(explored, 2, 'copper').state.garden[2].species).toBe('copper');
  });
  it('rejects invalid, occupied and unaffordable plots', () => {
    const state = fresh();
    expect(plantPlot(state, -1, 'aster').state).toBe(state);
    expect(plantPlot(state, 3, 'aster').state).toBe(state);
    expect(plantPlot(state, 0.5, 'aster').state).toBe(state);
    expect(finishActivity(state, 'water', 'north', 0).state).toBe(state);
    const planted = plantPlot(state, 0, 'aster').state;
    expect(plantPlot(planted, 0, 'aster').state).toBe(planted);
    const emptyStock = { ...state, seeds: 0 };
    expect(plantPlot(emptyStock, 0, 'aster').state).toBe(emptyStock);
  });
  it('caps energy and happiness, and keeps only the latest forty memories', () => {
    let state = { ...fresh(), energy: 90, affection: 99 };
    state = finishActivity(state, 'rest', 'north').state;
    expect(state.energy).toBe(100);
    expect(state.affection).toBe(100);
    for (let i = 0; i < 45; i++) state = finishActivity(state, 'charge', 'north', null, 1000 + i).state;
    expect(state.journal).toHaveLength(40);
    expect(new Set(state.journal.map(entry => entry.id)).size).toBe(40);
    expect(state.journal[0].at).toBe(1044);
  });
  it('reports exact level boundaries and remaining progression', () => {
    expect(getLevel(0)).toMatchObject({ number: 1, progress: 0, next: 25 });
    expect(getLevel(25)).toMatchObject({ number: 2, progress: 0, next: 60 });
    expect(getLevel(120)).toMatchObject({ number: 4, progress: 100, next: null });
  });
});
