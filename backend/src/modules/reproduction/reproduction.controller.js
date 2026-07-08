const catchAsync = require('../../common/middlewares/catchAsync');
const reproductionService = require('./reproduction.service');
const { Rabbit, Assignment, Cage, Reproduction } = require('../../domain/models');
const { Op } = require('sequelize');

exports.registerReproduction = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const reproduction = await reproductionService.registerReproduction(req.body, galponId);
    res.status(201).json({ success: true, message: 'Monta registrada exitosamente.', reproduction });
});

exports.getAvailableMalesForMating = catchAsync(async (req, res) => {
    const males = await reproductionService.getAvailableMalesForMating(req.galponId);
    // Formatear para frontend
    const formatted = males.map(m => ({
        id: m.id,
        code: m.code,
        name: m.name,
        race: m.race,
        age: m.age,
        weight: m.weight,
        imageUrl: m.imageUrl,
        cageNumber: m.assignments?.[0]?.cage?.number
    }));
    res.status(200).json({ success: true, males: formatted });
});

exports.getAvailableFemalesForMating = catchAsync(async (req, res) => {
    const females = await reproductionService.getAvailableFemalesForMating(req.galponId, req.params.maleId);
    const formatted = females.map(f => ({
        id: f.id,
        code: f.code,
        name: f.name,
        race: f.race,
        age: f.age,
        weight: f.weight,
        imageUrl: f.imageUrl,
        cageNumber: f.assignments?.[0]?.cage?.number
    }));
    res.status(200).json({ success: true, females: formatted });
});

exports.startMating = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.startMating(req.body, req.galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Monta iniciada exitosamente.', reproduction });
});

exports.finishMating = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.finishMating(req.params.id, req.galponId);
    res.status(200).json({ success: true, message: 'Monta finalizada. La hembra ha regresado a gestación.', reproduction });
});

exports.getReproductionByFemaleId = catchAsync(async (req, res) => {
    const reproductions = await reproductionService.getReproductionByFemaleId(req.params.femaleId);
    res.status(200).json({ success: true, reproductions });
});

const formatReproduction = (reproduction) => {
    const assignment = reproduction.female?.assignments?.[0] || null;
    const cage = assignment?.cage || null;
    const male = reproduction.male || null;

    let profileName = 'N/A';
    if (reproduction.updatedBySystem) {
        profileName = 'Sistema Hoptolt';
    } else if (reproduction.profile) {
        profileName = reproduction.profile.fullName || reproduction.profile.username || reproduction.profile.email || 'N/A';
    }

    let profileObj = null;
    if (reproduction.profile) {
        profileObj = {
            username: reproduction.profile.username,
            fullName: reproduction.profile.fullName,
            email: reproduction.profile.email
        };
    }

    return {
        id: reproduction.id,
        femaleId: reproduction.femaleId,
        femaleCode: reproduction.female?.code || 'N/A',
        femaleName: reproduction.female?.name || '',
        femaleRace: reproduction.female?.race || '',
        femaleAge: reproduction.female?.age,
        femaleWeight: reproduction.female?.weight,
        maleId: reproduction.maleId,
        maleCode: male?.code || null,
        maleName: male?.name || '',
        maleRace: male?.race || '',
        maleImageUrl: male?.imageUrl || null,
        isMaleDeleted: !!male?.deletedAt,
        mountDate: reproduction.mountDate,
        estimatedBirthDate: reproduction.estimatedBirthDate,
        bornKits: reproduction.bornKits,
        cancellationReason: reproduction.cancellationReason,
        status: reproduction.status,
        createdAt: reproduction.createdAt,
        updatedAt: reproduction.updatedAt,
        imageUrl: reproduction.female?.imageUrl || null,
        cageNumber: cage?.number || null,
        cageType: cage?.type || null,
        galponId: reproduction.galponId,
        profileName: profileName,
        profile: profileObj
    };
};

exports.getAllReproductions = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const { startDate, endDate, races, status, profileId, all } = req.query;

    const filters = { startDate, endDate, races, status, profileId, all: all === 'true' };

    try {
        const result = await reproductionService.getAllReproductions(req.galponId, req.user.id, page, limit, filters);
        
        const enrichedReproductions = result.data.map(formatReproduction);
        
        res.status(200).json({
            success: true,
            reproductions: enrichedReproductions,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error en getAllReproductions:', error);
        throw error;
    }
});

exports.getReproductionFemales = catchAsync(async (req, res) => {
    const galponId = req.galponId;

    try {
        const assignments = await Assignment.findAll({
            where: {
                galponId,
                status: 'asignado'
            },
            include: [
                {
                    model: Rabbit,
                    as: 'rabbit',
                    where: { sex: 'hembra' },
                    required: true
                },
                {
                    model: Cage,
                    as: 'cage',
                    where: { type: 'reproducción' },
                    required: true
                }
            ]
        });
        const females = assignments.map(assignment => ({
            id: assignment.rabbit.id,
            code: assignment.rabbit.code,
            name: assignment.rabbit.name,
            race: assignment.rabbit.race,
            imageUrl: assignment.rabbit.imageUrl,
            age: assignment.rabbit.age,
            weight: assignment.rabbit.weight,
            cageNumber: assignment.cage.number,
            cageType: assignment.cage.type,
            cageId: assignment.cage.id
        }));
        res.status(200).json({ success: true, females });
    } catch (error) {
        console.error('Error en getReproductionFemales:', error);
        throw error;
    }
});

exports.getReproductionMales = catchAsync(async (req, res) => {
    const galponId = req.galponId;

    try {
        const assignments = await Assignment.findAll({
            where: {
                galponId,
                status: 'asignado'
            },
            include: [
                {
                    model: Rabbit,
                    as: 'rabbit',
                    where: { sex: 'macho' },
                    required: true
                },
                {
                    model: Cage,
                    as: 'cage',
                    required: true
                }
            ]
        });
        const males = assignments.map(assignment => ({
            id: assignment.rabbit.id,
            code: assignment.rabbit.code,
            name: assignment.rabbit.name,
            race: assignment.rabbit.race,
            imageUrl: assignment.rabbit.imageUrl,
            age: assignment.rabbit.age,
            weight: assignment.rabbit.weight,
            cageNumber: assignment.cage.number,
            cageType: assignment.cage.type,
            cageId: assignment.cage.id
        }));
        res.status(200).json({ success: true, males });
    } catch (error) {
        console.error('Error en getReproductionMales:', error);
        throw error;
    }
});

exports.editReproduction = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.editReproduction(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Monta actualizada exitosamente.', reproduction });
});

exports.deleteReproduction = catchAsync(async (req, res) => {
    await reproductionService.deleteReproduction(req.params.id);
    res.status(200).json({ success: true, message: 'Monta eliminada exitosamente.' });
});

// Helper
async function getWorkerCageIds(userId, galponId) {
    const { FarmMember, Galpon, WorkerCage } = require('../../domain/models');
    
    const galpon = await Galpon.findByPk(galponId);
    if (galpon && galpon.profileId === userId) return null;
    
    const ownerMembership = await FarmMember.findOne({
        where: { profileId: userId, galponId: galponId, role: 'owner' }
    });
    if (ownerMembership) return null;

    const membership = await FarmMember.findOne({
        where: { profileId: userId, galponId: galponId, role: 'worker' },
        include: [{ model: WorkerCage, as: 'assignedCages', attributes: ['cageId'] }]
    });
    
    return membership?.assignedCages ? membership.assignedCages.map(wc => wc.cageId) : [];
}

exports.getReproductionCalendar = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const year  = Number.parseInt(req.query.year)  || new Date().getFullYear();
    const month = Number.parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-12
    const type  = req.query.type || 'births';

    const cageIds = await getWorkerCageIds(req.user.id, galponId);

    const records = await reproductionService.getReproductionCalendar(galponId, year, month, type, cageIds);

    const formatEcuador = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    
    const _getDateKey = (val) => {
        if (!val) return null;
        if (val instanceof Date) return formatEcuador(val);
        if (typeof val === 'string') return val.split('T')[0];
        return String(val);
    };

    const _buildCalendarEntry = (r, type, cage) => {
        if (type === 'receptive') {
            return {
                id: r.id, femaleId: r.femaleId, femaleCode: r.femaleCode, femaleName: r.femaleName,
                femaleImageUrl: r.femaleImageUrl || null, receptiveDate: r.receptiveDate,
                cageNumber: r.cageNumber, cageType: r.cageType, type: 'receptive'
            };
        } else if (type === 'weaning') {
            return {
                id: r.id, femaleId: r.femaleId, femaleCode: r.female?.code || 'N/A', femaleName: r.female?.name || '',
                femaleImageUrl: r.female?.imageUrl || null, maleId: r.maleId, maleCode: r.male?.code || null,
                maleName: r.male?.name || null, maleImageUrl: r.male?.imageUrl || null, mountDate: r.mountDate,
                estimatedBirthDate: r.estimatedBirthDate, estimatedWeaningDate: r.estimatedWeaningDate,
                cageNumber: cage?.number || null, cageType: cage?.type || null, type: 'weaning'
            };
        }
        return {
            id: r.id, femaleId: r.femaleId, femaleCode: r.female?.code || 'N/A', femaleName: r.female?.name || '',
            femaleImageUrl: r.female?.imageUrl || null, maleId: r.maleId, maleCode: r.male?.code || null,
            maleName: r.male?.name || null, maleImageUrl: r.male?.imageUrl || null, mountDate: r.mountDate,
            estimatedBirthDate: r.estimatedBirthDate, cageNumber: cage?.number || null, cageType: cage?.type || null,
            type: 'births'
        };
    };

    // Group by date string (YYYY-MM-DD)
    const grouped = {};
    for (const r of records) {
        let valToFormat;
        if (type === 'births') {
            valToFormat = r.estimatedBirthDate;
        } else if (type === 'weaning') {
            valToFormat = r.estimatedWeaningDate;
        } else {
            valToFormat = r.receptiveDate;
        }
        const dateKey = _getDateKey(valToFormat);

        if (!dateKey) continue;

        let assignment = null;
        if (r.type !== 'receptive') {
            assignment = r.female?.assignments?.[0] || null;
        }
        
        const cage = assignment?.cage || null;

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(_buildCalendarEntry(r, type, cage));
    }

    res.status(200).json({ success: true, calendar: grouped });
});

exports.getReproductionByDay = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const year  = Number.parseInt(req.query.year)  || new Date().getFullYear();
    const month = Number.parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-12
    const day   = Number.parseInt(req.query.day)   || new Date().getDate();

    const cageIds = await getWorkerCageIds(req.user.id, galponId);

    const records = await reproductionService.getReproductionByDay(galponId, year, month, day, cageIds);

    const reproductions = records.map(r => {
        const assignment = r.female?.assignments?.[0] || null;
        const cage = assignment?.cage || null;

        return {
            id: r.id,
            femaleId: r.femaleId,
            femaleCode: r.female?.code || 'N/A',
            femaleName: r.female?.name || '',
            maleId: r.maleId,
            maleCode: r.male?.code || null,
            maleName: r.male?.name || '',
            mountDate: r.mountDate,
            estimatedBirthDate: r.estimatedBirthDate,
            cageNumber: cage?.number || null,
            cageType: cage?.type || null,
        };
    });

    res.status(200).json({ success: true, reproductions });
});

exports.getReproductionById = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.getReproductionById(req.params.id);
    
    if (!reproduction) {
        return res.status(404).json({ success: false, message: 'Monta no encontrada.' });
    }

    const assignment = reproduction.female?.assignments?.[0] || null;
    const cage = assignment?.cage || null;

    const response = {
        id: reproduction.id,
        femaleId: reproduction.femaleId,
        femaleCode: reproduction.female?.code || 'N/A',
        femaleName: reproduction.female?.name || '',
        femaleSex: reproduction.female?.sex || '',
        femaleBirthDate: reproduction.female?.birthDate || null,
        femaleWeight: reproduction.female?.weight || null,
        femalePurpose: reproduction.female?.purpose || '',
        maleId: reproduction.maleId,
        maleCode: reproduction.male?.code || null,
        maleName: reproduction.male?.name || '',
        maleSex: reproduction.male?.sex || '',
        maleBirthDate: reproduction.male?.birthDate || null,
        maleWeight: reproduction.male?.weight || null,
        malePurpose: reproduction.male?.purpose || '',
        mountDate: reproduction.mountDate,
        estimatedBirthDate: reproduction.estimatedBirthDate,
        bornKits: reproduction.bornKits,
        cancellationReason: reproduction.cancellationReason,
        status: reproduction.status,
        cageNumber: cage?.number || null,
        cageType: cage?.type || null,
    };

    res.status(200).json({ success: true, reproduction: response });
});

exports.registerBirth = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.registerBirth(req.params.id, req.galponId, req.body);
    res.status(200).json({ success: true, message: 'Parto registrado exitosamente.', reproduction });
});

exports.cancelReproduction = catchAsync(async (req, res) => {
    const result = await reproductionService.cancelReproduction(req.params.id, req.galponId, req.body, req.user.id);
    res.status(200).json({ success: true, result });
});

exports.finishLactation = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.finishLactation(req.params.id, req.galponId, req.user.id);
    res.status(200).json({ success: true, message: 'Lactancia finalizada. Los gazapos han sido destetados.', reproduction });
});
