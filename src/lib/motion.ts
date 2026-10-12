export type RobotAction = 'idle' | 'wave' | 'explore' | 'dance' | 'charge' | 'water' | 'rest';
export type RobotMood = 'curious' | 'happy' | 'tired' | 'sleeping';

export function eyeOpenness(time: number, mood: RobotMood, reducedMotion = false) {
  if (mood === 'sleeping') return 0.08;
  const baseline = mood === 'tired' ? 0.5 : mood === 'happy' ? 0.8 : 1;
  if (reducedMotion) return baseline;
  const phase = ((time % 6) + 6) % 6;
  const blink = phase > 5.65 ? Math.sin((phase - 5.65) / 0.35 * Math.PI) : 0;
  return Math.max(0.06, baseline * (1 - blink));
}

// Every pose is computed from time. No animation clips or downloaded models.
export function robotPose(time: number, action: RobotAction, reducedMotion = false) {
  const t = reducedMotion ? 0 : time;
  const dance = action === 'dance';
  const exploring = action === 'explore';
  return {
    headTilt: action === 'rest' ? 0.10 : Math.sin(t * (dance ? 4 : 0.7)) * (dance ? 0.2 : 0.045),
    headTurn: action === 'rest' ? 0 : Math.sin(t * 0.45) * 0.13,
    bodyY: Math.sin(t * (dance ? 6 : 1.6)) * (dance ? 0.055 : 0.012),
    bodyTilt: dance ? Math.sin(t * 4) * 0.09 : 0,
    leftArm: action === 'wave' ? -0.9 + Math.sin(t * 7) * 0.24 : dance ? Math.sin(t * 4) * 0.45 : 0.08,
    rightArm: action === 'water' ? Math.sin(t * 3) * 0.13 : dance ? Math.cos(t * 4) * 0.35 : -0.08,
    yaw: exploring ? Math.sin(t * 0.7) * 0.45 : 0,
    x: exploring ? Math.sin(t * 0.7) * 0.38 : 0,
    z: exploring ? Math.cos(t * 0.7) * 0.12 : 0,
    wheel: exploring ? t * 2.4 : dance ? Math.sin(t * 4) * 0.5 : 0,
  };
}
