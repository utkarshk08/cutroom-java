// Optional live local smoke check. Creates two temporary test accounts.
// Run only against this edition's separate cutroom_learning database.
// Remove the reported test accounts afterwards; no real account is touched.
async (page) => {
  if (page.url() !== 'http://localhost:5174/register') throw new Error('Open a fresh local register page.');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const suffix = Date.now().toString();
  const email = `cutroom-smoke-${suffix}@example.invalid`;
  const secondEmail = `cutroom-smoke-second-${suffix}@example.invalid`;
  const password = await page.evaluate(() => crypto.randomUUID());
  await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Local smoke check');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.waitForURL('**/projects');
  // Keep the CLI smoke flow uninterrupted by the native project-name prompt.
  await page.evaluate(() => { window.prompt = () => 'Temporary MySQL smoke project'; });
  await page.getByRole('button', { name: '+ New project', exact: true }).click();
  await page.waitForURL('**/editor/*');
  const editorUrl = page.url();
  const projectId = Number(editorUrl.split('/').pop());
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 360;
    const context = canvas.getContext('2d');
    context.fillStyle = '#b7b5ef'; context.fillRect(0, 0, 240, 360);
    context.fillStyle = '#252238'; context.font = 'bold 28px sans-serif';
    context.fillText('MYSQL CHECK', 15, 160);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('.upload-label input').setInputFiles({ name: 'synthetic-poster.png', mimeType: 'image/png', buffer: Buffer.from(source, 'base64') });
  await page.locator('.library-piece').first().dblclick();
  await page.getByRole('button', { name: '+ Add text', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your words', exact: true }).fill('SAVED IN MYSQL');
  const savedResponse = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith(`/api/projects/${projectId}`));
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  const response = await savedResponse;
  check(response.status() === 200, 'Project save failed');
  const saved = await response.json();
  const design = JSON.parse(saved.designJson);
  check(design.pieces.length === 2 && design.pieces.every(piece => piece.placed), 'Photos and text should be saved');
  check(design.pieces.some(piece => piece.src?.startsWith('data:image/png;base64,')), 'Embedded image missing');
  await page.reload();
  await page.locator('.wall-piece').first().waitFor();
  check(await page.locator('.wall-piece').count() === 2, 'Reload did not restore pieces');
  await page.getByRole('link', { name: 'My projects', exact: true }).click();
  await page.getByRole('heading', { name: 'Temporary MySQL smoke project', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Open studio ↗', exact: true }).click();
  await page.locator('.wall-piece').first().waitFor();
  check(await page.locator('.wall-piece').count() === 2, 'Reopen did not restore pieces');
  // A stale browser session must not block the public login endpoint.
  await page.evaluate(() => sessionStorage.setItem('cutroom-learning-session', JSON.stringify({ token: 'expired-test-token' })));
  await page.goto('http://localhost:5174/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/projects');
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('cutroom-learning-session')).token);
  const second = await page.request.post('http://localhost:8081/api/auth/register', { data: { name: 'Second smoke account', email: secondEmail, password } });
  check(second.status() === 201, 'Second account could not register');
  const secondSession = await second.json();
  const denied = await page.request.get(`http://localhost:8081/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${secondSession.token}` } });
  check(denied.status() === 404, 'Other account could read project');
  const anonymous = await page.request.get('http://localhost:8081/api/projects');
  check(anonymous.status() === 401, 'Anonymous request was not blocked');
  const deletion = await page.request.delete(`http://localhost:8081/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
  check(deletion.status() === 204, 'Temporary project cleanup failed');
  const missing = await page.request.get(`http://localhost:8081/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
  check(missing.status() === 404, 'Deleted project still exists');
  await page.evaluate(() => sessionStorage.removeItem('cutroom-learning-session'));
  await page.goto('http://localhost:5174/register');
  check(errors.length === 0, 'Browser runtime errors occurred');
  return { register: true, saveImageAndText: true, refresh: true, reopen: true, staleTokenLogin: true, ownerIsolation: true, anonymousDenied: true, deleteProject: true, runtimeErrors: errors, cleanupAccounts: [email, secondEmail] };
}
