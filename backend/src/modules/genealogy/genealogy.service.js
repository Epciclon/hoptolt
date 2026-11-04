const { Rabbit } = require('../../domain/models');
const genealogyRepository = require('./genealogy.repository');
const AppError = require('../../errors/AppError');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');

class GenealogyService {
    async _resolveRabbitLabelById(rabbitId, fallbackLabel = 'Sin padre registrado') {
        if (!rabbitId) return fallbackLabel;
        const rabbit = await Rabbit.findByPk(rabbitId, { paranoid: false });
        if (!rabbit) return fallbackLabel;
        return rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
    }

    _recordGenealogyAudit(rabbit, beforeData, afterData, action, galponId, profileId) {
        if (!profileId) return;
        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'de la coneja' : 'del conejo';
        const verb = action === 'crear' ? 'Registró' : 'Actualizó';

        recordWorkerChange({
            galponId: galponId || rabbit.galponId,
            profileId,
            action,
            entity: 'genealogy',
            entityId: rabbit.id,
            itemName: `${prefix} ${rabbitLabel}`,
            summary: `${verb} el árbol genealógico ${article} ${rabbitLabel}`,
            before: beforeData,
            after: afterData
        }).catch(err => console.error(`Error recording worker change on ${action} Genealogy:`, err));
    }

    async _updateExistingGenealogy(existing, rabbit, fatherId, motherId, consanguinityWarning, galponId, profileId) {
        const [prevFatherLabel, prevMotherLabel] = await Promise.all([
            this._resolveRabbitLabelById(existing.fatherId, 'Sin padre registrado'),
            this._resolveRabbitLabelById(existing.motherId, 'Sin madre registrada')
        ]);

        const newTargetFatherId = fatherId !== undefined ? (fatherId || null) : existing.fatherId;
        const newTargetMotherId = motherId !== undefined ? (motherId || null) : existing.motherId;
        const hasChanged = (existing.fatherId || null) !== newTargetFatherId ||
                           (existing.motherId || null) !== newTargetMotherId;

        const result = await genealogyRepository.update(existing, { fatherId: newTargetFatherId, motherId: newTargetMotherId });

        const [fatherLabel, motherLabel] = await Promise.all([
            this._resolveRabbitLabelById(newTargetFatherId, 'Sin padre registrado'),
            this._resolveRabbitLabelById(newTargetMotherId, 'Sin madre registrada')
        ]);

        if (profileId && hasChanged) {
            this._recordGenealogyAudit(
                rabbit,
                { father: prevFatherLabel, mother: prevMotherLabel },
                { father: fatherLabel, mother: motherLabel },
                'modificar',
                galponId,
                profileId
            );
        }

        return { ...result.toJSON(), consanguinityWarning };
    }

    async _createNewGenealogy(rabbit, fatherId, motherId, consanguinityWarning, galponId, profileId) {
        const result = await genealogyRepository.create({ rabbitId: rabbit.id, fatherId, motherId, galponId });

        const [fatherLabel, motherLabel] = await Promise.all([
            this._resolveRabbitLabelById(fatherId, 'Sin padre registrado'),
            this._resolveRabbitLabelById(motherId, 'Sin madre registrada')
        ]);

        if (profileId) {
            this._recordGenealogyAudit(
                rabbit,
                null,
                { father: fatherLabel, mother: motherLabel },
                'crear',
                galponId,
                profileId
            );
        }

        return { ...result.toJSON(), consanguinityWarning };
    }

    async registerGenealogy(data, galponId, profileId = null) {
        const { rabbitId, fatherId, motherId } = data;

        const rabbit = await Rabbit.findByPk(rabbitId, { paranoid: false });
        if (!rabbit) throw new AppError('El conejo no existe.', 404);
        if (rabbit.galponId !== galponId) throw new AppError('El conejo no pertenece al galpón activo.', 400);

        if (fatherId && fatherId === rabbitId) {
            throw new AppError('El conejo no puede ser su propio padre.', 400);
        }
        if (motherId && motherId === rabbitId) {
            throw new AppError('El conejo no puede ser su propia madre.', 400);
        }

        await Promise.all([
            fatherId ? this._validateParentUpdate(fatherId, rabbit, 'macho', 'padre') : Promise.resolve(),
            motherId ? this._validateParentUpdate(motherId, rabbit, 'hembra', 'madre') : Promise.resolve()
        ]);

        let consanguinityWarning = null;
        if (fatherId && motherId) {
            consanguinityWarning = await this._getConsanguinityWarning(fatherId, motherId, rabbitId);
        }

        if (consanguinityWarning && !data.confirmConsanguinity) {
            return {
                requiresConfirmation: true,
                consanguinityWarning
            };
        }

        const existing = await genealogyRepository.findByRabbitId(rabbitId);
        if (existing) {
            return this._updateExistingGenealogy(existing, rabbit, fatherId, motherId, consanguinityWarning, galponId, profileId);
        }

        return this._createNewGenealogy(rabbit, fatherId, motherId, consanguinityWarning, galponId, profileId);
    }

    async checkConsanguinity(rabbitId1, rabbitId2) {
        if (!rabbitId1 || !rabbitId2) return false;
        if (rabbitId1 === rabbitId2) return true;

        const [ancestors1, ancestors2] = await Promise.all([
            this.getAncestors(rabbitId1, 3),
            this.getAncestors(rabbitId2, 3)
        ]);

        const set1 = new Set(ancestors1);
        set1.add(rabbitId1);

        const set2 = new Set(ancestors2);
        set2.add(rabbitId2);

        for (const id of set1) {
            if (set2.has(id)) return true;
        }

        return false;
    }

    _collectParentsFromGenealogies(genealogies, ancestors) {
        const nextLevelIds = [];
        for (const genealogy of genealogies) {
            if (!genealogy) continue;
            for (const parentId of [genealogy.fatherId, genealogy.motherId]) {
                if (parentId && !ancestors.has(parentId)) {
                    ancestors.add(parentId);
                    nextLevelIds.push(parentId);
                }
            }
        }
        return nextLevelIds;
    }

    async getAncestors(rabbitId, levels) {
        const ancestors = new Set();
        let currentLevelIds = [rabbitId];

        for (let level = 0; level < levels && currentLevelIds.length > 0; level++) {
            const genealogies = await Promise.all(
                currentLevelIds.map(id => genealogyRepository.findByRabbitId(id))
            );
            currentLevelIds = this._collectParentsFromGenealogies(genealogies, ancestors);
        }

        return Array.from(ancestors);
    }

    async checkMotherMultiplePartners(motherId, currentFatherId, excludeRabbitId = null) {
        const { Op } = require('sequelize');
        const whereClause = { motherId };
        if (excludeRabbitId) {
            whereClause.rabbitId = { [Op.ne]: excludeRabbitId };
        }
        const offspring = await genealogyRepository.findAll({ where: whereClause });
        const partnerIds = new Set(offspring.map(g => g.fatherId).filter(Boolean));
        partnerIds.delete(currentFatherId);
        return partnerIds.size > 0;
    }

    async checkFatherMultiplePartners(fatherId, currentMotherId, excludeRabbitId = null) {
        const { Op } = require('sequelize');
        const whereClause = { fatherId };
        if (excludeRabbitId) {
            whereClause.rabbitId = { [Op.ne]: excludeRabbitId };
        }
        const offspring = await genealogyRepository.findAll({ where: whereClause });
        const partnerIds = new Set(offspring.map(g => g.motherId).filter(Boolean));
        partnerIds.delete(currentMotherId);
        return partnerIds.size > 0;
    }

    async getGenealogy(rabbitId) {
        const genealogy = await genealogyRepository.findByRabbitId(rabbitId);
        if (!genealogy) throw new AppError('Relación genealógica no encontrada.', 404);
        return genealogy;
    }

    async getAllGenealogies(galponId) {
        if (!galponId) return [];
        return genealogyRepository.findByGalponId(galponId);
    }

    async editGenealogy(rabbitId, data, profileId = null, galponId = null) {
        const [genealogy, rabbit] = await Promise.all([
            genealogyRepository.findByRabbitId(rabbitId),
            Rabbit.findByPk(rabbitId, { paranoid: false })
        ]);
        if (!genealogy) throw new AppError('Relación genealógica no encontrada.', 404);
        if (!rabbit) throw new AppError('El conejo no existe.', 404);

        const { fatherId, motherId } = data;
        const newFatherId = fatherId !== undefined ? fatherId : genealogy.fatherId;
        const newMotherId = motherId !== undefined ? motherId : genealogy.motherId;

        await Promise.all([
            this._validateParentUpdate(newFatherId, rabbit, 'macho', 'padre'),
            this._validateParentUpdate(newMotherId, rabbit, 'hembra', 'madre')
        ]);

        let consanguinityWarning = null;
        if (newFatherId && newMotherId) {
            consanguinityWarning = await this._getConsanguinityWarning(newFatherId, newMotherId, rabbitId);
        }

        if (consanguinityWarning && !data.confirmConsanguinity) {
            return {
                requiresConfirmation: true,
                consanguinityWarning
            };
        }

        const [prevFatherLabel, prevMotherLabel] = await Promise.all([
            this._resolveRabbitLabelById(genealogy.fatherId, 'Sin padre registrado'),
            this._resolveRabbitLabelById(genealogy.motherId, 'Sin madre registrada')
        ]);

        const hasChanged = (genealogy.fatherId || null) !== (newFatherId || null) ||
                           (genealogy.motherId || null) !== (newMotherId || null);

        genealogy.fatherId = newFatherId || null;
        genealogy.motherId = newMotherId || null;
        genealogy.changed('fatherId', true);
        genealogy.changed('motherId', true);
        const result = await genealogy.save();

        const [fatherLabel, motherLabel] = await Promise.all([
            this._resolveRabbitLabelById(result.fatherId, 'Sin padre registrado'),
            this._resolveRabbitLabelById(result.motherId, 'Sin madre registrada')
        ]);

        if (profileId && hasChanged) {
            this._recordGenealogyAudit(
                rabbit,
                { father: prevFatherLabel, mother: prevMotherLabel },
                { father: fatherLabel, mother: motherLabel },
                'modificar',
                galponId,
                profileId
            );
        }

        return { ...result.toJSON(), consanguinityWarning };
    }

    async getGenealogyTree(rabbitId, levels = 3) {
        const rabbit = await Rabbit.findByPk(rabbitId, { paranoid: false });
        if (!rabbit) throw new AppError('El conejo no existe.', 404);

        const buildTree = async (id, currentLevel, preloadedRabbit = null) => {
            if (currentLevel === 0) return null;

            const [currentRabbit, genealogy] = await Promise.all([
                preloadedRabbit ? Promise.resolve(preloadedRabbit) : Rabbit.findByPk(id, { paranoid: false }),
                genealogyRepository.findByRabbitId(id)
            ]);
            if (!currentRabbit) return null;

            if (!genealogy) return {
                id,
                code: currentRabbit.code,
                name: currentRabbit.name,
                imageUrl: currentRabbit.imageUrl,
                sex: currentRabbit.sex,
                age: currentRabbit.age,
                weight: currentRabbit.weight,
                race: currentRabbit.race,
                parents: null
            };

            const tree = {
                id,
                code: currentRabbit.code,
                name: currentRabbit.name,
                imageUrl: currentRabbit.imageUrl,
                sex: currentRabbit.sex,
                age: currentRabbit.age,
                weight: currentRabbit.weight,
                race: currentRabbit.race,
                parents: {}
            };

            const [fatherTree, motherTree] = await Promise.all([
                genealogy.fatherId ? buildTree(genealogy.fatherId, currentLevel - 1) : Promise.resolve(null),
                genealogy.motherId ? buildTree(genealogy.motherId, currentLevel - 1) : Promise.resolve(null)
            ]);

            if (fatherTree) tree.parents.father = fatherTree;
            if (motherTree) tree.parents.mother = motherTree;

            return tree;
        };

        return buildTree(rabbitId, levels, rabbit);
    }

    async _validateParent(parentId, child, sex, label, checkRace = true) {
        const parent = await Rabbit.findByPk(parentId, { paranoid: false });
        if (!parent) throw new AppError(`El ${label} no existe.`, 404);
        const Article = label === 'madre' ? 'La' : 'El';
        if (parent.sex !== sex) throw new AppError(`${Article} ${label} debe ser ${sex}.`, 400);
        if (parent.age < 4) throw new AppError(`${Article} ${label} debe tener al menos 4 meses de edad.`, 400);
        if (checkRace && parent.race !== child.race) throw new AppError(`La raza de ${label} debe coincidir con la del conejo.`, 400);
        if (parent.age <= child.age) throw new AppError(`${Article} ${label} debe ser mayor que el hijo.`, 400);
    }

    async _getConsanguinityWarning(fatherId, motherId, excludeRabbitId = null) {
        let warning = null;
        const [areRelated, motherHasMultiplePartners, fatherHasMultiplePartners] = await Promise.all([
            this.checkConsanguinity(fatherId, motherId),
            this.checkMotherMultiplePartners(motherId, fatherId, excludeRabbitId),
            this.checkFatherMultiplePartners(fatherId, motherId, excludeRabbitId)
        ]);

        if (areRelated) {
            warning = 'ADVERTENCIA: Los conejos seleccionados son emparentados. El cruce de conejos consanguíneos puede causar mutaciones y problemas de salud en los descendientes.';
        }

        if (motherHasMultiplePartners) {
            if (warning) warning += ' Además, esta madre ya tiene hijos con otros padres.';
            else warning = 'ADVERTENCIA: Esta madre ya tiene hijos con otros padres. Esto puede causar problemas de salud en los descendientes.';
        }

        if (fatherHasMultiplePartners) {
            if (warning) warning += ' Además, este padre ya tiene hijos con otras madres.';
            else warning = 'ADVERTENCIA: Este padre ya tiene hijos con otras madres. Esto puede causar problemas de salud en los descendientes.';
        }
        return warning;
    }

    async _validateParentUpdate(parentId, rabbit, sex, label) {
        if (!parentId) return;
        const Article = label === 'madre' ? 'La' : 'El';
        const Pronombre = label === 'madre' ? 'propia' : 'propio';
        
        if (parentId === rabbit.id) {
            throw new AppError(`El conejo no puede ser su ${Pronombre} ${label}.`, 400);
        }
        await this._validateParent(parentId, rabbit, sex, label, true);
        const ancestors = await this.getAncestors(parentId, 10);
        if (ancestors.includes(rabbit.id)) throw new AppError(`${Article} ${label} no puede ser descendiente del hijo (ciclo genealógico).`, 400);
    }
}

module.exports = new GenealogyService();
