const catchAsync = require('../../common/middlewares/catchAsync');
const reproductionService = require('./reproduction.service');
const { Rabbit, Assignment, Cage, Reproduction } = require('../../domain/models');
const { Op } = require('sequelize');

exports.registerReproduction = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const reproduction = await reproductionService.registerReproduction(req.body, galponId);
    res.status(201).json({ success: true, message: 'Monta registrada exitosamente.', reproduction });
});

exports.getReproductionByFemaleId = catchAsync(async (req, res) => {
    const reproductions = await reproductionService.getReproductionByFemaleId(req.params.femaleId);
    res.status(200).json({ success: true, reproductions });
});

exports.getAllReproductions = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const result = await reproductionService.getAllReproductions(req.galponId, req.user.id, page, limit);
        
        // Los datos ya vienen con includes, no necesitamos consultas adicionales
        const enrichedReproductions = result.data.map(reproduction => {
            const assignment = reproduction.female?.assignments?.[0] || null;
            const cage = assignment?.cage || null;
            const male = reproduction.male || null;

            return {
                id: reproduction.id,
                femaleId: reproduction.femaleId,
                femaleCode: reproduction.female?.code || 'N/A',
                femaleName: reproduction.female?.name || '',
                maleId: reproduction.maleId,
                maleCode: male?.code || null,
                maleName: male?.name || '',
                mountDate: reproduction.mountDate,
                estimatedBirthDate: reproduction.estimatedBirthDate,
                cageNumber: cage?.number || null,
                cageType: cage?.type || null,
                galponId: reproduction.galponId
            };
        });
        
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

exports.getReproductionCalendar = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-12

    // Obtener cageIds del trabajador si no es owner
    let cageIds = null;
    const { FarmMember } = require('../../domain/models');
    
    // Verificar si el usuario es owner del galpón
    const ownerMembership = await FarmMember.findOne({
        where: {
            profileId: req.user.id,
            galponId: galponId,
            role: 'owner'
        }
    });

    if (!ownerMembership) {
        cageIds = [];
        // Si no es owner, obtener jaulas asignadas como worker
        const { WorkerCage } = require('../../domain/models');
        
        const membership = await FarmMember.findOne({
            where: {
                profileId: req.user.id,
                galponId: galponId,
                role: 'worker'
            },
            include: [
                {
                    model: WorkerCage,
                    as: 'assignedCages',
                    attributes: ['cageId']
                }
            ]
        });
        
        if (membership && membership.assignedCages) {
            cageIds = membership.assignedCages.map(wc => wc.cageId);
        }
    }

    const records = await reproductionService.getReproductionCalendar(galponId, year, month, cageIds);

    // Group by date string (YYYY-MM-DD)
    const grouped = {};
    for (const r of records) {
        let dateKey;
        if (r.estimatedBirthDate instanceof Date) {
            dateKey = r.estimatedBirthDate.toISOString().split('T')[0];
        } else if (typeof r.estimatedBirthDate === 'string') {
            dateKey = r.estimatedBirthDate.split('T')[0];
        } else {
            dateKey = String(r.estimatedBirthDate);
        }

        const assignment = r.female?.assignments?.[0] || null;
        const cage = assignment?.cage || null;

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
            id: r.id,
            femaleId: r.femaleId,
            femaleCode: r.female?.code || 'N/A',
            femaleName: r.female?.name || '',
            maleId: r.maleId,
            maleCode: r.male?.code || null,
            maleName: r.male?.name || null,
            mountDate: r.mountDate,
            estimatedBirthDate: r.estimatedBirthDate,
            cageNumber: cage?.number || null,
            cageType: cage?.type || null,
        });
    }

    res.status(200).json({ success: true, calendar: grouped });
});

exports.getReproductionByDay = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-12
    const day   = parseInt(req.query.day)   || new Date().getDate();

    let cageIds = null;
    const { FarmMember } = require('../../domain/models');

    // Verificar si el usuario es owner del galpón
    const ownerMembership = await FarmMember.findOne({
        where: {
            profileId: req.user.id,
            galponId: galponId,
            role: 'owner'
        }
    });

    if (!ownerMembership) {
        cageIds = [];
        // Si no es owner, obtener jaulas asignadas como worker
        const { WorkerCage } = require('../../domain/models');
        
        const membership = await FarmMember.findOne({
            where: {
                profileId: req.user.id,
                galponId: galponId,
                role: 'worker'
            },
            include: [
                {
                    model: WorkerCage,
                    as: 'assignedCages',
                    attributes: ['cageId']
                }
            ]
        });
        
        if (membership && membership.assignedCages) {
            cageIds = membership.assignedCages.map(wc => wc.cageId);
        }
    }

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
        cageNumber: cage?.number || null,
        cageType: cage?.type || null,
    };

    res.status(200).json({ success: true, reproduction: response });
});
