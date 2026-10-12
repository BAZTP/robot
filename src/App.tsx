import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Asterisk, Battery, BatteryCharging, Box, Check, ChevronRight, CircleHelp, Compass, Download, Droplets, Flower2, Gem, Heart, Maximize, Minimize, MousePointer2, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Sprout, Volume2, VolumeX, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { collectibles, defaultState, liveries, lights, loadState, saveState, shells } from './lib/state';
import type { RobotSettings } from './lib/state';
import type { RobotAction } from './lib/motion';

const RobotScene = lazy(() => import('./components/RobotScene'));
type Tab = 'customize' | 'explore' | 'collect' | 'care' | 'settings';
const navItems: { id: Tab; icon: LucideIcon; label: string; caption: string; num: string }[] = [
  { id: 'explore', icon: Compass, label: 'Explorar', caption: 'El mundo te espera', num: '01' },
  { id: 'collect', icon: Box, label: 'Colección', caption: 'Pequeños tesoros', num: '02' },
  { id: 'care', icon: Heart, label: 'Cuidados', caption: 'Un poco de cariño', num: '03' },
  { id: 'settings', icon: Settings2, label: 'Ajustes', caption: 'A tu manera', num: '04' },
];
const objectIcons: Record<string, LucideIcon> = { sprout: Sprout, gem: Gem, bolt: Zap, flower: Flower2 };
const actionMessages: Record<RobotAction, string> = {
  idle: 'Un pequeño robot. Una gran curiosidad.', wave: '¡Hola! WEE está feliz de verte.',
  explore: 'Buscando maravillas en el sector norte…', dance: 'A veces, la felicidad tiene su propio ritmo.',
  charge: 'Recargando energía para la próxima aventura.', water: 'Cuidar algo pequeño también es una aventura.',
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
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const busy = action !== 'idle';
  const settings = state.settings;

  useEffect(() => { setStorageOkay(saveState(state)); }, [state]);
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (progressTimer.current) clearInterval(progressTimer.current); void audio.current?.close(); }, []);
  useEffect(() => { const fn = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', fn); return () => document.removeEventListener('fullscreenchange', fn); }, []);
  useEffect(() => {
    if (!help && !resetOpen && !selectedItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setHelp(false); setResetOpen(false); setSelectedItem(null); } };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [help, resetOpen, selectedItem]);

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

  const perform = useCallback((nextAction: RobotAction) => {
    if (busy) { setToast('WEE está terminando su pequeña aventura.'); return; }
    if (nextAction === 'explore' && state.energy < 15) { setTab('care'); setToast('WEE necesita al menos 15% de energía para explorar.'); return; }
    if (nextAction === 'water' && !state.plant) { setToast('Equipa la planta desde tu colección para poder regarla.'); return; }
    playSound(); setAction(nextAction); setProgress(0);
    const duration = nextAction === 'explore' ? 7000 : nextAction === 'charge' ? 5000 : 3500;
    const startedAt = Date.now();
    progressTimer.current = setInterval(() => setProgress(Math.min(100, (Date.now() - startedAt) / duration * 100)), 80);
    timer.current = setTimeout(() => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setState(s => {
        if (nextAction === 'explore') {
          const found = collectibles.find(c => !s.discoveries.includes(c.id));
          setToast(found ? `Nuevo tesoro: ${found.name}. Mira tu colección.` : 'Sector explorado. WEE disfrutó del paseo.');
          return { ...s, energy: Math.max(0, s.energy - 12), discoveries: found ? [...s.discoveries, found.id] : s.discoveries };
        }
        if (nextAction === 'charge') { setToast('Batería cargada. ¡Listo para explorar!'); return { ...s, energy: 100 }; }
        if (nextAction === 'water') { setToast('La planta está feliz. Gracias por cuidarla.'); return { ...s, waterCount: s.waterCount + 1, affection: Math.min(100, s.affection + 8) }; }
        if (nextAction === 'wave' || nextAction === 'dance') return { ...s, affection: Math.min(100, s.affection + 5) };
        return s;
      });
      setAction('idle'); setProgress(0); timer.current = null;
    }, duration);
  }, [busy, state.energy, state.plant, playSound]);

  const wave = useCallback(() => perform('wave'), [perform]);
  const sceneReady = useCallback((element: HTMLCanvasElement) => { canvas.current = element; }, []);

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
      ctx.fillStyle = '#373b34'; ctx.font = `italic 900 ${Math.max(20, snapshot.width * 0.04)}px Arial`; ctx.fillText('WEE.', snapshot.width * 0.06, snapshot.height * 0.10);
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
  const selectedCollectible = collectibles.find(c => c.id === selectedItem);
  const panelTitles: Record<Tab, [string, string]> = {
    customize: ['Hazlo tuyo.', 'Pequeños detalles. Mucha personalidad.'],
    explore: ['La curiosidad mueve.', 'Un mundo pequeño, lleno de descubrimientos.'],
    collect: ['Todo tiene una historia.', 'Los pequeños tesoros de tus aventuras.'],
    care: ['El cariño se nota.', 'Un compañero feliz empieza por ti.'],
    settings: ['A tu ritmo.', 'Tu laboratorio, tus preferencias.'],
  };

  return <div className="app-shell">
    <header className="header">
      <button className="brand" onClick={() => setTab('customize')} aria-label="WEE, inicio">WE<span>E</span><i>®</i></button>
      <span className="brand-caption">SMALL ROBOT.<br />BIG PERSONALITY.</span>
      <nav className="header-nav" aria-label="Navegación principal">
        <button className={tab === 'customize' ? 'active' : ''} onClick={() => setTab('customize')}>Laboratorio</button>
        <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Misiones <span className="nav-count">03</span></button>
        <button className={tab === 'collect' ? 'active' : ''} onClick={() => setTab('collect')}>Inventario</button>
      </nav>
      <div className="header-status"><span className="online-dot" /> SISTEMA EN LÍNEA <span className="header-divider" /><Battery size={16} strokeWidth={1.5} /><span>{state.energy}%</span></div>
      <button className="icon-button help-button" aria-label="Cómo funciona" onClick={() => setHelp(true)}><CircleHelp size={19} /></button>
    </header>

    <main className="main-layout">
      <section className="robot-stage" aria-label="Robot WEE interactivo en 3D">
        <div className="stage-heading"><span className="eyebrow"><span className="tiny-line" /> CONOCE A TU NUEVO COMPAÑERO</span>
          <h1>Un poco de metal.<br />Un montón de <em>vida.</em><span className="heading-dot"><Asterisk size={27} strokeWidth={2} /></span></h1>
          <p>Curioso por naturaleza. Único, como tú.</p>
        </div>
        <div className="side-label">EXPLORAR &nbsp; / &nbsp; COLECCIONAR &nbsp; / &nbsp; CUIDAR <span /></div>
        <div className="scene-container"><Suspense fallback={<div className="scene-loader"><span className="loader-ring" />CARGANDO LABORATORIO</div>}>
          <RobotScene settings={settings} action={action} plant={state.plant} cameraReset={cameraReset}
            onReady={sceneReady} onWave={wave} />
        </Suspense></div>
        <div className="spec-label"><span className="crosshair">+</span><div><strong>WEE—09</strong><small>EXPLORER / FIRST EDITION</small></div><span className="spec-line" /></div>
        <div className="scene-tools"><button className="icon-button" onClick={() => setCameraReset(n => n + 1)} title="Restablecer cámara" aria-label="Restablecer cámara"><RotateCcw size={17} /></button>
          <button className="icon-button" onClick={screenshot} title="Guardar imagen" aria-label="Guardar imagen"><Download size={17} /></button>
          <button className="icon-button" onClick={toggleFullscreen} title="Pantalla completa" aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
        </div>
        <div className="stage-bottom"><span className="drag-hint"><MousePointer2 size={13} /> ARRASTRA PARA EXPLORAR EN 360°</span><span className="edition">DISEÑADO PARA SENTIR <span>↗</span></span></div>
      </section>

      <aside className="lab-panel">
        <div className="panel-top"><div className="panel-brand"><span className="status-led" /> WEE CONTROL CENTER</div><div className="clock">{time.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}<small>HORA LOCAL</small></div></div>
        <div className="panel-content">
          <div className="panel-title-row"><span className="eyebrow">{tab === 'customize' ? '01 / PERSONALIZACIÓN' : tab === 'explore' ? '02 / EXPLORACIÓN' : tab === 'collect' ? '03 / COLECCIÓN' : tab === 'care' ? '04 / CUIDADOS' : '05 / PREFERENCIAS'}</span>
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
            <div className="map-card"><div className="map-grid" /><div className="map-route" /><span className="map-point start" /><span className="map-point end"><Sprout size={15} /></span>
              <span className="map-coordinate">23° N / 09° E</span><span className="map-tag">SECTOR NORTE</span><span className="map-robot">W</span>
            </div>
            <div className="mission-row"><div><strong>Más allá del laboratorio</strong><small>RUTA 01 · 7 SEGUNDOS · −12% ENERGÍA</small></div><span className="mission-number">01</span></div>
            <button className="primary-button" disabled={busy} onClick={() => perform('explore')}><Compass size={16} /> {action === 'explore' ? 'Explorando…' : 'Iniciar exploración'}<ArrowRight size={16} /></button>
            <div className="mission-tasks"><div className={state.discoveries.length > 1 ? 'complete' : ''}><span>{state.discoveries.length > 1 ? <Check size={12} /> : '01'}</span>Encuentra tu primer tesoro</div><div className={state.discoveries.length === 4 ? 'complete' : ''}><span>{state.discoveries.length === 4 ? <Check size={12} /> : '02'}</span>Completa la colección <small>{state.discoveries.length}/4</small></div><div className={state.waterCount > 0 ? 'complete' : ''}><span>{state.waterCount > 0 ? <Check size={12} /> : '03'}</span>Cuida de una nueva vida</div></div>
          </div>}

          {tab === 'collect' && <div className="collection-content"><div className="section-caption">INVENTARIO <span>{state.discoveries.length.toString().padStart(2, '0')} / 04 OBJETOS</span></div>
            <div className="collection-grid">{collectibles.map(item => { const unlocked = state.discoveries.includes(item.id); const Icon = objectIcons[item.icon]; return <button key={item.id} className={`collectible ${unlocked ? 'unlocked' : 'locked'}`} onClick={() => unlocked ? setSelectedItem(item.id) : setToast('Explora el sector norte para encontrar este tesoro.')} aria-label={unlocked ? item.name : `${item.name}, pendiente de descubrir`}>
              <span className="item-number">{item.type.split(' · ')[1]}</span><Icon size={31} strokeWidth={1.3} style={{ color: unlocked ? item.color : undefined }} /><strong>{unlocked ? item.name : 'Por descubrir'}</strong><small>{unlocked ? item.type.split(' · ')[0] : 'EXPLORA PARA ENCONTRARLO'}</small>{unlocked && <ArrowUpRight className="item-arrow" size={12} />}
            </button>; })}</div>
            <Toggle label="Tu pequeño brote" description={state.plant ? 'WEE lleva su planta favorita' : 'Equipa la planta de tu colección'} checked={state.plant} onChange={() => setState(s => ({ ...s, plant: !s.plant }))} />
          </div>}

          {tab === 'care' && <div className="care-content"><div className="vital-card"><BatteryCharging size={20} strokeWidth={1.5} /><div><span>ENERGÍA</span><strong>{state.energy}<small>%</small></strong></div><div className="vital-bar"><span style={{ width: `${state.energy}%` }} /></div></div>
            <div className="vital-card affection"><Heart size={20} strokeWidth={1.5} /><div><span>FELICIDAD</span><strong>{state.affection}<small>%</small></strong></div><div className="vital-bar"><span style={{ width: `${state.affection}%` }} /></div></div>
            <div className="care-actions"><button disabled={busy} onClick={() => perform('charge')}><Zap size={18} /><span>Recargar<small>UN RESPIRO DE 5 SEGUNDOS</small></span><ChevronRight size={16} /></button><button disabled={busy} onClick={() => perform('water')}><Droplets size={18} /><span>Regar la planta<small>{state.waterCount} MOMENTOS DE CUIDADO</small></span><ChevronRight size={16} /></button><button disabled={busy} onClick={() => perform('dance')}><Sparkles size={18} /><span>Un baile, por favor<small>PORQUE SÍ. PORQUE ALEGRA.</small></span><ChevronRight size={16} /></button></div>
          </div>}

          {tab === 'settings' && <div className="settings-content"><Toggle label="Sonidos de WEE" description="Pequeños sonidos, grandes emociones" checked={settings.sound} onChange={() => changeSetting('sound', !settings.sound)} />
            <Toggle label="Movimiento reducido" description="Poses estáticas, a tu ritmo" checked={settings.reducedMotion} onChange={() => changeSetting('reducedMotion', !settings.reducedMotion)} />
            <Toggle label="Cámara libre" description="Gira y acerca la cámara" checked={settings.orbit} onChange={() => changeSetting('orbit', !settings.orbit)} />
            <div className="settings-note"><ShieldCheck size={18} /><p>Tu WEE se guarda en este navegador.<br />Sin cuentas. Solo tú y tu compañero.</p></div>
            <button className="settings-action" onClick={screenshot}><Download size={15} /> Guardar una foto <ArrowUpRight size={14} /></button>
            <button className="settings-action reset-action" onClick={() => setResetOpen(true)}><RotateCcw size={15} /> Empezar de nuevo <ArrowUpRight size={14} /></button>
          </div>}
        </div>

        <nav className="feature-nav" aria-label="Actividades del robot">{navItems.map(item => <button key={item.id} className={`feature-card ${tab === item.id ? 'selected' : ''}`} onClick={() => setTab(item.id)}>
          <span className="feature-number">{item.num}</span><item.icon size={22} strokeWidth={1.6} /><strong>{item.label}</strong><span className="feature-caption">{item.caption}</span><ArrowUpRight size={12} className="feature-arrow" />
        </button>)}</nav>
        <div className="panel-footer"><span><span className={`save-dot ${storageOkay ? '' : 'warning'}`} />{storageOkay ? 'TU COMPAÑERO, SIEMPRE CONTIGO' : 'GUARDADO LOCAL NO DISPONIBLE'}</span><span>V.01</span></div>
      </aside>
    </main>

    <footer className="footer"><div className="robot-activity"><span className="activity-dot" /><span>{actionMessages[action]}</span>{busy && <div className="action-progress"><span style={{ width: `${progress}%` }} /></div>}</div>
      <div className="footer-actions"><button onClick={() => changeSetting('sound', !settings.sound)} aria-label={settings.sound ? 'Silenciar sonido' : 'Activar sonido'}>{settings.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button><button onClick={busy ? stop : () => perform('dance')} aria-label={busy ? 'Pausar acción' : 'Hacer bailar a WEE'}>{busy ? <Pause size={13} /> : <Play size={13} />}</button><span>HECHO DE CÓDIGO. LLENO DE VIDA.</span><ArrowDown size={13} /></div>
    </footer>
    {toast && <div className="toast" role="status"><Sparkles size={16} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Cerrar notificación"><X size={15} /></button></div>}
    {(help || resetOpen || selectedCollectible) && <div className="modal-backdrop" onClick={() => { setHelp(false); setResetOpen(false); setSelectedItem(null); }}><ModalClose onClose={() => { setHelp(false); setResetOpen(false); setSelectedItem(null); }}>
      {help && <><span className="eyebrow">BIENVENIDO AL LABORATORIO</span><h2>Hola, soy WEE.</h2><p>Un compañero construido con código, listo para compartir pequeñas aventuras contigo.</p><div className="help-steps"><p><MousePointer2 size={18} /><span><strong>Conóceme desde todos los ángulos.</strong>Arrastra para girar, usa la rueda para acercarte y toca mis ojos para saludar.</span></p><p><Compass size={18} /><span><strong>Sal a descubrir.</strong>Cada exploración revela un nuevo objeto y consume un poco de energía.</span></p><p><Heart size={18} /><span><strong>Cuida de lo que importa.</strong>Recarga mi batería, riega la planta o invítame a bailar. Todo se guarda aquí.</span></p></div><button className="primary-button" onClick={() => setHelp(false)}>Vamos a conocernos <ArrowRight size={16} /></button></>}
      {resetOpen && <><span className="eyebrow">UN NUEVO COMIENZO</span><h2>¿Volvemos al principio?</h2><p>Se borrarán tus colores, tesoros y cuidados guardados en este navegador. WEE volverá a su estado original.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setResetOpen(false)}>Seguir explorando</button><button className="primary-button" onClick={reset}>Sí, empezar de nuevo</button></div></>}
      {selectedCollectible && <><div className="item-hero" style={{ color: selectedCollectible.color }}>{(() => { const Icon = objectIcons[selectedCollectible.icon]; return <Icon size={64} strokeWidth={1.2} />; })()}</div><span className="eyebrow">{selectedCollectible.type}</span><h2>{selectedCollectible.name}</h2><p>{selectedCollectible.description}</p>{selectedCollectible.id === 'seed' && <button className="primary-button" onClick={() => { setState(s => ({ ...s, plant: !s.plant })); setSelectedItem(null); }}>{state.plant ? 'Guardar la planta' : 'Equipar la planta'}<Sprout size={16} /></button>}<span className="item-collected"><Check size={13} /> EN TU COLECCIÓN</span></>}
    </ModalClose></div>}
  </div>;
}

function ModalClose({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
  return <div className="modal" ref={ref} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-label="Información de WEE" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={onClose} aria-label="Cerrar ventana"><X size={19} /></button>{children}</div>;
}
