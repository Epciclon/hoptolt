import { test, expect, Page } from '@playwright/test';

const MOCK_USER = {
  id: '1',
  email: 'test@hoptolt.com',
  username: 'testuser',
  fullName: 'Test User',
  activeGalponId: 1,
  role: 'owner',
  createdAt: new Date().toISOString(),
  permissions: [],
};

const MOCK_GALPON = {
  id: 1,
  name: 'Galpón Principal',
  description: 'Galpón de prueba',
  createdAt: new Date().toISOString(),
};

async function mockApi(page: Page) {
  await page.route('**/api/auth/resolve-email*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: 'test@hoptolt.com' }) });
  });
  await page.route('**/api/auth/sync-profile', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_USER }) });
  });
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_USER }) });
  });
  await page.route('**/api/galpones/active', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: MOCK_GALPON }) });
  });
  await page.route('**/api/galpones/*/stats', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, stats: { totalCages: 10, totalRabbits: 45, totalRaces: 5, totalAssignments: 30 } }) });
  });
  await page.route('**/api/invitations**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, invitations: [] }) });
  });
  await page.route('**/api/notifications**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notifications: [] }) });
  });
}

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('#identifier');
  await page.locator('#identifier').fill('testuser');
  await page.locator('#password').fill('Test123!@#');
  await page.locator('#btn-login').click();
  await page.waitForURL('/dashboard', { timeout: 15000 });
}

async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('Cages Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('cages list page renders', async ({ page }) => {
    await page.route('**/api/galpones/*/cages**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          cages: [
            { number: 1, name: 'Jaula 1', capacity: 4, location: 'Fila A', status: 'active' },
            { number: 2, name: 'Jaula 2', capacity: 4, location: 'Fila A', status: 'active' },
          ],
        }),
      });
    });

    await navigateTo(page, '/dashboard/cages');
    await expect(page).toHaveURL(/\/dashboard\/cages/);
  });

  test('cages register page renders', async ({ page }) => {
    await navigateTo(page, '/dashboard/cages/register');
    await expect(page).toHaveURL(/\/dashboard\/cages\/register/);
  });
});

test.describe('Rabbits Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('rabbits list page renders', async ({ page }) => {
    await page.route('**/api/rabbits**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rabbits: [
            { code: 'RBT-001', name: 'Conejo 1', race: 'Neozelandés', gender: 'male', status: 'active' },
            { code: 'RBT-002', name: 'Conejo 2', race: 'Californiano', gender: 'female', status: 'active' },
          ],
        }),
      });
    });

    await navigateTo(page, '/dashboard/rabbits');
    await expect(page).toHaveURL(/\/dashboard\/rabbits/);
  });

  test('rabbits register page renders', async ({ page }) => {
    await navigateTo(page, '/dashboard/rabbits/register');
    await expect(page).toHaveURL(/\/dashboard\/rabbits\/register/);
  });
});

test.describe('Races Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('races list page renders', async ({ page }) => {
    await page.route('**/api/races**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          races: [
            { id: 1, name: 'Neozelandés', description: 'Raza de conejo', status: 'active' },
            { id: 2, name: 'Californiano', description: 'Raza de conejo', status: 'active' },
          ],
        }),
      });
    });

    await navigateTo(page, '/dashboard/races');
    await expect(page).toHaveURL(/\/dashboard\/races/);
  });

  test('races register page renders', async ({ page }) => {
    await navigateTo(page, '/dashboard/races/register');
    await expect(page).toHaveURL(/\/dashboard\/races\/register/);
  });
});

test.describe('Reproduction Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('reproduction page renders', async ({ page }) => {
    await page.route('**/api/reproductions**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, reproductions: [] }),
      });
    });

    await navigateTo(page, '/dashboard/reproduction');
    await expect(page).toHaveURL(/\/dashboard\/reproduction/);
  });
});

test.describe('Feeding Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('feeding page renders', async ({ page }) => {
    await page.route('**/api/feedings**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, feedings: [] }),
      });
    });

    await navigateTo(page, '/dashboard/feeding');
    await expect(page).toHaveURL(/\/dashboard\/feeding/);
  });
});

test.describe('Vaccination Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('vaccination page renders', async ({ page }) => {
    await page.route('**/api/vaccinations**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, vaccinations: [] }),
      });
    });

    await navigateTo(page, '/dashboard/vaccination');
    await expect(page).toHaveURL(/\/dashboard\/vaccination/);
  });
});

test.describe('Other Modules', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await login(page);
  });

  test('deworming page renders', async ({ page }) => {
    await page.route('**/api/dewormings**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, dewormings: [] }) });
    });
    await navigateTo(page, '/dashboard/deworming');
    await expect(page).toHaveURL(/\/dashboard\/deworming/);
  });

  test('cleaning page renders', async ({ page }) => {
    await page.route('**/api/cleanings**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, cleanings: [] }) });
    });
    await navigateTo(page, '/dashboard/cleaning');
    await expect(page).toHaveURL(/\/dashboard\/cleaning/);
  });

  test('mortality page renders', async ({ page }) => {
    await page.route('**/api/mortalities**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, mortalities: [] }) });
    });
    await navigateTo(page, '/dashboard/mortality');
    await expect(page).toHaveURL(/\/dashboard\/mortality/);
  });

  test('galpones page renders', async ({ page }) => {
    await page.route('**/api/galpones**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpones: [MOCK_GALPON] }) });
    });
    await navigateTo(page, '/dashboard/galpones');
    await expect(page).toHaveURL(/\/dashboard\/galpones/);
  });

  test('genealogy page renders', async ({ page }) => {
    await page.route('**/api/genealogy**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, genealogy: null }) });
    });
    await navigateTo(page, '/dashboard/genealogy');
    await expect(page).toHaveURL(/\/dashboard\/genealogy/);
  });

  test('users page renders', async ({ page }) => {
    await page.route('**/api/farm-members**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, members: [] }) });
    });
    await navigateTo(page, '/dashboard/users');
    await expect(page).toHaveURL(/\/dashboard\/users/);
  });

  test('settings page renders', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings');
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });

  test('assignments page renders', async ({ page }) => {
    await page.route('**/api/assignments**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, assignments: [] }) });
    });
    await navigateTo(page, '/dashboard/assignments');
    await expect(page).toHaveURL(/\/dashboard\/assignments/);
  });

  test('reportes page renders', async ({ page }) => {
    await navigateTo(page, '/dashboard/reportes');
    await expect(page).toHaveURL(/\/dashboard\/reportes/);
  });

  test('profile page renders', async ({ page }) => {
    await navigateTo(page, '/dashboard/profile');
    await expect(page).toHaveURL(/\/dashboard\/profile/);
  });

  test('notifications page renders', async ({ page }) => {
    await page.route('**/api/notifications**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notifications: [] }) });
    });
    await navigateTo(page, '/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications/);
  });
});
