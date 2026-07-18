jest.mock('node:crypto', () => ({
    randomInt: jest.fn()
}));

const crypto = require('node:crypto');
const { generateRandomName } = require('../../../src/common/helpers/names.helper');

describe('generateRandomName', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate a non-empty string name', () => {
        crypto.randomInt
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0);
        const name = generateRandomName('macho');
        expect(name).toBeTruthy();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
    });

    it('should start with a capital letter for macho sex', () => {
        crypto.randomInt
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(3);
        const name = generateRandomName('macho');
        expect(name.charAt(0)).toBe(name.charAt(0).toUpperCase());
        expect(name).toMatch(/^[A-Z]/);
    });

    it('should start with a capital letter for hembra sex', () => {
        crypto.randomInt
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(3);
        const name = generateRandomName('hembra');
        expect(name.charAt(0)).toBe(name.charAt(0).toUpperCase());
        expect(name).toMatch(/^[A-Z]/);
    });

    it('should generate different names on multiple calls', () => {
        crypto.randomInt
            .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
            .mockReturnValueOnce(1).mockReturnValueOnce(1).mockReturnValueOnce(1).mockReturnValueOnce(1);
        const name1 = generateRandomName('macho');
        const name2 = generateRandomName('macho');
        expect(name1).not.toBe(name2);
    });

    it('should include a middle syllable when useMiddle is true (randomInt returns 1)', () => {
        crypto.randomInt
            .mockReturnValueOnce(1)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0);
        const name = generateRandomName('hembra');
        expect(name).toBe('Lupita');
    });

    it('should not include a middle syllable when useMiddle is false (randomInt returns 0)', () => {
        crypto.randomInt
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(3)
            .mockReturnValueOnce(2);
        const name = generateRandomName('macho');
        expect(name).toBe('Mino');
    });

    it('should default to hembra suffix when sex is not "macho"', () => {
        crypto.randomInt
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(19)
            .mockReturnValueOnce(0);
        const name = generateRandomName('unknown');
        const lastTwo = name.slice(-2).toLowerCase();
        expect(lastTwo).toBe('ta');
    });
});
