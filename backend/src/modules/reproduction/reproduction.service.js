const reproductionRepository = require('./reproduction.repository');
const { Rabbit, Assignment, Cage, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class ReproductionService {
    calculateEstimatedBirthDate(mountDate) {
        // mountDate es un string "YYYY-MM-DD"
        const date = new Date(mountDate + 'T00:00:00-05:00');
        date.setDate(date.getDate() + 31);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    _getFemaleNameStr(female) {
        return female.name ? ' — ' + female.name : '';
    }

    async _validateFemaleForMating(female, galponId, mountDateObj) {
        if (female.galponId !== galponId) throw new AppError(`La coneja ${female.code}${this._getFemaleNameStr(female)} no pertenece al galpón activo.`, 400);
        if (female.sex !== 'hembra') throw new AppError(`El ID ${female.id} no corresponde a una hembra.`, 400);

        const assignment = await Assignment.findOne({ where: { rabbitId: female.id, status: 'asignado' } });
        if (!assignment) throw new AppError(`La coneja ${female.code}${this._getFemaleNameStr(female)} no tiene jaula asignada.`, 400);

        const cage = await Cage.findByPk(assignment.cageId);
        if (!cage) throw new AppError('Jaula no encontrada.', 404);
        if (cage.type !== 'reproducción') throw new AppError(`La coneja ${female.code}${this._getFemaleNameStr(female)} está en una jaula de ${cage.type}, no de reproducción.`, 400);

        const activeMount = await reproductionRepository.findActiveMountByFemaleId(female.id);
        if (activeMount) {
            const ed = activeMount.estimatedBirthDate;
            const formattedDate = typeof ed === 'string' && ed.includes('-') ? ed.split('-').reverse().join('/') : new Date(ed).toLocaleDateString('es-EC');
            throw new AppError(`La coneja ${female.code}${this._getFemaleNameStr(female)} ya tiene una monta activa con fecha estimada de parto: ${formattedDate}.`, 400);
        }

        const currentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        currentDate.setHours(0, 0, 0, 0);

        if (mountDateObj > currentDate) throw new AppError('La fecha de monta no puede ser futura. Solo se permite registrar montas del día actual o anteriores.', 400);

        const birthDate = new Date(female.birthDate);
        if (mountDateObj < birthDate) throw new AppError('La fecha de monta no puede ser anterior a la fecha de nacimiento de la coneja.', 400);

        const femaleAge = (currentDate - birthDate) / (1000 * 60 * 60 * 24 * 30.44);
        if (femaleAge < 4) throw new AppError('La hembra debe tener al menos 4 meses de edad.', 400);
    }

    async registerReproduction(data, galponId) {
        const { femaleId, maleId, mountDate } = data;

        const female = await Rabbit.findByPk(femaleId);
        if (!female) throw new AppError(`La coneja con ID ${femaleId} no existe.`, 404);

        const mountDateObj = new Date(mountDate);
        await this._validateFemaleForMating(female, galponId, mountDateObj);

        const estimatedBirthDate = this.calculateEstimatedBirthDate(mountDate);

        // Inyectar la hora actual a la fecha provista
        const now = new Date();
        const [y, m, d] = mountDate.split('-');
        const finalMountDate = new Date(Number(y), Number(m) - 1, Number(d), now.getHours(), now.getMinutes(), now.getSeconds());

        const reproduction = await reproductionRepository.create({
            femaleId,
            maleId: maleId || null,
            mountDate: finalMountDate,
            estimatedBirthDate,
            galponId
        });

        return reproduction;
    }

    async getReproductionByFemaleId(femaleId) {
        return reproductionRepository.findByFemaleId(femaleId);
    }

    async getAllReproductions(galponId, profileId, page = 1, limit = 10, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón (dueño directo o miembro activo)
        const { Galpon } = require('../../domain/models');
        const galpon = await Galpon.findByPk(galponId);
        
        const isOwner = galpon && galpon.profileId === profileId;
        
        if (!isOwner) {
            const membership = await FarmMember.findOne({
                where: { profileId, galponId, status: 'active' }
            });
            if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);
        }

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        if (filters.status) queryOptions.status = filters.status;
        
        const reproductions = await reproductionRepository.findByGalponId(galponId, queryOptions, filters);
        const total = await reproductionRepository.countByGalponId(galponId, queryOptions, filters);

        return createPaginatedResponse(reproductions, filters.all ? 1 : pageValue, filters.all ? reproductions.length : limitValue, total);
    }

    async _processMountDateUpdate(data, reproduction) {
        const mountDateObj = new Date(data.mountDate);
        const currentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        currentDate.setHours(0, 0, 0, 0);

        if (mountDateObj > currentDate) {
            throw new AppError('La fecha de monta no puede ser futura. Solo se permite registrar montas del día actual o anteriores.', 400);
        }

        const female = await Rabbit.findByPk(reproduction.femaleId);
        if (female && mountDateObj < new Date(female.birthDate)) {
            throw new AppError('La fecha de monta no puede ser anterior a la fecha de nacimiento de la coneja.', 400);
        }

        data.estimatedBirthDate = this.calculateEstimatedBirthDate(data.mountDate);

        const [y, m, d] = data.mountDate.split('-');
        const originalMountDate = new Date(reproduction.mountDate);
        const finalMountDate = new Date(Number(y), Number(m) - 1, Number(d), originalMountDate.getHours() || 0, originalMountDate.getMinutes() || 0, originalMountDate.getSeconds() || 0);
        data.mountDate = finalMountDate;

        if (['monta', 'gestacion', 'lactancia'].includes(reproduction.status)) {
            const now = new Date();
            const threshold1 = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            const threshold2 = new Date(now.getTime() - (31 * 24 * 60 * 60 * 1000));
            
            let newStatus;
            if (reproduction.bornKits !== null && reproduction.bornKits !== undefined) {
                newStatus = 'lactancia';
            } else if (finalMountDate <= threshold2) {
                newStatus = 'lactancia';
            } else if (finalMountDate <= threshold1) {
                newStatus = 'gestacion';
            } else {
                newStatus = 'monta';
            }

            if (newStatus !== reproduction.status) {
                data.status = newStatus;
            }
        }
    }

    async editReproduction(id, data, profileId) {
        const reproduction = await reproductionRepository.findById(id);
        if (!reproduction) throw new AppError('Registro de reproducción no encontrado.', 404);

        if (data.mountDate) {
            await this._processMountDateUpdate(data, reproduction);
        }

        if (profileId) data.profileId = profileId;
        data.updatedBySystem = false;

        return reproductionRepository.update(reproduction, data);
    }

    async deleteReproduction(id) {
        const reproduction = await reproductionRepository.findById(id);
        if (!reproduction) throw new AppError('Registro de reproducción no encontrado.', 404);
        await reproductionRepository.delete(reproduction);
    }

    async _getWeaningCalendar(galponId, year, month) {
        const lactancia = await reproductionRepository.findByGalponAndStatuses(galponId, ['lactancia']);
        
        const results = [];
        for (const r of lactancia) {
            if (!r.estimatedBirthDate) continue;
            const weaningDate = new Date(r.estimatedBirthDate + 'T00:00:00-05:00');
            weaningDate.setDate(weaningDate.getDate() + 30);
            
            const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' });
            const weaningDateStr = formatter.format(weaningDate);
            const [wy, wm] = weaningDateStr.split('-');

            if (Number(wy) === Number(year) && Number(wm) === Number(month)) {
                const fullR = await reproductionRepository.findByIdWithDetails(r.id);
                if (fullR?.female && !fullR.female.deletedAt) {
                    fullR.estimatedWeaningDate = weaningDateStr;
                    results.push(fullR);
                }
            }
        }
        return results;
    }

    async _getReceptiveCalendar(galponId, year, month, cageIds) {
        const { Op } = require('sequelize');
        const busyReproductions = await reproductionRepository.findByGalponAndStatuses(galponId, ['monta', 'gestacion', 'lactancia']);
        const busyFemaleIds = busyReproductions.map(r => r.femaleId);

        let includeOptions = [{
            model: Assignment, as: 'assignments', where: { status: 'asignado' }, required: false,
            include: [{ model: Cage, as: 'cage' }]
        }];

        if (cageIds !== null) {
            includeOptions[0].where = { cageId: { [Op.in]: cageIds } };
            includeOptions[0].required = true;
        }

        const availableFemales = await Rabbit.findAll({
            where: { galponId, sex: 'hembra', id: { [Op.notIn]: busyFemaleIds.length ? busyFemaleIds : [0] } },
            include: includeOptions
        });

        const pastReproductions = await reproductionRepository.findByGalponAndStatuses(galponId, ['completado', 'fallido']);

        return availableFemales.map(female => {
            const femalePast = pastReproductions.filter(r => r.femaleId === female.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            let receptiveDate;
            if (femalePast.length > 0) {
                receptiveDate = new Date(femalePast[0].updatedAt);
            } else if (female.birthDate) {
                const bdStr = female.birthDate instanceof Date ? female.birthDate.toISOString().split('T')[0] : String(female.birthDate).split('T')[0];
                receptiveDate = new Date(bdStr + 'T00:00:00-05:00');
                receptiveDate.setMonth(receptiveDate.getMonth() + 4);
            } else return null;

            if (receptiveDate) {
                const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' });
                const receptiveDateStr = formatter.format(receptiveDate);
                const [ry, rm] = receptiveDateStr.split('-');
                if (Number(ry) === Number(year) && Number(rm) === Number(month)) {
                    return {
                        id: `receptive-${female.id}`, femaleId: female.id, femaleCode: female.code, femaleName: female.name,
                        femaleImageUrl: female.imageUrl, receptiveDate: receptiveDateStr, cageNumber: female.assignments?.[0]?.cage?.number || null,
                        cageType: female.assignments?.[0]?.cage?.type || null, type: 'receptive'
                    };
                }
            }
            return null;
        }).filter(Boolean);
    }

    async _getWorkerCageIds(profileId, galponId) {
        const { FarmMember, Galpon, WorkerCage } = require('../../domain/models');
        
        const galpon = await Galpon.findByPk(galponId);
        if (galpon && galpon.profileId === profileId) return null;
        
        const ownerMembership = await FarmMember.findOne({
            where: { profileId, galponId, role: 'owner' }
        });
        if (ownerMembership) return null;

        const membership = await FarmMember.findOne({
            where: { profileId, galponId, role: 'worker' },
            include: [{ model: WorkerCage, as: 'assignedCages', attributes: ['cageId'] }]
        });
        
        return membership?.assignedCages ? membership.assignedCages.map(wc => wc.cageId) : [];
    }

    async getReproductionCalendar(galponId, profileId, year, month, type = 'births') {
        const cageIds = await this._getWorkerCageIds(profileId, galponId);
        let records = [];
        if (type === 'births') {
            records = await reproductionRepository.findByMonthAndGalpon(galponId, year, month, cageIds);
        } else if (type === 'weaning') {
            records = await this._getWeaningCalendar(galponId, year, month);
        } else if (type === 'receptive') {
            records = await this._getReceptiveCalendar(galponId, year, month, cageIds);
        }
        
        const { toCalendarEntryDTO } = require('../../common/dtos/reproduction.dto');
        const formatEcuador = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        
        const _getDateKey = (val) => {
            if (!val) return null;
            if (val instanceof Date) return formatEcuador(val);
            if (typeof val === 'string') return val.split('T')[0];
            return String(val);
        };

        const grouped = {};
        for (const r of records) {
            let valToFormat = r.receptiveDate;
            if (type === 'births') valToFormat = r.estimatedBirthDate;
            else if (type === 'weaning') valToFormat = r.estimatedWeaningDate;
            const dateKey = _getDateKey(valToFormat);
            if (!dateKey) continue;

            let assignment = r.type !== 'receptive' ? (r.female?.assignments?.[0] || null) : null;
            const cage = assignment?.cage || null;

            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(toCalendarEntryDTO(r, type, cage));
        }
        return grouped;
    }

    async getReproductionByDay(galponId, profileId, year, month, day) {
        const cageIds = await this._getWorkerCageIds(profileId, galponId);
        return reproductionRepository.findByDayAndGalpon(galponId, year, month, day, cageIds);
    }

    async getReproductionFemales(galponId) {
        const { Assignment, Rabbit, Cage } = require('../../domain/models');
        const assignments = await Assignment.findAll({
            where: { galponId, status: 'asignado' },
            include: [
                { model: Rabbit, as: 'rabbit', where: { sex: 'hembra' }, required: true },
                { model: Cage, as: 'cage', where: { type: 'reproducción' }, required: true }
            ]
        });
        return assignments.map(assignment => ({
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
    }

    async getReproductionMales(galponId) {
        const { Assignment, Rabbit, Cage } = require('../../domain/models');
        const assignments = await Assignment.findAll({
            where: { galponId, status: 'asignado' },
            include: [
                { model: Rabbit, as: 'rabbit', where: { sex: 'macho' }, required: true },
                { model: Cage, as: 'cage', required: true }
            ]
        });
        return assignments.map(assignment => ({
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
    }

    async getReproductionByDayAndCageIds(galponId, year, month, day, cageIds = null) {
        return reproductionRepository.findByDayAndGalpon(galponId, year, month, day, cageIds);
    }

    async getAvailableMalesForMating(galponId) {

        const males = await Rabbit.findAll({
            where: { 
                galponId, 
                sex: 'macho'
            },
            include: [{
                model: Assignment,
                as: 'assignments',
                where: { status: 'asignado' },
                required: true,
                include: [{ model: Cage, as: 'cage' }]
            }]
        });

        return males.filter(male => {
            if (male.age) return male.age >= 4;
            if (male.birthDate) {
                const ageInMonths = (Date.now() - new Date(male.birthDate)) / (1000 * 60 * 60 * 24 * 30.44);
                return ageInMonths >= 4;
            }
            return false;
        });
    }

    async getAvailableFemalesForMating(galponId, maleId) {
        const { Op } = require('sequelize');
        const male = await Rabbit.findByPk(maleId);
        if (!male) throw new AppError('Macho no encontrado.', 404);

        const busyReproductions = await reproductionRepository.findByGalponAndStatuses(galponId, ['monta', 'gestacion', 'lactancia']);
        const busyFemaleIds = busyReproductions.map(r => r.femaleId);

        const females = await Rabbit.findAll({
            where: {
                galponId,
                sex: 'hembra',
                id: { [Op.notIn]: busyFemaleIds.length ? busyFemaleIds : [0] }
            },
            include: [{
                model: Assignment,
                as: 'assignments',
                where: { status: 'asignado' },
                required: true,
                include: [{ model: Cage, as: 'cage' }]
            }]
        });

        return females.filter(female => {
            // Case-insensitive race match
            const femaleRace = (female.race || '').trim().toLowerCase();
            const maleRace = (male.race || '').trim().toLowerCase();
            if (femaleRace !== maleRace) return false;

            // Must be in a reproduction cage
            const cageType = female.assignments?.[0]?.cage?.type;
            if (cageType && cageType.toLowerCase() !== 'reproducción') return false;

            // Age >= 4 check
            if (female.age !== undefined && female.age !== null) return female.age >= 4;
            if (female.birthDate) {
                const ageInMonths = (Date.now() - new Date(female.birthDate)) / (1000 * 60 * 60 * 24 * 30.44);
                return ageInMonths >= 4;
            }
            return false;
        });
    }

    async startMating(data, galponId, profileId) {
        const { maleId, femaleId } = data;
        const male = await Rabbit.findByPk(maleId);
        const female = await Rabbit.findByPk(femaleId);

        if (!male || !female) throw new AppError('Conejos no encontrados.', 404);
        if (male.sex !== 'macho' || female.sex !== 'hembra') throw new AppError('Sexos incorrectos para la monta.', 400);
        if (male.race !== female.race) throw new AppError('Las razas deben coincidir estrictamente.', 400);

        const ecuadorDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        const y = ecuadorDate.getFullYear();
        const m = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
        const d = String(ecuadorDate.getDate()).padStart(2, '0');
        const mountDateString = `${y}-${m}-${d}`;

        // Limitar a 2 montas por macho por día (salud animal)
        const { Op } = require('sequelize');
        const todaysMatings = await reproductionRepository.findAll({
            where: {
                maleId,
                status: { [Op.ne]: 'fallido' },
                mountDate: { 
                    [Op.gte]: new Date(`${mountDateString}T00:00:00-05:00`), 
                    [Op.lte]: new Date(`${mountDateString}T23:59:59-05:00`) 
                }
            }
        });
        if (todaysMatings.length >= 2) {
            throw new AppError('Este macho ha alcanzado su límite de montas por hoy (2/2). Déjalo descansar.', 400);
        }

        const estimatedBirthDate = this.calculateEstimatedBirthDate(mountDateString);

        const now = new Date();
        const finalMountDate = new Date(Number(y), Number(m) - 1, Number(d), now.getHours(), now.getMinutes(), now.getSeconds());

        return await reproductionRepository.create({
            galponId,
            profileId,
            maleId,
            femaleId,
            mountDate: finalMountDate,
            estimatedBirthDate,
            status: 'monta'
        });
    }

    async finishMating(reproductionId, galponId, profileId) {
        const rep = await reproductionRepository.findById(reproductionId);
        if (!rep) throw new AppError('Registro de monta no encontrado.', 404);
        if (rep.galponId !== galponId) throw new AppError('No tienes permisos.', 403);
        if (rep.status !== 'monta') throw new AppError('Esta monta ya fue finalizada.', 400);

        const result = await reproductionRepository.update(rep, { status: 'gestacion', profileId, updatedBySystem: false });

        const { notifyOwnerOnManualPhaseChange } = require('../../common/helpers/reproductionNotification.helper');
        await notifyOwnerOnManualPhaseChange(profileId, galponId, reproductionId, 2, 'Gestación');

        return result;
    }

    async registerBirth(reproductionId, galponId, data, profileId) {
        const rep = await reproductionRepository.findById(reproductionId);
        if (!rep) throw new AppError('Registro de reproducción no encontrado.', 404);
        if (rep.galponId !== galponId) throw new AppError('No tienes permisos.', 403);
        if (rep.status !== 'gestacion' && rep.status !== 'lactancia') throw new AppError('Estado inválido para registrar parto.', 400);

        const { bornKits, actualBirthDate } = data;
        if (bornKits !== undefined && bornKits !== null && bornKits < 0) throw new AppError('Cantidad de gazapos inválida.', 400);

        if (bornKits !== undefined && bornKits !== null && rep.bornKits !== null && rep.bornKits !== undefined && bornKits !== rep.bornKits) {
            throw new AppError('La cantidad de gazapos nacidos no puede ser modificada una vez registrada en el sistema.', 400);
        }

        const ecuadorDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        const y = ecuadorDate.getFullYear();
        const m = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
        const d = String(ecuadorDate.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const updateData = {
            status: 'lactancia',
            profileId,
            updatedBySystem: false,
            estimatedBirthDate: actualBirthDate || rep.estimatedBirthDate || todayStr
        };

        if (bornKits !== undefined && bornKits !== null) {
            updateData.bornKits = bornKits;
        }

        const result = await reproductionRepository.update(rep, updateData);

        const { notifyOwnerOnManualPhaseChange } = require('../../common/helpers/reproductionNotification.helper');
        await notifyOwnerOnManualPhaseChange(profileId, galponId, reproductionId, 3, 'Lactancia');

        return result;
    }

    async cancelReproduction(reproductionId, galponId, data, profileId) {
        const rep = await reproductionRepository.findById(reproductionId);
        if (!rep) throw new AppError('Registro de reproducción no encontrado.', 404);
        if (rep.galponId !== galponId) throw new AppError('No tienes permisos.', 403);
        if (['completado', 'fallido'].includes(rep.status)) throw new AppError('Esta monta ya finalizó su ciclo.', 400);

        const { reason, action } = data; // action: 'delete' o 'fail'
        
        if (action === 'delete') {
            await reproductionRepository.delete(rep);
            return { deleted: true };
        } else {
            if (!reason) throw new AppError('Debes proporcionar una razón para la cancelación.', 400);
            return await reproductionRepository.update(rep, { 
                status: 'fallido',
                cancellationReason: reason,
                profileId,
                updatedBySystem: false
            });
        }
    }

    async finishLactation(reproductionId, galponId, profileId) {
        const rep = await reproductionRepository.findById(reproductionId);
        if (!rep) throw new AppError('Registro de reproducción no encontrado.', 404);
        if (rep.galponId !== galponId) throw new AppError('No tienes permisos.', 403);
        if (rep.status !== 'lactancia') throw new AppError('Estado inválido para destetar.', 400);

        return await reproductionRepository.update(rep, { status: 'completado', profileId, updatedBySystem: false });
    }

    async getReproductionById(id) {
        const reproduction = await reproductionRepository.findByIdWithDetails(id);
        if (!reproduction) throw new AppError('Registro de reproducción no encontrado.', 404);
        return reproduction;
    }
}

module.exports = new ReproductionService();
