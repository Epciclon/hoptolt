const { Op } = require('sequelize');

jest.mock('../../../src/domain/models', () => ({
    Rabbit: jest.fn(),
    Profile: jest.fn(),
    Assignment: jest.fn(),
    Cage: jest.fn()
}));

const {
    buildCommonFilters,
    buildRabbitProfileIncludes,
    buildRabbitCountInclude
} = require('../../../src/common/helpers/repository.helper');

describe('buildCommonFilters', () => {
    it('should return empty where clauses when no filters are provided', () => {
        const result = buildCommonFilters({});
        expect(result).toEqual({
            whereClause: {},
            rabbitWhere: {},
            cageWhere: {}
        });
    });

    it('should apply date range filter when both startDate and endDate are provided', () => {
        const result = buildCommonFilters(
            { startDate: '2024-01-01', endDate: '2024-12-31' },
            'createdAt'
        );
        expect(result.whereClause.createdAt).toBeDefined();
        expect(result.whereClause.createdAt[Op.between]).toBeDefined();
        expect(result.whereClause.createdAt[Op.between][0]).toBeInstanceOf(Date);
        expect(result.whereClause.createdAt[Op.between][1]).toBeInstanceOf(Date);
    });

    it('should apply startDate only with Op.gte', () => {
        const result = buildCommonFilters(
            { startDate: '2024-06-01' },
            'createdAt'
        );
        expect(result.whereClause.createdAt).toBeDefined();
        expect(result.whereClause.createdAt[Op.gte]).toBeInstanceOf(Date);
    });

    it('should apply endDate only with Op.lte', () => {
        const result = buildCommonFilters(
            { endDate: '2024-12-31' },
            'createdAt'
        );
        expect(result.whereClause.createdAt).toBeDefined();
        expect(result.whereClause.createdAt[Op.lte]).toBeInstanceOf(Date);
    });

    it('should not apply date filters when dateFieldName is null', () => {
        const result = buildCommonFilters(
            { startDate: '2024-01-01', endDate: '2024-12-31' }
        );
        expect(result.whereClause).toEqual({});
    });

    it('should apply profileId filter', () => {
        const result = buildCommonFilters({ profileId: '5' });
        expect(result.whereClause.profileId).toEqual({ [Op.in]: ['5'] });
    });

    it('should apply responsibleId as profile filter', () => {
        const result = buildCommonFilters({ responsibleId: '10' });
        expect(result.whereClause.profileId).toEqual({ [Op.in]: ['10'] });
    });

    it('should apply profileId filter with array value', () => {
        const result = buildCommonFilters({ profileId: ['3', '7'] });
        expect(result.whereClause.profileId).toEqual({ [Op.in]: ['3', '7'] });
    });

    it('should apply profileId filter with comma-separated string', () => {
        const result = buildCommonFilters({ profileId: '2,4,6' });
        expect(result.whereClause.profileId).toEqual({ [Op.in]: ['2', '4', '6'] });
    });

    it('should apply races filter as comma-separated string', () => {
        const result = buildCommonFilters({ races: 'raza1,raza2' });
        expect(result.rabbitWhere.race).toEqual({ [Op.in]: ['raza1', 'raza2'] });
    });

    it('should apply races filter as array', () => {
        const result = buildCommonFilters({ races: ['raza1', 'raza2'] });
        expect(result.rabbitWhere.race).toEqual({ [Op.in]: ['raza1', 'raza2'] });
    });

    it('should apply cageType filter as comma-separated string', () => {
        const result = buildCommonFilters({ cageType: 'tipoA,tipoB' });
        expect(result.cageWhere.type).toEqual({ [Op.in]: ['tipoA', 'tipoB'] });
    });

    it('should apply cageType filter as array', () => {
        const result = buildCommonFilters({ cageType: ['tipoA', 'tipoB'] });
        expect(result.cageWhere.type).toEqual({ [Op.in]: ['tipoA', 'tipoB'] });
    });

    it('should combine multiple filter types', () => {
        const result = buildCommonFilters(
            {
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                races: 'raza1',
                cageType: 'tipoA'
            },
            'createdAt'
        );
        expect(result.whereClause.createdAt[Op.between]).toBeDefined();
        expect(result.rabbitWhere.race).toEqual({ [Op.in]: ['raza1'] });
        expect(result.cageWhere.type).toEqual({ [Op.in]: ['tipoA'] });
    });
});

describe('buildRabbitProfileIncludes', () => {
    it('should return include array with rabbit and profile', () => {
        const result = buildRabbitProfileIncludes({});
        expect(result).toHaveLength(2);
        expect(result[0].as).toBe('rabbit');
        expect(result[0].required).toBe(true);
        expect(result[1].as).toBe('profile');
    });

    it('should pass rabbitWhere when it has keys', () => {
        const result = buildRabbitProfileIncludes({ race: { [Op.in]: ['raza1'] } });
        expect(result[0].where).toEqual({ race: { [Op.in]: ['raza1'] } });
    });

    it('should set where to undefined when rabbitWhere is empty', () => {
        const result = buildRabbitProfileIncludes({});
        expect(result[0].where).toBeUndefined();
    });

    it('should include nested assignments and cage includes', () => {
        const result = buildRabbitProfileIncludes({});
        expect(result[0].include).toHaveLength(1);
        expect(result[0].include[0].as).toBe('assignments');
        expect(result[0].include[0].where).toEqual({ status: 'asignado' });
        expect(result[0].include[0].include[0].as).toBe('cage');
        expect(result[0].include[0].include[0].attributes).toEqual(['id', 'number']);
    });

    it('should include profile with expected attributes', () => {
        const result = buildRabbitProfileIncludes({});
        expect(result[1].attributes).toEqual(['username', 'fullName', 'email']);
    });
});

describe('buildRabbitCountInclude', () => {
    it('should return count include with rabbit model', () => {
        const result = buildRabbitCountInclude({});
        expect(result).toHaveLength(1);
        expect(result[0].as).toBe('rabbit');
        expect(result[0].required).toBe(true);
    });

    it('should pass rabbitWhere to the include', () => {
        const rabbitWhere = { race: { [Op.in]: ['raza1'] } };
        const result = buildRabbitCountInclude(rabbitWhere);
        expect(result[0].where).toEqual(rabbitWhere);
    });

    it('should pass empty where when rabbitWhere is empty', () => {
        const result = buildRabbitCountInclude({});
        expect(result[0].where).toEqual({});
    });
});
