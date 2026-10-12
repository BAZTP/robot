import { describe, expect, it } from 'vitest';
import { eyeOpenness, robotPose } from './motion';
import type { RobotAction } from './motion';

describe('procedural robot motion', () => {
  it('computes a deterministic, finite pose for every activity', () => {
    const actions: RobotAction[] = ['idle', 'wave', 'explore', 'dance', 'charge', 'water', 'rest'];
    for (const action of actions) {
      for (const time of [0, 0.1, 1, 1000, 99999]) {
        const pose = robotPose(time, action);
        expect(pose).toEqual(robotPose(time, action));
        expect(Object.values(pose).every(Number.isFinite)).toBe(true);
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(0.38);
        expect(Math.abs(pose.headTilt)).toBeLessThanOrEqual(0.2);
      }
    }
  });
  it('keeps all movement static when reduced motion is enabled', () => {
    for (const action of ['idle', 'wave', 'explore', 'dance', 'charge', 'water', 'rest'] as const) {
      expect(robotPose(3, action, true)).toEqual(robotPose(300, action, true));
    }
  });
  it('moves the tracks during exploration but holds them still at rest', () => {
    expect(robotPose(3, 'explore').wheel).not.toBe(robotPose(4, 'explore').wheel);
    expect(robotPose(3, 'idle').wheel).toBe(0);
  });
  it('blinks within lens bounds and preserves accessible static expressions', () => {
    for (const mood of ['curious', 'happy', 'tired', 'sleeping'] as const) {
      for (const time of [0, 5.7, 5.82, 6, 100]) {
        expect(eyeOpenness(time, mood)).toBeGreaterThanOrEqual(0.06);
        expect(eyeOpenness(time, mood)).toBeLessThanOrEqual(1);
      }
      expect(eyeOpenness(0, mood, true)).toBe(eyeOpenness(5.82, mood, true));
    }
    expect(eyeOpenness(5.82, 'curious')).toBeLessThan(eyeOpenness(0, 'curious'));
    expect(eyeOpenness(0, 'sleeping')).toBe(0.08);
  });
});
