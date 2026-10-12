# WEE / RE:GREEN — pequeñas huellas, nuevos mundos

Una estación de regeneración con identidad propia: acompaña a un robot 3D, recupera semillas en tres pequeños mundos y cultiva un jardín orbital. La interfaz está en español y se adapta a escritorio y móvil. Todos los modelos, plantas y escenarios se generan en código.

## Empezar

Requiere Node.js 22.12 o superior (validado con Node.js 24) y un navegador con WebGL.

```bash
cd /workspace/robot
npm ci --cache /workspace/.npm-cache
npm run dev
```

Vite escucha en todas las interfaces, puerto 5173. Para generar la versión de producción:

```bash
npm run build
npm run preview
```

`dist/` puede publicarse en cualquier alojamiento estático. La aplicación no necesita servicios externos ni credenciales. Las fuentes y todos los recursos se sirven localmente.

## Publicar en GitHub Pages

El flujo `.github/workflows/pages.yml` instala las dependencias fijadas, ejecuta las pruebas, compila y publica `dist/` al subir cambios a `main`. También puede ejecutarse desde la pestaña Actions con **Run workflow**.

En GitHub, configura **Settings → Pages → Build and deployment → Source → GitHub Actions**. Tras una ejecución correcta, la dirección del proyecto es `https://baztp.github.io/robot/`. Esa dirección solo estará disponible después del despliegue; crear el flujo no publica por sí solo el sitio.

La compilación usa rutas relativas para que los recursos funcionen tanto en la subcarpeta de GitHub Pages como en la raíz de otros alojamientos. La publicación requiere permiso de escritura en el repositorio y acceso a GitHub Pages; un repositorio privado puede necesitar un plan que incluya Pages.

## Funciones

- Robot construido íntegramente en código: ojos con lentes y luces, carcasa, brazos articulados, orugas, tornillos y una planta procedural.
- Poses calculadas a partir del tiempo mediante funciones matemáticas, sin clips de animación ni modelos descargados.
- Cinco colores de acentos, tres carcasas, cuatro colores de luces y cámara orbital con zoom.
- Tres escenarios: sector norte, bosque de niebla (20 XP) y desierto solar (45 XP). Cada exploración consume energía, entrega una semilla y experiencia, y descubre un objeto propio de la zona.
- Ocho tesoros, cuatro niveles de compañero y especies que se desbloquean al encontrar musgo en el bosque o un cristal en el desierto.
- Jardín de tres macetas que también se seleccionan tocándolas en la escena 3D. Plantar cuesta una semilla; tres riegos llevan la planta de semilla a floración. Cosechar entrega dos semillas, 18 XP y 10 de energía, y libera la maceta para otro ciclo.
- Diario con los últimos 40 recuerdos de exploración, jardinería y cuidados, con filtros por actividad.
- Expresiones según felicidad y energía, parpadeo procedural, descanso, y ciclo nocturno con iluminación y luciérnagas.
- Recarga, riego, saludo, baile y descanso; energía y felicidad con límites de 0 a 100. Una acción cancelada no entrega recompensas.
- Nombre propio del compañero, copias de progreso en JSON e importación con confirmación antes de reemplazar datos.
- Modo de demostración, sonidos sintetizados con Web Audio, movimiento reducido y reinicio con confirmación.
- Exportación de una foto PNG, pantalla completa, ayuda accesible y modales con navegación por teclado.
- Guardado de preferencias y progreso en `localStorage`, con validación y recuperación ante datos dañados. Si el almacenamiento está bloqueado, la aplicación sigue funcionando durante la sesión y lo indica en el panel.

Los datos de la primera versión se conservan: se reutiliza la misma clave de almacenamiento y se añaden automáticamente el jardín y la experiencia equivalente a los descubrimientos y cuidados anteriores. Las copias JSON se validan y tienen un tamaño máximo de 256 KiB.

## Tecnología y estructura

React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei, Lucide y CSS adaptable. Vitest prueba los cálculos y el almacenamiento; Playwright comprueba los flujos en un navegador real.

```text
src/App.tsx                     Interfaz y coordinación de actividades
src/components/RobotScene.tsx   Geometría, materiales, luces y cámara 3D
src/components/ProceduralHabitat.tsx  Escenarios, macetas y plantas 3D
src/components/FieldPanels.tsx  Jardín, rutas, diario y nivel
src/lib/motion.ts               Cálculo de poses y expresiones
src/lib/state.ts                Preferencias, inventario y almacenamiento
src/lib/progress.ts             Reglas de actividades, crecimiento y recompensas
src/lib/worlds.ts               Zonas, especies y niveles
src/styles.css                 Diseño y adaptación móvil
tests/e2e/lab.spec.ts           Pruebas del laboratorio
```

## Validación

```bash
npm test
npm run build
```

Para las pruebas de navegador, instala Chromium de Playwright una vez:

```bash
npx playwright install chromium
npm run test:e2e
```

En el entorno en la nube ya existe un Chromium del sistema; utilízalo sin descargar otro:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Las pruebas inician Vite si hace falta y guardan las capturas de escritorio, móvil, jardín, bosque nocturno y diario, así como la foto exportada, en `test-results/` (ignorado por Git). Los recorridos verifican también cosecha, desbloqueos, copias y cancelación sin recompensas. En máquinas sin GPU, ejecuta la compilación y las pruebas de navegador de forma secuencial.

## Alcance

Las misiones y necesidades del robot son una simulación interactiva; no controlan hardware físico. El progreso se guarda en el navegador actual. Para moverlo a otro dispositivo, guarda una copia desde Ajustes e impórtala allí. Borrar los datos del navegador elimina el progreso que no hayas respaldado.

## Entorno en la nube

Usa este checkout existente en `/workspace/robot`; las tareas ya están aisladas y no requieren crear worktrees. Los procesos de Vite deben iniciarse de nuevo al abrir una máquina restaurada. La instalación y las instrucciones de inicio se guardan también en la configuración del entorno para revisión y publicación.
