import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Asterisk, Battery, BatteryCharging, BookOpen, Box, Check, ChevronRight, CircleHelp, Compass, Download, Droplets, Flower2, Gem, Heart, Maximize, Minimize, Moon, MousePointer2, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Sprout, Sun, Upload, Volume2, VolumeX, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { collectibles, createBackup, defaultState, liveries, lights, loadState, restoreBackup, saveState, shells } from './lib/state';
import type { LabState, RobotSettings } from './lib/state';
import type { RobotAction } from './lib/motion';
import { activityBlocked, finishActivity, harvestPlot, plantPlot } from './lib/progress';
import { zones } from './lib/worlds';
import { Diary, FieldNotice, GardenPanel, JourneyChip, ZonePicker } from './components/FieldPanels';

const RobotScene = lazy(() => import('./components/RobotScene'));
type Tab = 'customize' | 'explore' | 'collect' | 'care' | 'settings' | 'garden';
const navItems: { id: Tab; icon: LucideIcon; label: string; caption: string; num: string }[] = [
  { id: 'explore', icon: Compass, label: 'Explorar', caption: 'El mundo te espera', num: '01' },
  { id: 'collect', icon: Box, label: 'Colección', caption: 'Pequeños tesoros', num: '02' },
  { id: 'care', icon: Heart, label: 'Cuidados', caption: 'Un poco de cariño', num: '03' },
  { id: 'settings', icon: Settings2, label: 'Ajustes', caption: 'A tu manera', num: '04' },
];
const objectIcons: Record<string, LucideIcon> = { sprout: Sprout, gem: Gem, bolt: Zap, flower: Flower2, droplet: Droplets };
const actionMessages: Record<RobotAction, string> = {
  idle: 'Un pequeño robot. Una gran curiosidad.', wave: '¡Hola! WEE está feliz de verte.',
  explore: 'Buscando maravillas en el sector norte…', dance: 'A veces, la felicidad tiene su propio ritmo.',
  charge: 'Recargando energía para la próxima aventura.', water: 'Cuidar algo pequeño también es una aventura.',
  rest: 'Hasta los pequeños guardianes necesitan descansar.',
};

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description: string }) {
  return <button className="toggle-row" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}>
    <span><strong>{label}</strong><small>{description}</small></span><span className={`switch ${checked ? 'on' : ''}`}><span /></span>
  </button>;
}

function Swatches({ label, subtitle, options, value, onChange }: {
  label: string; subtitle: string; options: readonly { name: string; color: string }[]; value: string; onChange: (color: string) => void;
}) {
  return <div className="swatch-row"><div><strong>{label}</strong><small>{subtitle}</small></div><div className="swatches" role="group" aria-label={label}>
    {options.map(option => <button key={option.color} style={{ '--swatch': option.color } as React.CSSProperties}
      className={`swatch ${value === option.color ? 'selected' : ''}`} title={option.name} aria-label={`${label}: ${option.name}`}
      aria-pressed={value === option.color} onClick={() => onChange(option.color)} />)}
  </div></div>;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState<Tab>('customize');
  const [action, setAction] = useState<RobotAction>('idle');
  const [toast, setToast] = useState('');
  const [help, setHelp] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [time, setTime] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const [storageOkay, setStorageOkay] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(0);
  const [showNotice, setShowNotice] = useState(() => { try { return sessionStorage.getItem('wee-regreen-intro') !== 'seen'; } catch { return true; } });
  const [nameDraft, setNameDraft] = useState(state.name);
  const [pendingBackup, setPendingBackup] = useState<LabState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const importInput = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const busy = action !== 'idle';
  const settings = state.settings;
  const currentZone = zones.find(zone => zone.id === state.zone)!;
  const mood = action === 'rest' ? 'sleeping' : state.energy < 20 ? 'tired' : state.affection >= 85 || action === 'wave' || action === 'dance' ? 'happy' : 'curious';

  useEffect(() => { setStorageOkay(saveState(state)); }, [state]);
  useEffect(() => { setNameDraft(state.name); }, [state.name]);
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (progressTimer.current) clearInterval(progressTimer.current); void audio.current?.close(); }, []);
  useEffect(() => { const fn = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', fn); return () => document.removeEventListener('fullscreenchange', fn); }, []);
  useEffect(() => {
    if (!help && !resetOpen && !selectedItem && !diaryOpen && !pendingBackup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setHelp(false); setResetOpen(false); setSelectedItem(null); setDiaryOpen(false); setPendingBackup(null); } };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [help, resetOpen, selectedItem, diaryOpen, pendingBackup]);

  const playSound = useCallback(() => {
    if (!settings.sound) return;
    try {
      audio.current ??= new AudioContext();
      const context = audio.current;
      void context.resume();
      [440, 660, 880].forEach((freq, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = freq;
        gain.gain.setValueAtTime(0, context.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, context.currentTime + i * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + i * 0.08 + 0.16);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(context.currentTime + i * 0.08); oscillator.stop(context.currentTime + i * 0.08 + 0.2);
      });
    } catch { setToast('El sonido no está disponible en este navegador.'); }
  }, [settings.sound]);

  const changeSetting = <K extends keyof RobotSettings>(key: K, value: RobotSettings[K]) => {
    setState(s => ({ ...s, settings: { ...s.settings, [key]: value } }));
  };

  const perform = useCallback((nextAction: RobotAction, plot: number | null = null) => {
    if (busy) { setToast('WEE está terminando su pequeña aventura.'); return; }
    const blocked = activityBlocked(stateRef.current, nextAction, state.zone, plot);
    if (blocked) { setToast(blocked); if (nextAction === 'explore' && state.energy < currentZone.cost + 3) setTab('care'); return; }
    playSound(); setAction(nextAction); setProgress(0);
    const duration = nextAction === 'explore' ? currentZone.duration : nextAction === 'charge' ? 5000 : nextAction === 'rest' ? 6000 : 3500;
    const zoneAtStart = state.zone;
    const startedAt = Date.now();
    progressTimer.current = setInterval(() => setProgress(Math.min(100, (Date.now() - startedAt) / duration * 100)), 80);
    timer.current = setTimeout(() => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      const result = finishActivity(stateRef.current, nextAction, zoneAtStart, plot);
      stateRef.current = result.state; setState(result.state);
      if (result.message) setToast(result.message);
      setAction('idle'); setProgress(0); timer.current = null;
    }, duration);
  }, [busy, state.energy, state.zone, currentZone.cost, currentZone.duration, playSound]);

  const wave = useCallback(() => perform('wave'), [perform]);
  const sceneReady = useCallback((element: HTMLCanvasElement) => { canvas.current = element; }, []);
  const selectPlot = useCallback((index: number) => { if (!busy) setSelectedPlot(index); }, [busy]);

  useEffect(() => {
    if (!settings.autoDemo || busy || settings.reducedMotion) return;
    const id = setTimeout(() => perform(Math.random() > 0.5 ? 'wave' : 'dance'), 12_000);
    return () => clearTimeout(id);
  }, [settings.autoDemo, settings.reducedMotion, busy, perform]);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    timer.current = null; setAction('idle'); setProgress(0); setToast('Acción pausada. WEE vuelve a descansar.');
  };
  const screenshot = () => {
    if (!canvas.current) { setToast('Espera a que WEE termine de cargar.'); return; }
    try {
      const source = canvas.current;
      const snapshot = document.createElement('canvas'); snapshot.width = source.width; snapshot.height = source.height;
      const ctx = snapshot.getContext('2d')!;
      ctx.fillStyle = '#e7e7df'; ctx.fillRect(0, 0, snapshot.width, snapshot.height); ctx.drawImage(source, 0, 0);
      ctx.fillStyle = '#373b34'; ctx.font = `italic 900 ${Math.max(20, snapshot.width * 0.04)}px Arial`; ctx.fillText(`${state.name}. / RE:GREEN`, snapshot.width * 0.06, snapshot.height * 0.10);
      const anchor = document.createElement('a'); anchor.download = 'mi-wee.png'; anchor.href = snapshot.toDataURL('image/png'); anchor.click();
      setToast('Tu WEE, listo para guardar.');
    } catch { setToast('No se pudo guardar la imagen. Prueba de nuevo.'); }
  };
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setToast('La pantalla completa no está disponible en este navegador.'); }
  };
  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    setState(structuredClone(defaultState)); setAction('idle'); setProgress(0); setCameraReset(n => n + 1); setResetOpen(false); setToast('Un nuevo comienzo. WEE vuelve a su estado original.');
  };
  const applyGardenResult = (result: { state: LabState; message: string }) => {
    if (busy) return;
    stateRef.current = result.state; setState(result.state); setToast(result.message); playSound();
  };
  const exportProgress = () => {
    const url = URL.createObjectURL(new Blob([createBackup(state)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'wee-regreen.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('Tu compañero y sus recuerdos, a salvo en una copia.');
  };
  const importProgress = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 262_144) throw new Error('El archivo es demasiado grande.');
      setPendingBackup(restoreBackup(await file.text()));
    } catch { setToast('No se pudo abrir esta copia. Elige un archivo wee-regreen.json válido.'); }
    if (importInput.current) importInput.current.value = '';
  };
  const applyBackup = () => {
    if (!pendingBackup) return;
    if (timer.current) clearTimeout(timer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    stateRef.current = pendingBackup; setState(pendingBackup); setPendingBackup(null);
    setAction('idle'); setProgress(0); setSelectedPlot(0); setToast('Tu compañero y su jardín están de vuelta.');
  };
  const selectedCollectible = collectibles.find(c => c.id === selectedItem);
  const panelTitles: Record<Tab, [string, string]> = {
    customize: ['Hazlo tuyo.', 'Pequeños detalles. Mucha personalidad.'],
    explore: ['La curiosidad mueve.', 'Un mundo pequeño, lleno de descubrimientos.'],
    collect: ['Todo tiene una historia.', 'Los pequeños tesoros de tus aventuras.'],
    care: ['El cariño se nota.', 'Un compañero feliz empieza por ti.'],
    settings: ['A tu ritmo.', 'Tu laboratorio, tus preferencias.'],
    garden: ['Deja algo vivo.', 'Una semilla hoy. Un pequeño mundo mañana.'],
  };

  return <div className={`app-shell field-${state.zone} ${settings.night ? 'scene-night' : ''}`}>
    <header className="header">
      <button className="brand" onClick={() => setTab('customize')} aria-label="WEE, inicio">WE<span>E</span><i>®</i></button>
      <span className="brand-caption">RE:GREEN PROJECT.<br />ONE SEED AT A TIME.</span>
      <nav className="header-nav" aria-label="Navegación principal">
        <button className={tab === 'customize' ? 'active' : ''} onClick={() => setTab('customize')}>Estación</button>
        <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Misiones <span className="nav-count">03</span></button>
        <button className={tab === 'collect' ? 'active' : ''} onClick={() => setTab('collect')}>Inventario</button>
        <button className="diary-nav-button" onClick={() => setDiaryOpen(true)} aria-label="Abrir diario"><BookOpen size={12} /><span>Diario</span></button>
      </nav>
      <div className="header-status"><span className="online-dot" /> SISTEMA EN LÍNEA <span className="header-divider" /><Battery size={16} strokeWidth={1.5} /><span>{state.energy}%</span></div>
      <button className="icon-button help-button" aria-label="Cómo funciona" onClick={() => setHelp(true)}><CircleHelp size={19} /></button>
    </header>

    <main className="main-layout">
      <section className="robot-stage" aria-label="Robot WEE interactivo en 3D">
        <div className="stage-heading"><span className="eyebrow"><span className="tiny-line" /> RE:GREEN / ESTACIÓN DE REGENERACIÓN</span>
          <h1>Pequeñas huellas.<br />Un mundo que <em>renace.</em><span className="heading-dot"><Asterisk size={27} strokeWidth={2} /></span></h1>
          <p>Explora. Recupera. Dale un lugar a la vida.</p>
          <div className="field-tools"><button className={tab === 'garden' ? 'active' : ''} onClick={() => setTab(tab === 'garden' ? 'customize' : 'garden')}><Sprout size={14} />Mi jardín <span>{state.garden.filter(plot => plot.species).length}/3</span></button><button onClick={() => changeSetting('night', !settings.night)} aria-label={settings.night ? 'Activar luz de día' : 'Activar ciclo nocturno'}>{settings.night ? <Moon size={13} /> : <Sun size={13} />}{settings.night ? 'Noche' : 'Día'}</button></div>
        </div>
        <div className="side-label">EXPLORAR &nbsp; / &nbsp; RECUPERAR &nbsp; / &nbsp; CULTIVAR <span /></div>
        <div className="scene-container"><Suspense fallback={<div className="scene-loader"><span className="loader-ring" />CARGANDO LABORATORIO</div>}>
          <RobotScene settings={settings} action={action} plant={state.plant} cameraReset={cameraReset}
            onReady={sceneReady} onWave={wave} zone={state.zone} garden={state.garden} gardenView={tab === 'garden'} mood={mood} selectedPlot={selectedPlot} onSelectPlot={selectPlot} />
        </Suspense></div>
        <div className="spec-label"><JourneyChip state={state} /></div>
        <div className="scene-tools"><button className="icon-button" onClick={() => setCameraReset(n => n + 1)} title="Restablecer cámara" aria-label="Restablecer cámara"><RotateCcw size={17} /></button>
          <button className="icon-button" onClick={screenshot} title="Guardar imagen" aria-label="Guardar imagen"><Download size={17} /></button>
          <button className="icon-button" onClick={toggleFullscreen} title="Pantalla completa" aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
        </div>
        <div className="stage-bottom"><span className="drag-hint"><MousePointer2 size={13} /> ARRASTRA PARA EXPLORAR EN 360°</span><span className="edition">{currentZone.name.toUpperCase()} <span>↗</span></span></div>
      </section>

      <aside className="lab-panel">
        <div className="panel-top"><div className="panel-brand"><span className="status-led" /> RE:GREEN FIELD STATION</div><div className="clock">{time.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}<small>HORA LOCAL</small></div></div>
        <div className="panel-content">
          <div className="panel-title-row"><span className="eyebrow">{tab === 'customize' ? '01 / PERSONALIZACIÓN' : tab === 'explore' ? '02 / EXPLORACIÓN' : tab === 'collect' ? '03 / COLECCIÓN' : tab === 'care' ? '04 / CUIDADOS' : tab === 'garden' ? '06 / JARDÍN ORBITAL' : '05 / PREFERENCIAS'}</span>
            {tab !== 'customize' && <button className="text-button" onClick={() => setTab('customize')} aria-label="Volver a personalización"><RotateCcw size={13} /> LAB</button>}
          </div>
          <h2>{panelTitles[tab][0]}</h2><p className="panel-description">{panelTitles[tab][1]}</p>

          {tab === 'customize' && <div className="customize-content">
            <div className="section-caption">EL EXTERIOR <span>01—03</span></div>
            <Swatches label="Acentos" subtitle={liveries.find(c => c.color === settings.livery)?.name ?? 'Coral'} options={liveries} value={settings.livery} onChange={color => changeSetting('livery', color)} />
            <Swatches label="Carcasa" subtitle={shells.find(c => c.color === settings.shell)?.name ?? 'Porcelana'} options={shells} value={settings.shell} onChange={color => changeSetting('shell', color)} />
            <Swatches label="Luces" subtitle={lights.find(c => c.color === settings.light)?.name ?? 'Ámbar'} options={lights} value={settings.light} onChange={color => changeSetting('light', color)} />
            <div className="section-caption behavior-caption">SU PERSONALIDAD <Sparkles size={13} /></div>
            <Toggle label="Cámara libre" description="Míralo desde todos los ángulos" checked={settings.orbit} onChange={() => changeSetting('orbit', !settings.orbit)} />
            <Toggle label="Un poco de vida" description="WEE juega cuando no estás mirando" checked={settings.autoDemo} onChange={() => changeSetting('autoDemo', !settings.autoDemo)} />
            <button className="hello-button" disabled={busy} onClick={() => perform('wave')}><span>¿Nos conocemos?</span><span>Saluda a WEE <ArrowUpRight size={15} /></span></button>
          </div>}

          {tab === 'explore' && <div className="explore-content">
            <ZonePicker state={state} busy={busy} onChange={zone => setState(s => ({ ...s, zone }))} />
            <div className={`map-card map-${state.zone}`}><div className="map-grid" /><div className="map-route" /><span className="map-point start" /><span className="map-point end"><Sprout size={15} /></span>
              <span className="map-coordinate">{currentZone.coordinates}</span><span className="map-tag">{currentZone.name.toUpperCase()}</span><span className="map-robot">W</span>
            </div>
            <div className="mission-row"><div><strong>{currentZone.subtitle}</strong><small>{currentZone.duration / 1000} SEGUNDOS · +1 SEMILLA · +{currentZone.xp} XP</small></div><span className="mission-number">0{zones.indexOf(currentZone) + 1}</span></div>
            <button className="primary-button" disabled={busy} onClick={() => perform('explore')}><Compass size={16} /> {action === 'explore' ? 'Explorando…' : 'Iniciar exploración'}<ArrowRight size={16} /></button>
            <div className="mission-tasks"><div className={state.discoveries.length > 1 ? 'complete' : ''}><span>{state.discoveries.length > 1 ? <Check size={12} /> : '01'}</span>Encuentra tu primer tesoro</div><div className={currentZone.treasures.every(id => state.discoveries.includes(id)) ? 'complete' : ''}><span>{currentZone.treasures.every(id => state.discoveries.includes(id)) ? <Check size={12} /> : '02'}</span>Completa esta ruta <small>{currentZone.treasures.filter(id => state.discoveries.includes(id)).length}/{currentZone.treasures.length}</small></div><div className={state.waterCount > 0 ? 'complete' : ''}><span>{state.waterCount > 0 ? <Check size={12} /> : '03'}</span>Cuida de una nueva vida</div></div>
          </div>}

          {tab === 'collect' && <div className="collection-content"><div className="section-caption">INVENTARIO <span>{state.discoveries.length.toString().padStart(2, '0')} / 08 OBJETOS</span></div>
            <div className="collection-grid">{collectibles.map(item => { const unlocked = state.discoveries.includes(item.id); const Icon = objectIcons[item.icon]; return <button key={item.id} className={`collectible ${unlocked ? 'unlocked' : 'locked'}`} onClick={() => unlocked ? setSelectedItem(item.id) : setToast('Explora nuevas zonas para encontrar este tesoro.')} aria-label={unlocked ? item.name : `${item.name}, pendiente de descubrir`}>
              <span className="item-number">{item.type.split(' · ')[1]}</span><Icon size={31} strokeWidth={1.3} style={{ color: unlocked ? item.color : undefined }} /><strong>{unlocked ? item.name : 'Por descubrir'}</strong><small>{unlocked ? item.type.split(' · ')[0] : 'EXPLORA PARA ENCONTRARLO'}</small>{unlocked && <ArrowUpRight className="item-arrow" size={12} />}
            </button>; })}</div>
            <Toggle label="Tu pequeño brote" description={state.plant ? 'WEE lleva su planta favorita' : 'Equipa la planta de tu colección'} checked={state.plant} onChange={() => setState(s => ({ ...s, plant: !s.plant }))} />
          </div>}

          {tab === 'garden' && <GardenPanel state={state} busy={busy} selected={selectedPlot} onSelect={selectPlot}
            onPlant={plant => applyGardenResult(plantPlot(state, selectedPlot, plant))}
            onWater={() => perform('water', selectedPlot)} onHarvest={() => applyGardenResult(harvestPlot(state, selectedPlot))} onExplore={() => setTab('explore')} />}

          {tab === 'care' && <div className="care-content"><div className="vital-card"><BatteryCharging size={20} strokeWidth={1.5} /><div><span>ENERGÍA</span><strong>{state.energy}<small>%</small></strong></div><div className="vital-bar"><span style={{ width: `${state.energy}%` }} /></div></div>
            <div className="vital-card affection"><Heart size={20} strokeWidth={1.5} /><div><span>FELICIDAD</span><strong>{state.affection}<small>%</small></strong></div><div className="vital-bar"><span style={{ width: `${state.affection}%` }} /></div></div>
            <div className="care-actions"><button disabled={busy} onClick={() => perform('charge')}><Zap size={18} /><span>Recargar<small>UN RESPIRO DE 5 SEGUNDOS</small></span><ChevronRight size={16} /></button><button disabled={busy} onClick={() => perform('water')}><Droplets size={18} /><span>Regar la planta<small>{state.waterCount} MOMENTOS DE CUIDADO</small></span><ChevronRight size={16} /></button><button disabled={busy} onClick={() => perform('dance')}><Sparkles size={18} /><span>Un baile, por favor<small>PORQUE SÍ. PORQUE ALEGRA.</small></span><ChevronRight size={16} /></button><button disabled={busy} onClick={() => perform('rest')}><Moon size={18} /><span>Descansar un momento<small>6 SEGUNDOS · +25 ENERGÍA</small></span><ChevronRight size={16} /></button></div>
          </div>}

          {tab === 'settings' && <div className="settings-content"><form className="name-form" onSubmit={e => { e.preventDefault(); const name = nameDraft.trim(); if (name) { setState(s => ({ ...s, name })); setToast(`Un nombre, un compañero. Hola, ${name}.`); } }}><label htmlFor="companion-name">¿CÓMO SE LLAMA TU COMPAÑERO?</label><div><input id="companion-name" value={nameDraft} maxLength={18} onChange={e => setNameDraft(e.target.value)} /><button type="submit" disabled={!nameDraft.trim() || nameDraft.trim() === state.name} aria-label="Guardar nombre"><Check size={15} /></button></div></form>
            <Toggle label="Sonidos de WEE" description="Pequeños sonidos, grandes emociones" checked={settings.sound} onChange={() => changeSetting('sound', !settings.sound)} />
            <Toggle label="Movimiento reducido" description="Poses estáticas, a tu ritmo" checked={settings.reducedMotion} onChange={() => changeSetting('reducedMotion', !settings.reducedMotion)} />
            <Toggle label="Cámara libre" description="Gira y acerca la cámara" checked={settings.orbit} onChange={() => changeSetting('orbit', !settings.orbit)} />
            <div className="settings-note"><ShieldCheck size={18} /><p>Tu WEE se guarda en este navegador.<br />Sin cuentas. Solo tú y tu compañero.</p></div>
            <button className="settings-action" onClick={screenshot}><Download size={15} /> Guardar una foto <ArrowUpRight size={14} /></button>
            <div className="backup-actions"><button onClick={exportProgress}><Download size={13} />Guardar progreso</button><button onClick={() => importInput.current?.click()}><Upload size={13} />Restaurar copia</button><input ref={importInput} type="file" accept="application/json,.json" aria-label="Archivo de copia de WEE" hidden onChange={e => void importProgress(e.target.files?.[0])} /></div>
            <button className="settings-action reset-action" onClick={() => setResetOpen(true)}><RotateCcw size={15} /> Empezar de nuevo <ArrowUpRight size={14} /></button>
          </div>}
        </div>

        <nav className="feature-nav" aria-label="Actividades del robot">{navItems.map(item => <button key={item.id} className={`feature-card ${tab === item.id ? 'selected' : ''}`} onClick={() => setTab(item.id)}>
          <span className="feature-number">{item.num}</span><item.icon size={22} strokeWidth={1.6} /><strong>{item.label}</strong><span className="feature-caption">{item.caption}</span><ArrowUpRight size={12} className="feature-arrow" />
        </button>)}</nav>
        <div className="panel-footer"><span><span className={`save-dot ${storageOkay ? '' : 'warning'}`} />{storageOkay ? 'PEQUEÑAS HUELLAS. NUEVOS MUNDOS.' : 'GUARDADO LOCAL NO DISPONIBLE'}</span><span>V.02</span></div>
      </aside>
    </main>

    <footer className="footer"><div className="robot-activity"><span className="activity-dot" /><span>{action === 'explore' ? `${state.name} explora ${currentZone.name.toLowerCase()}…` : action === 'idle' ? `${state.name} ${mood === 'tired' ? 'necesita un descanso.' : mood === 'happy' ? 'está feliz de cuidar este mundo contigo.' : 'se pregunta qué habrá más allá.'}` : actionMessages[action]}</span>{busy && <div className="action-progress"><span style={{ width: `${progress}%` }} /></div>}</div>
      <div className="footer-actions"><button onClick={() => changeSetting('sound', !settings.sound)} aria-label={settings.sound ? 'Silenciar sonido' : 'Activar sonido'}>{settings.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button><button onClick={busy ? stop : () => perform('dance')} aria-label={busy ? 'Pausar acción' : 'Hacer bailar a WEE'}>{busy ? <Pause size={13} /> : <Play size={13} />}</button><span>HECHO DE CÓDIGO. LLENO DE VIDA.</span><ArrowDown size={13} /></div>
    </footer>
    {toast && <div className="toast" role="status"><Sparkles size={16} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Cerrar notificación"><X size={15} /></button></div>}
    {showNotice && <FieldNotice onClose={() => { setShowNotice(false); try { sessionStorage.setItem('wee-regreen-intro', 'seen'); } catch { /* The notice is still dismissed for this session. */ } }} />}
    {(help || resetOpen || selectedCollectible || diaryOpen || pendingBackup) && <div className="modal-backdrop" onClick={() => { setHelp(false); setResetOpen(false); setSelectedItem(null); setDiaryOpen(false); setPendingBackup(null); }}><ModalClose label={diaryOpen ? 'Diario de WEE' : pendingBackup ? 'Restaurar copia de WEE' : 'Información de WEE'} onClose={() => { setHelp(false); setResetOpen(false); setSelectedItem(null); setDiaryOpen(false); setPendingBackup(null); }}>
      {diaryOpen && <Diary state={state} />}
      {pendingBackup && <><span className="eyebrow">VOLVER A ENCONTRARNOS</span><h2>Hola de nuevo, {pendingBackup.name}.</h2><p>Esta copia contiene {pendingBackup.discoveries.length} tesoros, {pendingBackup.garden.filter(plot => plot.species).length} plantas y {pendingBackup.xp} XP. Reemplazará el progreso actual de este navegador.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setPendingBackup(null)}>Conservar lo actual</button><button className="primary-button" onClick={applyBackup}>Restaurar compañero</button></div></>}
      {help && <><span className="eyebrow">BIENVENIDO AL LABORATORIO</span><h2>Hola, soy WEE.</h2><p>Un compañero construido con código, listo para compartir pequeñas aventuras contigo.</p><div className="help-steps"><p><MousePointer2 size={18} /><span><strong>Conóceme desde todos los ángulos.</strong>Arrastra para girar, usa la rueda para acercarte y toca mis ojos para saludar.</span></p><p><Compass size={18} /><span><strong>Sal a descubrir.</strong>Cada exploración revela un nuevo objeto y consume un poco de energía.</span></p><p><Heart size={18} /><span><strong>Cuida de lo que importa.</strong>Recarga mi batería, riega la planta o invítame a bailar. Todo se guarda aquí.</span></p></div><button className="primary-button" onClick={() => setHelp(false)}>Vamos a conocernos <ArrowRight size={16} /></button></>}
      {resetOpen && <><span className="eyebrow">UN NUEVO COMIENZO</span><h2>¿Volvemos al principio?</h2><p>Se borrarán tus colores, tesoros, jardín y recuerdos guardados en este navegador. Puedes guardar una copia desde Ajustes antes de empezar de nuevo.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setResetOpen(false)}>Seguir explorando</button><button className="primary-button" onClick={reset}>Sí, empezar de nuevo</button></div></>}
      {selectedCollectible && <><div className="item-hero" style={{ color: selectedCollectible.color }}>{(() => { const Icon = objectIcons[selectedCollectible.icon]; return <Icon size={64} strokeWidth={1.2} />; })()}</div><span className="eyebrow">{selectedCollectible.type}</span><h2>{selectedCollectible.name}</h2><p>{selectedCollectible.description}</p>{selectedCollectible.id === 'seed' && <button className="primary-button" onClick={() => { setState(s => ({ ...s, plant: !s.plant })); setSelectedItem(null); }}>{state.plant ? 'Guardar la planta' : 'Equipar la planta'}<Sprout size={16} /></button>}<span className="item-collected"><Check size={13} /> EN TU COLECCIÓN</span></>}
    </ModalClose></div>}
  </div>;
}

function ModalClose({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previouslyFocused?.focus();
  }, []);
  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button');
    if (!buttons?.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="modal" ref={ref} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={onClose} aria-label="Cerrar ventana"><X size={19} /></button>{children}</div>;
}
