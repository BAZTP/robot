import { describe, expect, it } from 'vitest';
import { robotPose } from './motion';
import type { RobotAction } from './motion';

describe('procedural robot motion', () => {
  it('computes a deterministic, finite pose for every activity', () => {
    const actions: RobotAction[] = ['idle', 'wave', 'explore', 'dance', 'charge', 'water'];
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
    for (const action of ['idle', 'wave', 'explore', 'dance', 'charge', 'water'] as const) {
      expect(robotPose(3, action, true)).toEqual(robotPose(300, action, true));
    }
  });
  it('moves the tracks during exploration but holds them still at rest', () => {
    expect(robotPose(3, 'explore').wheel).not.toBe(robotPose(4, 'explore').wheel);
    expect(robotPose(3, 'idle').wheel).toBe(0);
  });
});
