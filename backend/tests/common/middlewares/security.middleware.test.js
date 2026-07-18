const { apiLimiter, helmetConfig, inputSanitizer } = require('../../../src/common/middlewares/security.middleware');

describe('security middlewares', () => {
  describe('apiLimiter', () => {
    it('should be a function', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('should be defined', () => {
      expect(apiLimiter).toBeDefined();
    });
  });

  describe('helmetConfig', () => {
    it('should be a function', () => {
      expect(typeof helmetConfig).toBe('function');
    });

    it('should be defined', () => {
      expect(helmetConfig).toBeDefined();
    });
  });

  describe('inputSanitizer', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = { body: {}, query: {}, params: {} };
      mockRes = {};
      mockNext = jest.fn();
    });

    it('should remove <script> tags from string values while preserving surrounding text', () => {
      mockReq.body = { name: '<script>alert("xss")</script>John' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove script tags with content inside', () => {
      mockReq.body = { content: 'Hello <script>evil code</script>World' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.content).toBe('Hello World');
    });

    it('should remove javascript: protocol but keep the rest of the string', () => {
      mockReq.query = { url: 'javascript:alert(1)' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.query.url).toBe('alert(1)');
    });

    it('should remove javascript: protocol case-insensitively', () => {
      mockReq.query = { url: 'JavaScript:alert(1)' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.query.url).toBe('alert(1)');
    });

    it('should remove on*= event handlers', () => {
      mockReq.body = { text: 'onclick=alert(1)' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.text).toBe('alert(1)');
    });

    it('should remove various event handlers', () => {
      mockReq.body = { html: 'onload=evil()' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.html).toBe('evil()');
    });

    it('should completely remove content inside script tags from body', () => {
      mockReq.body = { name: '<script>attack</script>' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('');
    });

    it('should sanitize req.query values', () => {
      mockReq.query = { search: '<script>hack</script>query' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.query.search).toBe('query');
    });

    it('should sanitize req.params values', () => {
      mockReq.params = { id: '<script>exploit</script>123' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.params.id).toBe('123');
    });

    it('should skip __proto__ key', () => {
      const malicious = { __proto__: { admin: true } };
      malicious.name = 'test';
      mockReq.body = malicious;

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('test');
    });

    it('should skip constructor key', () => {
      mockReq.body = { constructor: 'should be skipped', name: 'valid' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('valid');
    });

    it('should skip prototype key', () => {
      mockReq.body = { prototype: 'should be skipped', name: 'valid' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('valid');
    });

    it('should handle non-string values without modification', () => {
      mockReq.body = {
        num: 123,
        bool: true,
        arr: [1, 2, 3],
        obj: { nested: 'value' },
        nil: null
      };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.num).toBe(123);
      expect(mockReq.body.bool).toBe(true);
      expect(mockReq.body.arr).toEqual([1, 2, 3]);
      expect(mockReq.body.obj).toEqual({ nested: 'value' });
      expect(mockReq.body.nil).toBeNull();
    });

    it('should handle null body without throwing', () => {
      mockReq.body = null;

      expect(() => inputSanitizer(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined body without throwing', () => {
      mockReq.body = undefined;

      expect(() => inputSanitizer(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null query without throwing', () => {
      mockReq.query = null;

      expect(() => inputSanitizer(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null params without throwing', () => {
      mockReq.params = null;

      expect(() => inputSanitizer(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty body gracefully', () => {
      mockReq.body = {};

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim string values after sanitization', () => {
      mockReq.body = { name: '  <script>attack</script>  ' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('');
    });

    it('should combine multiple sanitizations on one string', () => {
      mockReq.body = {
        payload: '<script>document.location="javascript:evil"</script> onclick=hack()'
      };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.payload).not.toContain('<script>');
      expect(mockReq.body.payload).not.toContain('javascript:');
      expect(mockReq.body.payload).not.toContain('onclick=');
    });

    it('should call next() after sanitization', () => {
      mockReq.body = { name: '<script>x</script>test' };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not modify non-string fields inside sanitizeObject', () => {
      mockReq.body = { count: 42, active: true, tags: ['a', 'b'] };

      inputSanitizer(mockReq, mockRes, mockNext);

      expect(mockReq.body.count).toBe(42);
      expect(mockReq.body.active).toBe(true);
      expect(mockReq.body.tags).toEqual(['a', 'b']);
    });
  });
});
