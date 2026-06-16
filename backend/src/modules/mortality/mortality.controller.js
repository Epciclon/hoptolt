const catchAsync = require('../../common/middlewares/catchAsync');
const mortalityService = require('./mortality.service');

exports.registerMortality = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const mortality = await mortalityService.registerMortality(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Mortalidad registrada exitosamente.', mortality });
});

exports.getMortalities = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await mortalityService.getMortalities(req.galponId, req.user.id, page, limit);
    
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
            rabbitCode: m.Rabbit ? m.Rabbit.code : 'N/A',
            rabbitName: m.Rabbit ? m.Rabbit.name : 'N/A',
            cause: m.cause,
            observations: m.observations,
            responsible: name,
            deathDate: m.deathDate,
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
