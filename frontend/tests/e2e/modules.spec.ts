import { test, expect, Page } from '@playwright/test';

const MOCK_USER = { id: '1', email: 'test@hoptolt.com', username: 'testuser', fullName: 'Test User', activeGalponId: 1, role: 'owner', createdAt: new Date().toISOString(), permissions: [] };

async function mockApi(page: Page) {
  await page.route('**/api/auth/resolve-email*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: 'test@hoptolt.com' }) });
  });
  await page.route('**/auth/v1/token*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh',
        user: { id: '1', email: 'test@hoptolt.com', user_metadata: { fullName: 'Test User', username: 'testuser' } }
      })
    });
  });
  await page.route('**/api/auth/sync-profile', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_USER }) });
  });
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_USER }) });
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
  await page.goto('/login');
  await page.waitForSelector('#identifier', { timeout: 10000 });
  await page.locator('#identifier').fill('testuser');
  await page.locator('#password').fill('Test123!@#');
  await page.locator('#btn-login').click();
  await page.waitForURL('/dashboard', { timeout: 20000 });
}

async function setup(page: Page) {
  await mockApi(page);
  await login(page);
}

test.describe('Modules', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('cages list page renders', async ({ page }) => {
    await page.route('**/api/cages**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, cages: [{ number: 1, name: 'Jaula 1' }, { number: 2, name: 'Jaula 2' }] }) });
    });
    await page.goto('/dashboard/cages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/cages/);
  });

  test('rabbits list page renders', async ({ page }) => {
    await page.route('**/api/rabbits**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, rabbits: [{ code: 'RBT-001', name: 'Conejo 1' }, { code: 'RBT-002', name: 'Conejo 2' }] }) });
    });
    await page.goto('/dashboard/rabbits');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/rabbits/);
  });

  test('races list page renders', async ({ page }) => {
    await page.route('**/api/races**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, races: [{ id: 1, name: 'Neozelandés' }] }) });
    });
    await page.goto('/dashboard/races');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/races/);
  });

  test('reproduction page renders', async ({ page }) => {
    await page.route('**/api/reproductions**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, reproductions: [] }) });
    });
    await page.goto('/dashboard/reproduction');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/reproduction/);
  });

  test('feeding page renders', async ({ page }) => {
    await page.route('**/api/feedings**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, feedings: [] }) });
    });
    await page.goto('/dashboard/feeding');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/feeding/);
  });

  test('vaccination page renders', async ({ page }) => {
    await page.route('**/api/vaccinations**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, vaccinations: [] }) });
    });
    await page.goto('/dashboard/vaccination');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/vaccination/);
  });

  test('galpones page renders', async ({ page }) => {
    await page.route('**/api/galpones**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpones: [{ id: 1, name: 'Galpón Principal' }] }) });
    });
    await page.goto('/dashboard/galpones');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/galpones/);
  });

  test('mortality page renders', async ({ page }) => {
    await page.route('**/api/mortalities**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, mortalities: [] }) });
    });
    await page.goto('/dashboard/mortality');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/mortality/);
  });

  test('deworming page renders', async ({ page }) => {
    await page.route('**/api/dewormings**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, dewormings: [] }) });
    });
    await page.goto('/dashboard/deworming');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/deworming/);
  });

  test('cleaning page renders', async ({ page }) => {
    await page.route('**/api/cleanings**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, cleanings: [] }) });
    });
    await page.goto('/dashboard/cleaning');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/cleaning/);
  });

  test('assignments page renders', async ({ page }) => {
    await page.route('**/api/assignments**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, assignments: [] }) });
    });
    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/assignments/);
  });

  test('genealogy page renders', async ({ page }) => {
    await page.route('**/api/genealogy**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, genealogy: null }) });
    });
    await page.goto('/dashboard/genealogy');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/genealogy/);
  });

  test('users page renders', async ({ page }) => {
    await page.route('**/api/farm-members**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, members: [] }) });
    });
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/users/);
  });
});
