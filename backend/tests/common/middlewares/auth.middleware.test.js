const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();

jest.mock('@supabase/supabase-js', () => {
  const mockClient = { auth: { getUser: mockGetUser, signInWithPassword: mockSignInWithPassword } };
  return { createClient: jest.fn(() => mockClient) };
});

jest.mock('../../../src/domain/models', () => ({
  Profile: { findByPk: jest.fn() }
}));

const ORIGINAL_SUPABASE_URL = process.env.SUPABASE_URL;
const ORIGINAL_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';

const { authenticate, clearCache } = require('../../../src/common/middlewares/auth.middleware');

afterAll(() => {
  if (ORIGINAL_SUPABASE_URL) {
    process.env.SUPABASE_URL = ORIGINAL_SUPABASE_URL;
  } else {
    delete process.env.SUPABASE_URL;
  }
  if (ORIGINAL_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = ORIGINAL_SUPABASE_ANON_KEY;
  } else {
    delete process.env.SUPABASE_ANON_KEY;
  }
});

describe('authenticate', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should return 401 when authorization header is missing', async () => {
    await authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('No autenticado'),
        statusCode: 401
      })
    );
  });

  it('should return 401 when authorization header does not start with Bearer', async () => {
    mockReq.headers.authorization = 'Basic some-token';

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('should return 401 when Bearer token is present but empty', async () => {
    mockReq.headers.authorization = 'Bearer ';
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('should return 401 when supabase.auth.getUser returns an error', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token';
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockGetUser).toHaveBeenCalledWith('invalid-token');
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Token inválido'),
        statusCode: 401
      })
    );
  });

  it('should return 401 when supabase.auth.getUser returns null user', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('should return 404 when user is authenticated but profile not found in DB', async () => {
    const fakeUser = { id: 'auth-user-123', email: 'test@test.com' };
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    const Profile = require('../../../src/domain/models').Profile;
    Profile.findByPk.mockResolvedValue(null);

    await authenticate(mockReq, mockRes, mockNext);

    expect(Profile.findByPk).toHaveBeenCalledWith('auth-user-123');
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Usuario no encontrado'),
        statusCode: 404
      })
    );
  });

  it('should set req.user and call next() on successful authentication', async () => {
    const fakeUser = { id: 'auth-user-123', email: 'test@test.com' };
    const fakeProfile = { id: 'auth-user-123', name: 'Test User', role: 'owner' };
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    const Profile = require('../../../src/domain/models').Profile;
    Profile.findByPk.mockResolvedValue(fakeProfile);

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockReq.user).toEqual(fakeProfile);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should call supabase.auth.getUser with the extracted token', async () => {
    const fakeUser = { id: 'auth-user-123' };
    const fakeProfile = { id: 'auth-user-123' };
    mockReq.headers.authorization = 'Bearer my-secret-token';
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    const Profile = require('../../../src/domain/models').Profile;
    Profile.findByPk.mockResolvedValue(fakeProfile);

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockGetUser).toHaveBeenCalledWith('my-secret-token');
  });

  it('should return 401 when header is present but empty string', async () => {
    mockReq.headers.authorization = '';

    await authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  describe('cache behavior', () => {
    it('should cache profile after first lookup and use cache on second call', async () => {
      const fakeUser = { id: 'cached-user-1' };
      const fakeProfile = { id: 'cached-user-1', name: 'Cached User' };
      mockReq.headers.authorization = 'Bearer token-123';
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
      const Profile = require('../../../src/domain/models').Profile;
      Profile.findByPk.mockResolvedValue(fakeProfile);

      await authenticate(mockReq, mockRes, mockNext);
      expect(Profile.findByPk).toHaveBeenCalledTimes(1);

      Profile.findByPk.mockClear();

      const req2 = { headers: { authorization: 'Bearer token-123' } };
      const next2 = jest.fn();

      await authenticate(req2, mockRes, next2);

      expect(Profile.findByPk).not.toHaveBeenCalled();
      expect(req2.user).toEqual(fakeProfile);
      expect(next2).toHaveBeenCalled();
    });

    it('should not use stale cache entries after TTL expiry', async () => {
      jest.useFakeTimers();
      const fakeUser = { id: 'ttl-user-1' };
      const fakeProfile = { id: 'ttl-user-1', name: 'Fresh Profile' };
      mockReq.headers.authorization = 'Bearer ttl-token';
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
      const Profile = require('../../../src/domain/models').Profile;
      Profile.findByPk.mockResolvedValue(fakeProfile);

      await authenticate(mockReq, mockRes, mockNext);
      expect(Profile.findByPk).toHaveBeenCalledTimes(1);

      Profile.findByPk.mockClear();

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      const req2 = { headers: { authorization: 'Bearer ttl-token' } };
      const next2 = jest.fn();
      Profile.findByPk.mockResolvedValue(fakeProfile);

      await authenticate(req2, mockRes, next2);

      expect(Profile.findByPk).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('clearCache removes profile from cache', async () => {
      const fakeUser = { id: 'clear-user-1' };
      const fakeProfile = { id: 'clear-user-1', name: 'To Clear' };
      mockReq.headers.authorization = 'Bearer clear-token';
      mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
      const Profile = require('../../../src/domain/models').Profile;
      Profile.findByPk.mockResolvedValue(fakeProfile);

      await authenticate(mockReq, mockRes, mockNext);
      expect(Profile.findByPk).toHaveBeenCalledTimes(1);

      Profile.findByPk.mockClear();

      clearCache('clear-user-1');

      const req2 = { headers: { authorization: 'Bearer clear-token' } };
      const next2 = jest.fn();

      await authenticate(req2, mockRes, next2);

      expect(Profile.findByPk).toHaveBeenCalledTimes(1);
    });
  });
});

describe('authenticate - supabase not configured', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('should return 500 when SUPABASE_URL and SUPABASE_ANON_KEY are not set', async () => {
    const { authenticate: auth } = require('../../../src/common/middlewares/auth.middleware');
    const req = { headers: { authorization: 'Bearer some-token' } };
    const next = jest.fn();

    await auth(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Configuración'),
        statusCode: 500
      })
    );
  });

  it('should return 500 when only SUPABASE_URL is missing', async () => {
    process.env.SUPABASE_ANON_KEY = 'some-key';
    const { authenticate: auth } = require('../../../src/common/middlewares/auth.middleware');
    const req = { headers: { authorization: 'Bearer some-token' } };
    const next = jest.fn();

    await auth(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });

  it('should return 500 when only SUPABASE_ANON_KEY is missing', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.SUPABASE_ANON_KEY;
    const { authenticate: auth } = require('../../../src/common/middlewares/auth.middleware');
    const req = { headers: { authorization: 'Bearer some-token' } };
    const next = jest.fn();

    await auth(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });
});
