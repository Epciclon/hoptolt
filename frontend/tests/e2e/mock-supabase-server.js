const http = require('http');
const { URL } = require('url');

const PORT = 54321;
const USERS = new Map();
const SESSIONS = new Map();
let nextId = 1;

// Seed a default user for tests
(function seed() {
  const id = String(++nextId);
  USERS.set(id, {
    id,
    email: 'test@hoptolt.com',
    username: 'testuser',
    fullName: 'Test User',
    password: 'Test123!@#',
    confirmed: true,
  });
})();

function generateToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: String(nextId), exp: Date.now() + 86400000 })).toString('base64url');
  return `${header}.${payload}.fake_signature`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch {}
    const authHeader = req.headers['authorization'] || '';

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

    // POST /auth/v1/signup
    if (req.method === 'POST' && path === '/auth/v1/signup') {
      const id = String(++nextId);
      USERS.set(id, {
        id,
        email: data.email,
        username: data.options?.data?.username || 'user',
        fullName: data.options?.data?.fullName || 'User',
        password: data.password,
        confirmed: true,
      });
      const token = generateToken();
      SESSIONS.set(token, id);
      return json(200, {
        id,
        email: data.email,
        aud: 'authenticated',
        role: 'authenticated',
        user_metadata: { username: data.options?.data?.username, fullName: data.options?.data?.fullName },
        app_metadata: { provider: 'email' },
        confirmed_at: new Date().toISOString(),
        identities: [{ id, provider: 'email' }],
      });
    }

    // POST /auth/v1/token?grant_type=password
    if (req.method === 'POST' && path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      for (const [id, u] of USERS) {
        if (u.email === data.email && u.password === data.password) {
          const access_token = generateToken();
          const refresh_token = generateToken();
          SESSIONS.set(access_token, id);
          return json(200, {
            access_token,
            refresh_token,
            token_type: 'bearer',
            expires_in: 3600,
            user: {
              id,
              email: u.email,
              aud: 'authenticated',
              role: 'authenticated',
              user_metadata: { username: u.username, fullName: u.fullName },
            },
          });
        }
      }
      return json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }

    // GET /auth/v1/user
    if (req.method === 'GET' && path === '/auth/v1/user') {
      const token = authHeader.replace('Bearer ', '');
      const userId = SESSIONS.get(token);
      if (userId && USERS.has(userId)) {
        const u = USERS.get(userId);
        return json(200, {
          id: userId,
          email: u.email,
          aud: 'authenticated',
          role: 'authenticated',
          user_metadata: { username: u.username, fullName: u.fullName },
        });
      }
      return json(200, { id: null });
    }

    // POST /auth/v1/logout
    if (req.method === 'POST' && path === '/auth/v1/logout') {
      return json(200, {});
    }

    // PUT /auth/v1/user (updateUser)
    if (req.method === 'PUT' && path === '/auth/v1/user') {
      const token = authHeader.replace('Bearer ', '');
      const userId = SESSIONS.get(token);
      if (userId && USERS.has(userId)) {
        const u = USERS.get(userId);
        if (data.password) u.password = data.password;
        if (data.data) {
          u.username = data.data.username || u.username;
          u.fullName = data.data.fullName || u.fullName;
        }
        return json(200, {
          id: userId,
          email: u.email,
          user_metadata: { username: u.username, fullName: u.fullName },
        });
      }
      return json(401, { error: 'unauthorized' });
    }

    // Health check / any other
    return json(404, { error: 'not_found' });
  });
});

server.listen(PORT, () => {
  console.log(`Mock Supabase server running on http://localhost:${PORT}`);
});

module.exports = server;
