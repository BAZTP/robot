import { expect, test } from '@playwright/test';

test('renders the procedural robot, personalizes it, persists settings and exports a photo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hazlo tuyo.' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.scene-loader')).toHaveCount(0, { timeout: 40_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/wee-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Acentos: Océano', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Acentos: Océano', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Acentos: Océano', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.scene-loader')).toHaveCount(0, { timeout: 40_000 });
  await page.getByRole('switch', { name: 'Cámara libre' }).click();
  await expect(page.getByRole('switch', { name: 'Cámara libre' })).toHaveAttribute('aria-checked', 'false');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar imagen', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('mi-wee.png');
  await download.saveAs('test-results/mi-wee.png');
  expect(errors).toEqual([]);
});

test('completes the northern route, charges and cares for the plant', async ({ page }) => {
  // This journey includes two real WebGL initializations and five timed
  // activities. CPU-only Chromium needs additional time for the full journey.
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: /01 Explorar/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Iniciar exploración' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar exploración' })).toBeEnabled({ timeout: 15_000 });
  }
  await expect(page.locator('.mission-tasks .complete')).toHaveCount(2);
  await page.getByRole('button', { name: /02 Colección/ }).click();
  await expect(page.locator('.collectible.unlocked')).toHaveCount(4);
  await page.getByRole('button', { name: 'Piedra lunar', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Un pequeño tesoro encontrado en el sector norte.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /03 Cuidados/ }).click();
  await page.getByRole('button', { name: /Recargar/ }).click();
  await expect(page.getByRole('button', { name: /Recargar/ })).toBeEnabled({ timeout: 12_000 });
  await expect(page.locator('.vital-card').first()).toContainText('100');
  await page.getByRole('button', { name: /Regar la planta/ }).click();
  await expect(page.getByRole('button', { name: /Regar la planta/ })).toBeEnabled({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /Regar la planta/ })).toContainText('1 MOMENTOS DE CUIDADO');
  await page.reload();
  await page.getByRole('button', { name: /02 Colección/ }).click();
  await expect(page.locator('.collectible.unlocked')).toHaveCount(4);
});

test('grows a garden, harvests seeds, unlocks a biome and keeps a diary', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.scene-loader')).toHaveCount(0, { timeout: 40_000 });
  await page.getByRole('button', { name: 'Cerrar novedad' }).click();
  await page.screenshot({ path: 'test-results/wee-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Mi jardín/ }).click();
  await expect(page.getByRole('heading', { name: 'Deja algo vivo.' })).toBeVisible();
  await page.getByRole('button', { name: 'Plantar una semilla', exact: true }).click();
  await expect(page.locator('.garden-summary')).toContainText('2');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Regar esta maceta', exact: true }).click();
    if (i < 2) await expect(page.getByRole('button', { name: 'Regar esta maceta', exact: true })).toBeEnabled({ timeout: 15_000 });
  }
  await expect(page.getByRole('button', { name: 'Recoger semillas', exact: true })).toBeEnabled({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Maceta 1', exact: true })).toContainText('En flor');
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 10_000 });
  await page.screenshot({ path: 'test-results/regreen-garden.png', fullPage: true });
  await page.getByRole('button', { name: 'Recoger semillas', exact: true }).click();
  await expect(page.locator('.garden-summary')).toContainText('4');
  await expect(page.getByRole('button', { name: 'Maceta 1', exact: true })).toContainText('MACETA VACÍA');
  await page.getByRole('button', { name: /01 Explorar/ }).click();
  await page.getByRole('button', { name: /Bosque de niebla/ }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/field-mist/);
  await page.getByRole('button', { name: 'Iniciar exploración' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar exploración' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Activar ciclo nocturno' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/scene-night/);
  await page.screenshot({ path: 'test-results/regreen-mist-night.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir diario' }).click();
  await expect(page.getByRole('dialog', { name: 'Diario de WEE' })).toContainText('Y un día, floreció');
  await page.getByRole('button', { name: 'Aventuras', exact: true }).click();
  await expect(page.locator('.diary-entries article')).toHaveCount(1);
  await expect(page.locator('.diary-entries')).toContainText('Aurora diminuta');
  await page.screenshot({ path: 'test-results/regreen-diary.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Mi jardín/ }).click();
  await expect(page.getByRole('button', { name: 'Helecho aurora', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('renames a companion, restores a backup and cancels an adventure without rewards', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: /04 Ajustes/ }).click();
  await page.getByLabel('¿CÓMO SE LLAMA TU COMPAÑERO?').fill('NOVA');
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  await expect(page.locator('.journey-chip')).toContainText('NOVA');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar progreso', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('wee-regreen.json');
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.getByRole('button', { name: 'Empezar de nuevo', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, empezar de nuevo' }).click();
  await expect(page.locator('.journey-chip')).toContainText('WEE');
  await page.getByLabel('Archivo de copia de WEE').setInputFiles(backupPath!);
  await expect(page.getByRole('dialog', { name: 'Restaurar copia de WEE' })).toContainText('NOVA');
  await page.getByRole('button', { name: 'Restaurar compañero', exact: true }).click();
  await expect(page.locator('.journey-chip')).toContainText('NOVA');
  await page.getByRole('button', { name: /01 Explorar/ }).click();
  await expect(page.getByRole('button', { name: /Bosque de niebla/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Iniciar exploración' }).click();
  await page.getByRole('button', { name: 'Pausar acción', exact: true }).click();
  await expect(page.locator('.journey-chip')).toContainText('0 XP');
  await page.getByRole('button', { name: 'Abrir diario' }).click();
  await expect(page.getByRole('dialog')).toContainText('La primera página está por escribir.');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('.journey-chip')).toContainText('NOVA');
});

test('mobile layout, help, pause and reset work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.scene-loader')).toHaveCount(0, { timeout: 40_000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'test-results/wee-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Cómo funciona' }).click();
  await expect(page.getByRole('dialog')).toContainText('Hola, soy WEE.');
  await page.getByRole('button', { name: 'Vamos a conocernos' }).click();
  await page.getByRole('button', { name: /Saluda a WEE/ }).click();
  await page.getByRole('button', { name: 'Pausar acción', exact: true }).click();
  await expect(page.getByRole('button', { name: /Saluda a WEE/ })).toBeEnabled();
  await page.getByRole('button', { name: /04 Ajustes/ }).click();
  await page.getByRole('switch', { name: 'Movimiento reducido' }).click();
  await expect(page.getByRole('switch', { name: 'Movimiento reducido' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Empezar de nuevo', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Se borrarán tus colores');
  await page.getByRole('button', { name: 'Sí, empezar de nuevo' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Movimiento reducido' })).toHaveAttribute('aria-checked', 'false');
});
