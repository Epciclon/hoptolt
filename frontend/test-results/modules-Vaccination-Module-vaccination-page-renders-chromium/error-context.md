# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: modules.spec.ts >> Vaccination Module >> vaccination page renders
- Location: tests/e2e/modules.spec.ts:198:7

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for locator('#btn-login')
    - locator resolved to <button type="submit" id="btn-login" class="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-4 relative overflow-hidden">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting 500ms

```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | const MOCK_USER = {
  4   |   id: '1',
  5   |   email: 'test@hoptolt.com',
  6   |   username: 'testuser',
  7   |   fullName: 'Test User',
  8   |   activeGalponId: 1,
  9   |   role: 'owner',
  10  |   createdAt: new Date().toISOString(),
  11  |   permissions: [],
  12  | };
  13  | 
  14  | const MOCK_GALPON = {
  15  |   id: 1,
  16  |   name: 'Galpón Principal',
  17  |   description: 'Galpón de prueba',
  18  |   createdAt: new Date().toISOString(),
  19  | };
  20  | 
  21  | async function mockApi(page: Page) {
  22  |   await page.route('**/api/auth/resolve-email*', async route => {
  23  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: 'test@hoptolt.com' }) });
  24  |   });
  25  |   await page.route('**/api/auth/sync-profile', async route => {
  26  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_USER }) });
  27  |   });
  28  |   await page.route('**/api/auth/me', async route => {
  29  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_USER }) });
  30  |   });
  31  |   await page.route('**/api/galpones/active', async route => {
  32  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, galpon: MOCK_GALPON }) });
  33  |   });
  34  |   await page.route('**/api/galpones/*/stats', async route => {
  35  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, stats: { totalCages: 10, totalRabbits: 45, totalRaces: 5, totalAssignments: 30 } }) });
  36  |   });
  37  |   await page.route('**/api/invitations**', async route => {
  38  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, invitations: [] }) });
  39  |   });
  40  |   await page.route('**/api/notifications**', async route => {
  41  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notifications: [] }) });
  42  |   });
  43  | }
  44  | 
  45  | async function login(page: Page) {
  46  |   await page.goto('/login');
  47  |   await page.waitForSelector('#identifier');
  48  |   await page.locator('#identifier').fill('testuser');
  49  |   await page.locator('#password').fill('Test123!@#');
> 50  |   await page.locator('#btn-login').click();
      |                                    ^ Error: locator.click: Test ended.
  51  |   await page.waitForURL('/dashboard', { timeout: 15000 });
  52  | }
  53  | 
  54  | async function navigateTo(page: Page, path: string) {
  55  |   await page.goto(path);
  56  |   await page.waitForLoadState('networkidle');
  57  | }
  58  | 
  59  | test.describe('Cages Module', () => {
  60  |   test.beforeEach(async ({ page }) => {
  61  |     await mockApi(page);
  62  |     await login(page);
  63  |   });
  64  | 
  65  |   test('cages list page renders', async ({ page }) => {
  66  |     await page.route('**/api/galpones/*/cages**', async route => {
  67  |       await route.fulfill({
  68  |         status: 200,
  69  |         contentType: 'application/json',
  70  |         body: JSON.stringify({
  71  |           success: true,
  72  |           cages: [
  73  |             { number: 1, name: 'Jaula 1', capacity: 4, location: 'Fila A', status: 'active' },
  74  |             { number: 2, name: 'Jaula 2', capacity: 4, location: 'Fila A', status: 'active' },
  75  |           ],
  76  |         }),
  77  |       });
  78  |     });
  79  | 
  80  |     await navigateTo(page, '/dashboard/cages');
  81  |     await expect(page).toHaveURL(/\/dashboard\/cages/);
  82  |   });
  83  | 
  84  |   test('cages register page renders', async ({ page }) => {
  85  |     await navigateTo(page, '/dashboard/cages/register');
  86  |     await expect(page).toHaveURL(/\/dashboard\/cages\/register/);
  87  |   });
  88  | });
  89  | 
  90  | test.describe('Rabbits Module', () => {
  91  |   test.beforeEach(async ({ page }) => {
  92  |     await mockApi(page);
  93  |     await login(page);
  94  |   });
  95  | 
  96  |   test('rabbits list page renders', async ({ page }) => {
  97  |     await page.route('**/api/rabbits**', async route => {
  98  |       await route.fulfill({
  99  |         status: 200,
  100 |         contentType: 'application/json',
  101 |         body: JSON.stringify({
  102 |           success: true,
  103 |           rabbits: [
  104 |             { code: 'RBT-001', name: 'Conejo 1', race: 'Neozelandés', gender: 'male', status: 'active' },
  105 |             { code: 'RBT-002', name: 'Conejo 2', race: 'Californiano', gender: 'female', status: 'active' },
  106 |           ],
  107 |         }),
  108 |       });
  109 |     });
  110 | 
  111 |     await navigateTo(page, '/dashboard/rabbits');
  112 |     await expect(page).toHaveURL(/\/dashboard\/rabbits/);
  113 |   });
  114 | 
  115 |   test('rabbits register page renders', async ({ page }) => {
  116 |     await navigateTo(page, '/dashboard/rabbits/register');
  117 |     await expect(page).toHaveURL(/\/dashboard\/rabbits\/register/);
  118 |   });
  119 | });
  120 | 
  121 | test.describe('Races Module', () => {
  122 |   test.beforeEach(async ({ page }) => {
  123 |     await mockApi(page);
  124 |     await login(page);
  125 |   });
  126 | 
  127 |   test('races list page renders', async ({ page }) => {
  128 |     await page.route('**/api/races**', async route => {
  129 |       await route.fulfill({
  130 |         status: 200,
  131 |         contentType: 'application/json',
  132 |         body: JSON.stringify({
  133 |           success: true,
  134 |           races: [
  135 |             { id: 1, name: 'Neozelandés', description: 'Raza de conejo', status: 'active' },
  136 |             { id: 2, name: 'Californiano', description: 'Raza de conejo', status: 'active' },
  137 |           ],
  138 |         }),
  139 |       });
  140 |     });
  141 | 
  142 |     await navigateTo(page, '/dashboard/races');
  143 |     await expect(page).toHaveURL(/\/dashboard\/races/);
  144 |   });
  145 | 
  146 |   test('races register page renders', async ({ page }) => {
  147 |     await navigateTo(page, '/dashboard/races/register');
  148 |     await expect(page).toHaveURL(/\/dashboard\/races\/register/);
  149 |   });
  150 | });
```