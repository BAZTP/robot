import { useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Compass, Droplets, Flower2, Leaf, LockKeyhole, PackageOpen, Plus, Sprout, Sun, X } from 'lucide-react';
import type { JournalKind, LabState, SpeciesId, ZoneId } from '../lib/state';
import { getLevel, growthStage, species, zones } from '../lib/worlds';

export function ZonePicker({ state, busy, onChange }: { state: LabState; busy: boolean; onChange: (id: ZoneId) => void }) {
  return <div className="zone-picker" role="group" aria-label="Zonas de exploración">
    {zones.map((zone, index) => { const locked = state.xp < zone.requiredXp; return <button key={zone.id} aria-pressed={state.zone === zone.id}
      disabled={busy || locked} className={state.zone === zone.id ? 'selected' : ''} onClick={() => onChange(zone.id)}>
      <span style={{ background: zone.color }}>{locked ? <LockKeyhole size={10} /> : index === 0 ? <Compass size={11} /> : index === 1 ? <Leaf size={11} /> : <Sun size={11} />}</span>
      <strong>{zone.name}</strong><small>{locked ? `${zone.requiredXp} XP PARA ABRIR` : `−${zone.cost}% · +${zone.xp} XP`}</small>
    </button>; })}
  </div>;
}

export function GardenPanel({ state, busy, selected, onSelect, onPlant, onWater, onHarvest, onExplore }: {
  state: LabState; busy: boolean; selected: number; onSelect: (index: number) => void;
  onPlant: (species: SpeciesId) => void; onWater: () => void; onHarvest: () => void; onExplore: () => void;
}) {
  const [choice, setChoice] = useState<SpeciesId>('aster');
  const plot = state.garden[selected];
  const plant = species.find(plant => plant.id === plot.species);
  const blooming = plot.species && plot.waters === 3;
  return <div className="garden-content">
    <div className="garden-summary"><span><Sprout size={13} /> TU JARDÍN ORBITAL</span><strong>{state.seeds} <small>SEMILLAS</small></strong></div>
    <div className="plot-picker" role="group" aria-label="Macetas del jardín">{state.garden.map((bed, index) => {
      const growing = species.find(plant => plant.id === bed.species);
      return <button key={index} aria-label={`Maceta ${index + 1}`} aria-pressed={selected === index} className={selected === index ? 'selected' : ''} onClick={() => onSelect(index)} disabled={busy}>
        <span className="plot-number">0{index + 1}</span>
        <span className={`plot-icon ${bed.waters === 3 ? 'blooming' : ''}`} style={{ color: growing?.color }}>{bed.species ? bed.waters === 3 ? <Flower2 size={29} strokeWidth={1.4} /> : <Sprout size={26} strokeWidth={1.4} /> : <Plus size={21} strokeWidth={1.2} />}</span>
        <strong>{bed.species ? growthStage(bed.waters) : 'Un comienzo'}</strong><small>{bed.species ? growing?.name : 'MACETA VACÍA'}</small>
      </button>;
    })}</div>
    {plot.species ? <div className="growth-card"><div className="growth-heading"><div><span>MACETA 0{selected + 1}</span><h3>{plant?.name}</h3></div><Flower2 size={21} style={{ color: plant?.color }} /></div>
      <div className="growth-steps">{[0, 1, 2, 3].map(stage => <span key={stage} className={stage <= plot.waters ? 'reached' : ''}>{stage <= plot.waters ? <Check size={10} /> : stage}<small>{growthStage(stage)}</small></span>)}</div>
      <p>{blooming ? 'La vida se multiplica. Recoge dos semillas y prepara la maceta para otra historia.' : 'Cada riego cuenta. Tres momentos de cuidado, una nueva flor.'}</p>
      <button className="primary-button" disabled={busy} onClick={blooming ? onHarvest : onWater}>{blooming ? <PackageOpen size={15} /> : <Droplets size={15} />}{blooming ? 'Recoger semillas' : 'Regar esta maceta'}<ArrowRight size={14} /></button>
    </div> : <div className="seed-choice"><span className="section-caption">ELIGE QUÉ QUIERES VER CRECER</span>
      <div className="species-picker" role="group" aria-label="Especies del jardín">{species.map(plant => {
        const locked = Boolean(plant.unlock && !state.discoveries.includes(plant.unlock));
        return <button key={plant.id} disabled={locked || busy} className={choice === plant.id ? 'selected' : ''} aria-pressed={choice === plant.id} onClick={() => setChoice(plant.id)}><span style={{ background: plant.color }} /><strong>{plant.name}</strong>{locked ? <LockKeyhole size={10} /> : choice === plant.id ? <Check size={11} /> : <ChevronRight size={10} />}</button>;
      })}</div>
      <button className="primary-button" disabled={busy || state.seeds < 1} onClick={() => onPlant(choice)}><Sprout size={15} />Plantar una semilla<ArrowRight size={14} /></button>
      <p className="garden-hint">{state.seeds ? 'Plantar consume una semilla. El cuidado devuelve mucho más.' : <>Te faltan semillas. <button onClick={onExplore}>Sal a explorar <ArrowRight size={10} /></button></>}</p>
    </div>}
  </div>;
}

export function JourneyChip({ state }: { state: LabState }) {
  const level = getLevel(state.xp);
  return <div className="journey-chip"><span className="journey-symbol"><Sprout size={16} strokeWidth={1.5} /></span><div><strong>{state.name} <span>· NIVEL {level.number}</span></strong><small>{level.name} · {state.xp} XP {level.next ? `/ ${level.next}` : '· MÁXIMO NIVEL'}</small><div className="journey-track"><span style={{ width: `${level.progress}%` }} /></div></div></div>;
}

export function Diary({ state }: { state: LabState }) {
  const [filter, setFilter] = useState<JournalKind | 'all'>('all');
  const filters: { id: JournalKind | 'all'; label: string }[] = [{ id: 'all', label: 'Todo' }, { id: 'explore', label: 'Aventuras' }, { id: 'garden', label: 'Jardín' }, { id: 'care', label: 'Cuidados' }];
  const entries = state.journal.filter(entry => filter === 'all' || entry.kind === filter);
  return <><span className="eyebrow">MEMORIAS DE {state.name.toUpperCase()}</span><h2>Las cosas que importan.</h2><p>Un jardín, un hallazgo, un buen descanso. Cada pequeña aventura deja algo.</p>
    <div className="diary-filters" role="group" aria-label="Filtrar diario">{filters.map(item => <button key={item.id} className={filter === item.id ? 'selected' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
    <div className="diary-entries">{entries.length ? entries.map(entry => <article key={entry.id}><span className={`diary-icon ${entry.kind}`}>{entry.kind === 'garden' ? <Sprout size={16} /> : entry.kind === 'explore' ? <Compass size={16} /> : <Sun size={16} />}</span><div><time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleDateString('es', { day: 'numeric', month: 'short' })} · {new Date(entry.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}</time><h3>{entry.title}</h3><p>{entry.detail}</p></div></article>) : <div className="diary-empty"><BookOpen size={31} strokeWidth={1.1} /><strong>{filter === 'all' ? 'La primera página está por escribir.' : 'Todavía no hay recuerdos aquí.'}</strong><p>Explora, planta o cuida a tu compañero para comenzar.</p></div>}</div>
    <span className="diary-note">LOS ÚLTIMOS 40 RECUERDOS SE GUARDAN EN ESTE NAVEGADOR.</span>
  </>;
}

export function FieldNotice({ onClose }: { onClose: () => void }) {
  return <div className="field-notice"><Sprout size={15} /><span>Ahora, cada aventura hace crecer algo.<strong>Bienvenido a RE:GREEN.</strong></span><button aria-label="Cerrar novedad" onClick={onClose}><X size={12} /></button></div>;
}
