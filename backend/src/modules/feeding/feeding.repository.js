const { Feeding, Cage } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class FeedingRepository {
    _getEcuadorDayBounds(date) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Guayaquil',
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
    
        const startOfDayStr = `${year}-${month}-${day}T00:00:00-05:00`;
        const endOfDayStr = `${year}-${month}-${day}T23:59:59.999-05:00`;
    
        return {
            startOfDay: new Date(startOfDayStr),
            endOfDay: new Date(endOfDayStr)
        };
    }

    async findByCageIdAndDate(cageId, date) {
        const { startOfDay, endOfDay } = this._getEcuadorDayBounds(date);

        return Feeding.findAll({
            where: {
                cageId,
                feedingDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });
    }

    async countByUniqueAttributes(cageId, date, shift, profileId) {
        const { startOfDay, endOfDay } = this._getEcuadorDayBounds(date);

        return Feeding.count({
            where: {
                cageId,
                shift,
                profileId,
                feedingDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });
    }

    async findByGalponId(galponId, options = {}, filters = {}) {
        const { Assignment, Rabbit } = require('../../domain/models');
        const { whereClause: filtersWhere, cageWhere } = buildCommonFilters(filters, 'feedingDate');
        const whereClause = { galponId, ...filtersWhere };

        return Feeding.findAll({
            where: whereClause,
            order: [['feedingDate', 'DESC']],
            limit: options.limit,
            offset: options.offset,
            include: [
                { 
                    model: Cage, 
                    as: 'cage', 
                    attributes: ['id', 'number', 'type'],
                    where: Object.keys(cageWhere).length > 0 ? cageWhere : undefined,
                    required: Object.keys(cageWhere).length > 0,
                    include: [{
                        model: Assignment,
                        as: 'assignments',
                        where: { status: 'asignado' },
                        required: false,
                        include: [{
                            model: Rabbit,
                            as: 'rabbit',
                            attributes: ['id', 'code', 'name', 'race', 'imageUrl']
                        }]
                    }]
                },
                { 
                    model: require('../../domain/models').Profile, 
                    as: 'profile', 
                    attributes: ['username', 'fullName', 'email'] 
                }
            ],
            ...options
        });
    }

    async countByGalponId(galponId, filters = {}) {
        const { whereClause: filtersWhere, cageWhere } = buildCommonFilters(filters, 'feedingDate');
        const whereClause = { galponId, ...filtersWhere };

        // Si hay filtro de tipo de jaula, necesitamos hacer el include para el count
        if (filters.cageType) {
            const { Cage } = require('../../domain/models');
            
            return Feeding.count({ 
                where: whereClause,
                include: [
                    {
                        model: Cage,
                        as: 'cage',
                        where: cageWhere,
                        required: true
                    }
                ]
            });
        }

        return Feeding.count({ where: whereClause });
    }

    async findAll() {
        return Feeding.findAll({
            include: [
                { model: Cage, as: 'cage', attributes: ['number', 'type'] },
                { model: require('../../domain/models').Profile, as: 'profile', attributes: ['fullName'] }
            ]
        });
    }

    async create(data) {
        return Feeding.create(data);
    }
}

module.exports = new FeedingRepository();
