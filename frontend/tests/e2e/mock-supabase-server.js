const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 54321;
const USERS = new Map();
const SESSIONS = new Map();
let nextId = 1;

function seed() {
  const id = String(++nextId);
  USERS.set(id, {
    id, email: 'test@hoptolt.com', username: 'testuser',
    fullName: 'Test User', password: 'Test123!@#', confirmed: true,
  });
}
seed();

function generateToken() {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ sub: String(nextId), exp: Date.now() + 86400000 })).toString('base64url');
  return `${h}.${p}.fake_sig`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch {}
    const auth = req.headers['authorization'] || '';

    const json = (code, payload) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'OPTIONS') return json(204, '');

    // GET /auth/v1/settings — called by Supabase client on init
    if (path === '/auth/v1/settings') {
      return json(200, {
        disable_signup: false, mailer_autoconfirm: true,
        external: { email: { enabled: true } },
      });
    }

    // POST /auth/v1/signup
    if (req.method === 'POST' && path === '/auth/v1/signup') {
      const id = String(++nextId);
      USERS.set(id, { id, email: data.email, username: data.options?.data?.username || 'user', fullName: data.options?.data?.fullName || 'User', password: data.password, confirmed: true });
      const token = generateToken();
      SESSIONS.set(token, id);
      return json(200, { id, email: data.email, aud: 'authenticated', role: 'authenticated', user_metadata: { username: data.options?.data?.username, fullName: data.options?.data?.fullName }, app_metadata: { provider: 'email' }, confirmed_at: new Date().toISOString(), identities: [{ id, provider: 'email' }] });
    }

    // POST /auth/v1/token?grant_type=password — login
    if (req.method === 'POST' && path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      for (const [id, u] of USERS) {
        if (u.email === data.email && u.password === data.password) {
          const at = generateToken();
          const rt = generateToken();
          SESSIONS.set(at, id);
          return json(200, { access_token: at, refresh_token: rt, token_type: 'bearer', expires_in: 3600, user: { id, email: u.email, aud: 'authenticated', role: 'authenticated', user_metadata: { username: u.username, fullName: u.fullName } } });
        }
      }
      return json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }

    // GET /auth/v1/user — called by middleware + client
    if (req.method === 'GET' && path === '/auth/v1/user') {
      const token = auth.replace('Bearer ', '');
      const userId = SESSIONS.get(token);
      if (userId && USERS.has(userId)) {
        const u = USERS.get(userId);
        return json(200, { id: userId, email: u.email, aud: 'authenticated', role: 'authenticated', user_metadata: { username: u.username, fullName: u.fullName } });
      }
      return json(200, { id: null });
    }

    // POST /auth/v1/logout
    if (req.method === 'POST' && path === '/auth/v1/logout') {
      return json(200, {});
    }

    // PUT /auth/v1/user (updateUser)
    if (req.method === 'PUT' && path === '/auth/v1/user') {
      const token = auth.replace('Bearer ', '');
      const userId = SESSIONS.get(token);
      if (userId && USERS.has(userId)) {
        const u = USERS.get(userId);
        if (data.password) u.password = data.password;
        if (data.data) { u.username = data.data.username || u.username; u.fullName = data.data.fullName || u.fullName; }
        return json(200, { id: userId, email: u.email, user_metadata: { username: u.username, fullName: u.fullName } });
      }
      return json(401, { error: 'unauthorized' });
    }

    // GET /auth/v1/create-session (custom, for tests)
    if (req.method === 'GET' && path === '/auth/v1/create-session') {
      const at = generateToken();
      const userId = '1';
      SESSIONS.set(at, userId);
      const u = USERS.get(userId);
      return json(200, {
        access_token: at, refresh_token: generateToken(),
        token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: userId, email: u.email, role: 'authenticated', aud: 'authenticated', user_metadata: { username: u.username, fullName: u.fullName } },
        cookie_name: `sb-localhost-auth-token`,
      });
    }

    return json(404, { error: 'not_found' });
  });
});

// WebSocket support for Supabase Realtime
server.on('upgrade', (req, socket) => {
  if (!req.url.startsWith('/realtime/')) {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const interval = setInterval(() => {
    try { socket.write(Buffer.from([0x89, 0x00])); } catch { clearInterval(interval); }
  }, 30000);
  socket.on('close', () => clearInterval(interval));
  socket.on('error', () => clearInterval(interval));
});

server.listen(PORT, () => {
  console.log(`Mock Supabase server running on http://localhost:${PORT}`);
});

module.exports = server;
