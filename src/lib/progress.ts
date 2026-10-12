import { collectibles } from './state';
import type { JournalKind, LabState, SpeciesId, ZoneId } from './state';
import type { RobotAction } from './motion';
import { species, zones } from './worlds';

interface Result { state: LabState; message: string }
function record(state: LabState, kind: JournalKind, title: string, detail: string, now: number): LabState {
  const id = Math.max(0, ...state.journal.map(entry => entry.id)) + 1;
  return { ...state, journal: [{ id, at: now, kind, title, detail }, ...state.journal].slice(0, 40) };
}
export function activityBlocked(state: LabState, action: RobotAction, zoneId: ZoneId, plot: number | null = null) {
  const zone = zones.find(zone => zone.id === zoneId)!;
  if (action === 'explore' && state.xp < zone.requiredXp) return `Esta zona se desbloquea con ${zone.requiredXp} XP.`;
  if (action === 'explore' && state.energy < zone.cost + 3) return `${state.name} necesita al menos ${zone.cost + 3}% de energía para esta ruta.`;
  if (action === 'water' && plot !== null && (!Number.isInteger(plot) || !state.garden[plot]?.species)) return 'Planta una semilla antes de regar esta maceta.';
  if (action === 'water' && plot === null && !state.plant) return 'Equipa la planta desde tu colección para poder regarla.';
  return null;
}
export function finishActivity(state: LabState, action: RobotAction, zoneId: ZoneId, plot: number | null = null, now = Date.now()): Result {
  const blocked = activityBlocked(state, action, zoneId, plot);
  if (blocked) return { state, message: blocked };
  if (action === 'explore') {
    const zone = zones.find(zone => zone.id === zoneId)!;
    const found = collectibles.find(item => zone.treasures.includes(item.id) && !state.discoveries.includes(item.id));
    const updated = { ...state, energy: Math.max(0, state.energy - zone.cost), xp: state.xp + zone.xp,
      seeds: Math.min(99, state.seeds + 1), discoveries: found ? [...state.discoveries, found.id] : state.discoveries };
    return { state: record(updated, 'explore', found ? found.name : `Un paseo por ${zone.name.toLowerCase()}`,
      `${state.name} volvió de ${zone.name.toLowerCase()} con una semilla y ${zone.xp} XP.${found ? ' «Cada pequeño hallazgo cuenta».': ' «Todavía hay mucho por cuidar». '}`, now),
      message: `${found ? `Nuevo tesoro: ${found.name}.` : 'Ruta completada.'} +1 semilla · +${zone.xp} XP` };
  }
  if (action === 'charge' || action === 'rest') {
    const full = action === 'charge';
    const updated = { ...state, energy: full ? 100 : Math.min(100, state.energy + 25), affection: Math.min(100, state.affection + (full ? 0 : 3)) };
    return { state: record(updated, 'care', full ? 'Listo para otra aventura' : 'El arte de bajar el ritmo',
      full ? `${state.name} recargó su batería. El mundo puede esperar unos segundos.` : `${state.name} descansó y recuperó 25 puntos de energía. «A veces, descansar también es avanzar».`, now),
      message: full ? 'Batería cargada. ¡Listo para explorar!' : 'Un buen descanso. +25 de energía.' };
  }
  if (action === 'water') {
    const growing = plot !== null && state.garden[plot].waters < 3;
    const earnedXp = growing || plot === null ? 6 : 1;
    const garden = state.garden.map((bed, index) => index === plot ? { ...bed, waters: Math.min(3, bed.waters + 1) } : bed);
    const blooming = growing && garden[plot!].waters === 3;
    const updated = { ...state, garden, waterCount: state.waterCount + 1, affection: Math.min(100, state.affection + 8), xp: state.xp + earnedXp };
    const title = blooming ? 'Y un día, floreció' : 'Una gota hace la diferencia';
    return { state: record(updated, plot === null ? 'care' : 'garden', title,
      blooming ? `${state.name} vio florecer la maceta ${plot! + 1}. Ya puedes recoger sus semillas para empezar de nuevo.`
        : `${state.name} cuidó ${plot === null ? 'de su pequeño brote' : `la maceta ${plot + 1}`}. «Lo vivo crece cuando le dedicas tiempo».`, now),
      message: blooming ? '¡Tu planta floreció! Recoge sus semillas en el jardín.' : `La planta está feliz. +${earnedXp} XP por cuidarla.` };
  }
  if (action === 'wave' || action === 'dance') return { state: { ...state, affection: Math.min(100, state.affection + 5) }, message: '' };
  return { state, message: '' };
}
export function plantPlot(state: LabState, index: number, speciesId: SpeciesId, now = Date.now()): Result {
  const plant = species.find(plant => plant.id === speciesId);
  if (!plant || !Number.isInteger(index) || !state.garden[index] || state.garden[index].species) return { state, message: 'Elige una maceta vacía para plantar.' };
  if (state.seeds < 1) return { state, message: 'Explora una zona para conseguir más semillas.' };
  if (plant.unlock && !state.discoveries.includes(plant.unlock)) return { state, message: 'Encuentra esta especie durante tus exploraciones.' };
  const updated = { ...state, seeds: state.seeds - 1, xp: state.xp + 8,
    garden: state.garden.map((bed, i) => i === index ? { species: speciesId, waters: 0 } : bed) };
  return { state: record(updated, 'garden', `Un lugar para ${plant.name.toLowerCase()}`, `${state.name} plantó una semilla en la maceta ${index + 1}. Tres riegos la llevarán hasta la floración.`, now), message: 'Semilla plantada. Un nuevo comienzo. +8 XP' };
}
export function harvestPlot(state: LabState, index: number, now = Date.now()): Result {
  if (!Number.isInteger(index) || !state.garden[index]?.species || state.garden[index].waters < 3) return { state, message: 'La planta necesita tres riegos antes de dar semillas.' };
  const updated = { ...state, seeds: Math.min(99, state.seeds + 2), xp: state.xp + 18, energy: Math.min(100, state.energy + 10),
    garden: state.garden.map((bed, i) => i === index ? { species: null, waters: 0 } : bed) };
  return { state: record(updated, 'garden', 'La vida se multiplica', `${state.name} recogió dos semillas de la maceta ${index + 1}. La maceta está lista para otra historia.`, now), message: '+2 semillas · +18 XP · +10 energía. ¡A seguir cultivando!' };
}
