import { test, expect, Page } from '@playwright/test';

async function mockApi(page: Page) {
  // Fallback genérico para atrapar cualquier petición a la API que no esté mockeada más abajo.
  // Como Playwright evalúa las rutas registradas del final hacia el principio,
  // esta regla (al estar al principio) actuará como red de seguridad.
  // Evita que peticiones no mockeadas lleguen al backend real, devuelvan 401 y fuercen un logout en api.ts.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fallback: true, data: [] }) });
  });

  await page.route('**/api/auth/resolve-email*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: 'test@hoptolt.com' }) });
  });
  await page.route('**/auth/v1/token*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QGhvcHRvbHQuY29tIiwiZXhwIjo5OTk5OTk5OTk5fQ.fake',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh',
        user: { id: '1', email: 'test@hoptolt.com', user_metadata: { fullName: 'Test User', username: 'testuser' } }
      })
    });
  });
  await page.route('**/auth/v1/user*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: '1', email: 'test@hoptolt.com' })
    });
  });
  await page.route('**/api/auth/sync-profile', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString() } }) });
  });
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString(), permissions: [] } }) });
  });
  await page.route('**/api/galpones/active', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: { id: 1, name: 'Galpón Principal' } }) });
  });
  await page.route('**/api/galpones/*/stats', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, stats: { totalCages: 10, totalRabbits: 45, totalRaces: 5, totalAssignments: 30 } }) });
  });
  await page.route('**/api/invitations**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, invitations: [] }) });
  });
  await page.route('**/api/notifications**', async (route) => {
    const url = route.request().url();
    if (url.includes('unread-count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });
  await page.route('**/api/reproductions/calendar*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, calendar: {} }) });
  });
}

async function login(page: Page) {
  // El e2e_bypass hace que estemos autenticados automáticamente.
  // Vamos directo al dashboard para evitar la condición de carrera con el formulario de login.
  await page.goto('/dashboard');
  await page.waitForURL('**/dashboard*', { timeout: 20000 });
}

test.describe('Dashboard', () => {
  test('shows stats cards on dashboard', async ({ page }) => {
    await page.context().addCookies([{ name: 'e2e_bypass', value: 'true', url: 'http://localhost:3000' }]);
    await mockApi(page);
    await login(page);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Total Jaulas')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Conejos')).toBeVisible();
    await expect(page.locator('text=Razas Registradas')).toBeVisible();
    await expect(page.locator('text=Asignaciones')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await page.context().addCookies([{ name: 'e2e_bypass', value: 'true', url: 'http://localhost:3000' }]);
    await mockApi(page);
    await login(page);
    await page.waitForLoadState('load');

    await expect(page.locator('text=Inicio')).toBeVisible();
    await expect(page.locator('text=Galpones')).toBeVisible();
    await expect(page.locator('text=Reportes')).toBeVisible();
    await expect(page.locator('text=Equipo de Trabajo')).toBeVisible();
  });
});

test.describe('Navigation guard', () => {
  test('redirects to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
