import { test, expect, Page } from '@playwright/test';

async function mockApi(page: Page) {
  await page.route('**/api/auth/resolve-email*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: 'test@hoptolt.com' }) });
  });
  await page.route('**/api/auth/sync-profile', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString() } }) });
  });
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString(), permissions: [] } }) });
  });
  await page.route('**/api/galpones/active', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: { id: 1, name: 'Galpón Principal', description: 'Galpón de prueba', createdAt: new Date().toISOString() } }) });
  });
  await page.route('**/api/galpones/*/stats', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, stats: { totalCages: 10, totalRabbits: 45, totalRaces: 5, totalAssignments: 30 } }) });
  });
  await page.route('**/api/galpones*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: { id: 1, name: 'Galpón Principal' } }) });
  });
  await page.route('**/api/invitations**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, invitations: [] }) });
  });
  await page.route('**/api/notifications**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notifications: [] }) });
  });
  await page.route('**/api/reproductions/calendar*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, events: [] }) });
  });
}

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('#identifier');
  await page.locator('#identifier').fill('testuser');
  await page.locator('#password').fill('Test123!@#');
  await page.locator('#btn-login').click();
}

test.describe('Dashboard', () => {
  test('shows stats cards on dashboard', async ({ page }) => {
    await mockApi(page);
    await login(page);

    await page.waitForURL('/dashboard', { timeout: 15000 });

    await expect(page.locator('text=Total Jaulas')).toBeVisible();
    await expect(page.locator('text=Total Conejos')).toBeVisible();
    await expect(page.locator('text=Razas Registradas')).toBeVisible();
    await expect(page.locator('text=Asignaciones')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await mockApi(page);
    await login(page);

    await page.waitForURL('/dashboard', { timeout: 15000 });

    await expect(page.locator('text=Inicio')).toBeVisible();
    await expect(page.locator('text=Galpones')).toBeVisible();
    await expect(page.locator('text=Reportes')).toBeVisible();
    await expect(page.locator('text=Equipo de Trabajo')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('redirects to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
