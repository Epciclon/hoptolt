jest.mock('../src/domain/models', () => {
  const mockModel = (name) => {
    const mock = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
      bulkCreate: jest.fn(),
      sequelize: {
        query: jest.fn()
      }
    };
    
    const modelProxy = new Proxy(mock, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'string' && prop.startsWith('find')) return jest.fn();
        if (prop === 'belongsTo') return jest.fn().mockReturnValue(undefined);
        if (prop === 'hasMany') return jest.fn().mockReturnValue(undefined);
        if (prop === 'belongsToMany') return jest.fn().mockReturnValue(undefined);
        if (prop === 'hasOne') return jest.fn().mockReturnValue(undefined);
        if (prop === 'init') return jest.fn();
        return target[prop] || jest.fn();
      }
    });
    
    return modelProxy;
  };

  const Op = {
    in: Symbol('in'),
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    between: Symbol('between'),
    or: Symbol('or'),
    iLike: Symbol('iLike'),
    like: Symbol('like'),
    and: Symbol('and'),
    ne: Symbol('ne'),
    eq: Symbol('eq'),
    gt: Symbol('gt'),
    lt: Symbol('lt')
  };

  const models = {
    Profile: mockModel('Profile'),
    Rabbit: mockModel('Rabbit'),
    Cage: mockModel('Cage'),
    Race: mockModel('Race'),
    Assignment: mockModel('Assignment'),
    Galpon: mockModel('Galpon'),
    Genealogy: mockModel('Genealogy'),
    Feeding: mockModel('Feeding'),
    Vaccination: mockModel('Vaccination'),
    Deworming: mockModel('Deworming'),
    Growth: mockModel('Growth'),
    Cleaning: mockModel('Cleaning'),
    Mortality: mockModel('Mortality'),
    Reproduction: mockModel('Reproduction'),
    FarmMember: mockModel('FarmMember'),
    WorkerPermission: mockModel('WorkerPermission'),
    WorkerCage: mockModel('WorkerCage'),
    Invitation: mockModel('Invitation'),
    Notification: mockModel('Notification'),
    AuditLog: mockModel('AuditLog'),
    Op
  };

  // Mock instance methods
  const mockInstance = {
    toJSON: jest.fn().mockReturnValue({}),
    get: jest.fn().mockReturnValue({}),
    update: jest.fn().mockResolvedValue({}),
    destroy: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true)
  };

  return models;
});

jest.mock('../src/infrastructure/database/connection', () => ({
  transaction: jest.fn().mockResolvedValue({
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  }),
  query: jest.fn().mockResolvedValue([[], []]),
  define: jest.fn(),
  sync: jest.fn(),
  authenticate: jest.fn()
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn()
    }
  })
}));
