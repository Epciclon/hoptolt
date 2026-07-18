const {
    getPaginationParams,
    formatPaginationResponse,
    createPaginatedResponse
} = require('../../../src/common/helpers/pagination.helper');

describe('getPaginationParams', () => {
    it('should return default values when no arguments are provided', () => {
        const result = getPaginationParams();
        expect(result).toEqual({
            page: 1,
            limit: 10,
            offset: 0
        });
    });

    it('should calculate offset correctly for page 1', () => {
        const result = getPaginationParams(1, 20);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
    });

    it('should calculate offset correctly for page 2', () => {
        const result = getPaginationParams(2, 15);
        expect(result.page).toBe(2);
        expect(result.limit).toBe(15);
        expect(result.offset).toBe(15);
    });

    it('should handle page 0 by defaulting to 1', () => {
        const result = getPaginationParams(0, 10);
        expect(result.page).toBe(1);
        expect(result.offset).toBe(0);
    });

    it('should handle limit 0 by defaulting to 10', () => {
        const result = getPaginationParams(1, 0);
        expect(result.limit).toBe(10);
        expect(result.offset).toBe(0);
    });

    it('should parse string inputs to numbers', () => {
        const result = getPaginationParams('3', '25');
        expect(result.page).toBe(3);
        expect(result.limit).toBe(25);
        expect(result.offset).toBe(50);
    });

    it('should handle null page by defaulting to 1', () => {
        const result = getPaginationParams(null, 10);
        expect(result.page).toBe(1);
        expect(result.offset).toBe(0);
    });
});

describe('formatPaginationResponse', () => {
    it('should return pagination metadata', () => {
        const result = formatPaginationResponse(1, 10, 50);
        expect(result).toEqual({
            page: 1,
            limit: 10,
            total: 50,
            totalPages: 5
        });
    });

    it('should calculate totalPages rounding up', () => {
        const result = formatPaginationResponse(2, 15, 40);
        expect(result.totalPages).toBe(3);
        expect(Math.ceil(40 / 15)).toBe(3);
    });

    it('should return 0 totalPages when total is 0', () => {
        const result = formatPaginationResponse(1, 10, 0);
        expect(result.totalPages).toBe(0);
        expect(result.total).toBe(0);
    });

    it('should return 1 totalPage when total equals limit', () => {
        const result = formatPaginationResponse(1, 10, 10);
        expect(result.totalPages).toBe(1);
    });
});

describe('createPaginatedResponse', () => {
    const data = [{ id: 1 }, { id: 2 }];

    it('should combine data and pagination', () => {
        const result = createPaginatedResponse(data, 1, 10, 25);
        expect(result).toEqual({
            data,
            pagination: {
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3
            }
        });
    });

    it('should work with empty data array', () => {
        const result = createPaginatedResponse([], 1, 10, 0);
        expect(result.data).toEqual([]);
        expect(result.pagination.totalPages).toBe(0);
        expect(result.pagination.total).toBe(0);
    });
});
