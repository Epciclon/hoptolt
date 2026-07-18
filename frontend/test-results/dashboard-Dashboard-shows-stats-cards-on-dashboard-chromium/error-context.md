# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> shows stats cards on dashboard
- Location: tests/e2e/dashboard.spec.ts:42:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Asignaciones')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Asignaciones')

```

```yaml
- img
- heading "500" [level=1]
- heading "Error del servidor" [level=2]
- paragraph: Ocurrió un error inesperado. Por favor intenta de nuevo o regresa al inicio.
- button "Reintentar":
  - img
  - text: Reintentar
- link "Ir al inicio":
  - /url: /dashboard
  - img
  - text: Ir al inicio
- img
- text: 4 errors
- button "Hide Errors":
  - img
```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test';
  2  | 
  3  | async function mockApi(page: Page) {
  4  |   await page.route('**/api/auth/resolve-email*', async route => {
  5  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: 'test@hoptolt.com' }) });
  6  |   });
  7  |   await page.route('**/api/auth/sync-profile', async route => {
  8  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString() } }) });
  9  |   });
  10 |   await page.route('**/api/auth/me', async route => {
  11 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString(), permissions: [] } }) });
  12 |   });
  13 |   await page.route('**/api/galpones/active', async route => {
  14 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: { id: 1, name: 'Galpón Principal', description: 'Galpón de prueba', createdAt: new Date().toISOString() } }) });
  15 |   });
  16 |   await page.route('**/api/galpones/*/stats', async route => {
  17 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, stats: { totalCages: 10, totalRabbits: 45, totalRaces: 5, totalAssignments: 30 } }) });
  18 |   });
  19 |   await page.route('**/api/galpones*', async route => {
  20 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: { id: 1, name: 'Galpón Principal' } }) });
  21 |   });
  22 |   await page.route('**/api/invitations**', async route => {
  23 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, invitations: [] }) });
  24 |   });
  25 |   await page.route('**/api/notifications**', async route => {
  26 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notifications: [] }) });
  27 |   });
  28 |   await page.route('**/api/reproductions/calendar*', async route => {
  29 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, events: [] }) });
  30 |   });
  31 | }
  32 | 
  33 | async function login(page: Page) {
  34 |   await page.goto('/login');
  35 |   await page.waitForSelector('#identifier');
  36 |   await page.locator('#identifier').fill('testuser');
  37 |   await page.locator('#password').fill('Test123!@#');
  38 |   await page.locator('#btn-login').click();
  39 | }
  40 | 
  41 | test.describe('Dashboard', () => {
  42 |   test('shows stats cards on dashboard', async ({ page }) => {
  43 |     await mockApi(page);
  44 |     await login(page);
  45 | 
  46 |     await page.waitForURL('/dashboard', { timeout: 15000 });
  47 | 
  48 |     await expect(page.locator('text=Total Jaulas')).toBeVisible();
  49 |     await expect(page.locator('text=Total Conejos')).toBeVisible();
  50 |     await expect(page.locator('text=Razas Registradas')).toBeVisible();
> 51 |     await expect(page.locator('text=Asignaciones')).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  52 |   });
  53 | 
  54 |   test('sidebar navigation is visible', async ({ page }) => {
  55 |     await mockApi(page);
  56 |     await login(page);
  57 | 
  58 |     await page.waitForURL('/dashboard', { timeout: 15000 });
  59 | 
  60 |     await expect(page.locator('text=Inicio')).toBeVisible();
  61 |     await expect(page.locator('text=Galpones')).toBeVisible();
  62 |     await expect(page.locator('text=Reportes')).toBeVisible();
  63 |     await expect(page.locator('text=Equipo de Trabajo')).toBeVisible();
  64 |   });
  65 | });
  66 | 
  67 | test.describe('Navigation', () => {
  68 |   test('redirects to login when accessing dashboard without auth', async ({ page }) => {
  69 |     await page.goto('/dashboard');
  70 |     await page.waitForURL(/\/login/, { timeout: 10000 });
  71 |     expect(page.url()).toContain('/login');
  72 |   });
  73 | });
  74 | 
```