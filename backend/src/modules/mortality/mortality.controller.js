const catchAsync = require('../../common/middlewares/catchAsync');
const mortalityService = require('./mortality.service');

exports.registerMortality = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const mortality = await mortalityService.registerMortality(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Mortalidad registrada exitosamente.', mortality });
});

exports.getMortalities = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const isKits = req.query.isKits !== undefined ? req.query.isKits === 'true' : null;
    const { startDate, endDate, races, causes, profileId, all } = req.query;

    const filters = { startDate, endDate, races, causes, profileId, all: all === 'true' };

    const result = await mortalityService.getMortalities(req.galponId, req.user.id, page, limit, isKits, filters);
    
    const formatted = result.data.map(m => {
        let name = 'Sistema';
        if (m.profile) {
            if (m.profile.fullName && m.profile.fullName.trim() !== '') {
                name = m.profile.fullName;
            } else if (m.profile.username && m.profile.username.trim() !== '') {
                name = m.profile.username;
            } else if (m.profile.email && m.profile.email.trim() !== '') {
                name = m.profile.email;
            }
        }
        return {
            id: m.id,
            rabbitId: m.rabbitId,
            rabbitCode: m.rabbit ? m.rabbit.code : 'N/A',
            rabbitName: m.rabbit ? m.rabbit.name : 'N/A',
            rabbitRace: m.rabbit ? m.rabbit.race : 'N/A',
            rabbitImageUrl: m.rabbit ? m.rabbit.imageUrl : null,
            cause: m.cause,
            observations: m.observations,
            responsible: name,
            profileUsername: m.profile ? m.profile.username : null,
            profileEmail: m.profile ? m.profile.email : null,
            deathDate: m.deathDate,
            isKits: m.isKits,
            numberOfKits: m.numberOfKits,
            galponId: m.galponId,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
        };
    });

    res.status(200).json({
        success: true,
        mortalities: formatted,
        pagination: result.pagination
    });
});
