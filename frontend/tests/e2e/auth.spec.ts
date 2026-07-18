import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login form with all elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
    await expect(page.locator('label[for="identifier"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.locator('#identifier')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#btn-login')).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toHaveText('Regístrate aquí');
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.locator('#btn-login').click();
    await expect(page.locator('text=El usuario o correo es obligatorio.')).toBeVisible();
    await expect(page.locator('text=La contraseña debe tener al menos 6 caracteres.')).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.locator('#identifier').fill('testuser');
    await page.locator('#password').fill('123');
    await page.locator('#btn-login').click();
    await expect(page.locator('text=La contraseña debe tener al menos 6 caracteres.')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.locator('button[aria-label="Mostrar contraseña"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.locator('button[aria-label="Ocultar contraseña"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('navigates to register page', async ({ page }) => {
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: 'Crear Cuenta' })).toBeVisible();
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders register form with all elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Crear Cuenta' })).toBeVisible();
    await expect(page.locator('label[for="fullName"]')).toBeVisible();
    await expect(page.locator('label[for="username"]')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
    await expect(page.locator('#btn-register')).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toHaveText('Inicia Sesión');
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.locator('#btn-register').click();
    await expect(page.locator('text=El nombre es obligatorio')).toBeVisible();
    await expect(page.locator('text=Mínimo 4 caracteres')).toBeVisible();
    await expect(page.locator('text=Ingresa un correo válido')).toBeVisible();
    await expect(page.locator('text=Mínimo 6 caracteres')).toBeVisible();
  });

  test('validates password must have special character', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#username').fill('testuser');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#confirmPassword').fill('abcdef');
    await page.locator('#password').fill('abcdef');
    await page.locator('#btn-register').click();
    await expect(page.locator('text=Debe contener al menos un carácter especial')).toBeVisible();
  });

  test('validates password confirmation mismatch', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#username').fill('testuser');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('Test123!@#');
    await page.locator('#confirmPassword').fill('Different123!@#');
    await page.locator('#btn-register').click();
    await expect(page.locator('text=Las contraseñas no coinciden')).toBeVisible();
  });

  test('validates username only allows word characters', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#username').fill('user name!');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('Test123!@#');
    await page.locator('#confirmPassword').fill('Test123!@#');
    await page.locator('#btn-register').click();
    await expect(page.locator('text=Solo letras, números y guión bajo')).toBeVisible();
  });

  test('navigates to login page', async ({ page }) => {
    await page.locator('a[href="/login"]').click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('shows 404 page for unknown routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-route');
    expect(response?.status()).toBe(404);
  });
});
