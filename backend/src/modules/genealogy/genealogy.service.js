const genealogyRepository = require('./genealogy.repository');
const { Rabbit } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');

class GenealogyService {
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

        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'de la coneja' : 'del conejo';

        const targetFatherId = fatherId;
        const targetMotherId = motherId;
        const [fatherObj, motherObj, existing] = await Promise.all([
            targetFatherId ? Rabbit.findByPk(targetFatherId, { paranoid: false }) : Promise.resolve(null),
            targetMotherId ? Rabbit.findByPk(targetMotherId, { paranoid: false }) : Promise.resolve(null),
            genealogyRepository.findByRabbitId(rabbitId)
        ]);

        const fatherLabel = fatherObj ? (fatherObj.name ? `${fatherObj.name} - ${fatherObj.code}` : fatherObj.code) : 'Sin padre registrado';
        const motherLabel = motherObj ? (motherObj.name ? `${motherObj.name} - ${motherObj.code}` : motherObj.code) : 'Sin madre registrada';

        if (existing) {
            const [prevFatherObj, prevMotherObj] = await Promise.all([
                existing.fatherId ? Rabbit.findByPk(existing.fatherId, { paranoid: false }) : Promise.resolve(null),
                existing.motherId ? Rabbit.findByPk(existing.motherId, { paranoid: false }) : Promise.resolve(null)
            ]);
            const prevFatherLabel = prevFatherObj ? (prevFatherObj.name ? `${prevFatherObj.name} - ${prevFatherObj.code}` : prevFatherObj.code) : 'Sin padre registrado';
            const prevMotherLabel = prevMotherObj ? (prevMotherObj.name ? `${prevMotherObj.name} - ${prevMotherObj.code}` : prevMotherObj.code) : 'Sin madre registrada';

            const beforeData = { father: prevFatherLabel, mother: prevMotherLabel };
            const newTargetFatherId = fatherId !== undefined ? (fatherId || null) : existing.fatherId;
            const newTargetMotherId = motherId !== undefined ? (motherId || null) : existing.motherId;
            const hasChanged = (existing.fatherId || null) !== newTargetFatherId ||
                               (existing.motherId || null) !== newTargetMotherId;

            const result = await genealogyRepository.update(existing, { fatherId: newTargetFatherId, motherId: newTargetMotherId });
            
            if (profileId && hasChanged) {
                recordWorkerChange({
                    galponId,
                    profileId,
                    action: 'modificar',
                    entity: 'genealogy',
                    entityId: rabbit.id,
                    itemName: `${prefix} ${rabbitLabel}`,
                    summary: `Actualizó el árbol genealógico ${article} ${rabbitLabel}`,
                    before: beforeData,
                    after: { father: fatherLabel, mother: motherLabel }
                }).catch(err => console.error('Error recording worker change on update Genealogy:', err));
            }

            return { ...result.toJSON(), consanguinityWarning };
        }

        const result = await genealogyRepository.create({ rabbitId, fatherId, motherId, galponId });

        if (profileId) {
            recordWorkerChange({
                galponId,
                profileId,
                action: 'crear',
                entity: 'genealogy',
                entityId: rabbit.id,
                itemName: `${prefix} ${rabbitLabel}`,
                summary: `Registró el árbol genealógico ${article} ${rabbitLabel}`,
                before: null,
                after: { father: fatherLabel, mother: motherLabel }
            }).catch(err => console.error('Error recording worker change on create Genealogy:', err));
        }

        return { ...result.toJSON(), consanguinityWarning };
    }

    async checkConsanguinity(rabbitId1, rabbitId2) {
        if (rabbitId1 === rabbitId2) return true;

        const [ancestorsOf2, ancestorsOf1, genealogy1, genealogy2] = await Promise.all([
            this.getAncestors(rabbitId2, 5),
            this.getAncestors(rabbitId1, 5),
            genealogyRepository.findByRabbitId(rabbitId1),
            genealogyRepository.findByRabbitId(rabbitId2)
        ]);

        if (ancestorsOf2.includes(rabbitId1)) return true;
        if (ancestorsOf1.includes(rabbitId2)) return true;

        const [ancestors1, ancestors2] = await Promise.all([
            this.getAncestors(rabbitId1, 3),
            this.getAncestors(rabbitId2, 3)
        ]);

        const commonAncestors = ancestors1.filter(id => ancestors2.includes(id));
        if (commonAncestors.length > 0) return true;

        if (genealogy1 && genealogy2) {
            if (genealogy1.fatherId && genealogy1.fatherId === genealogy2.fatherId) return true;
            if (genealogy1.motherId && genealogy1.motherId === genealogy2.motherId) return true;
        }

        return false;
    }

    async getAncestors(rabbitId, levels) {
        const ancestors = new Set();
        let currentLevelIds = [rabbitId];

        for (let level = 0; level < levels && currentLevelIds.length > 0; level++) {
            const genealogies = await Promise.all(
                currentLevelIds.map(id => genealogyRepository.findByRabbitId(id))
            );
            const nextLevelIds = [];
            for (const genealogy of genealogies) {
                if (genealogy) {
                    if (genealogy.fatherId && !ancestors.has(genealogy.fatherId)) {
                        ancestors.add(genealogy.fatherId);
                        nextLevelIds.push(genealogy.fatherId);
                    }
                    if (genealogy.motherId && !ancestors.has(genealogy.motherId)) {
                        ancestors.add(genealogy.motherId);
                        nextLevelIds.push(genealogy.motherId);
                    }
                }
            }
            currentLevelIds = nextLevelIds;
        }

        return Array.from(ancestors);
    }

    async checkMotherMultiplePartners(motherId, currentFatherId, excludeRabbitId = null) {
        const mothersChildren = await genealogyRepository.findChildrenByMother(motherId);
        const fatherIds = new Set();
        mothersChildren.forEach(g => {
            if (g.rabbitId !== excludeRabbitId && g.fatherId) {
                fatherIds.add(g.fatherId);
            }
        });
        return fatherIds.size > 1;
    }

    async checkFatherMultiplePartners(fatherId, currentMotherId, excludeRabbitId = null) {
        const fathersChildren = await genealogyRepository.findChildrenByFather(fatherId);
        const motherIds = new Set();
        fathersChildren.forEach(g => {
            if (g.rabbitId !== excludeRabbitId && g.motherId) {
                motherIds.add(g.motherId);
            }
        });
        return motherIds.size > 1;
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

        const [prevFatherObj, prevMotherObj] = await Promise.all([
            genealogy.fatherId ? Rabbit.findByPk(genealogy.fatherId, { paranoid: false }) : Promise.resolve(null),
            genealogy.motherId ? Rabbit.findByPk(genealogy.motherId, { paranoid: false }) : Promise.resolve(null)
        ]);
        const prevFatherLabel = prevFatherObj ? (prevFatherObj.name ? `${prevFatherObj.name} - ${prevFatherObj.code}` : prevFatherObj.code) : 'Sin padre registrado';
        const prevMotherLabel = prevMotherObj ? (prevMotherObj.name ? `${prevMotherObj.name} - ${prevMotherObj.code}` : prevMotherObj.code) : 'Sin madre registrada';

        const beforeData = { father: prevFatherLabel, mother: prevMotherLabel };

        const hasChanged = (genealogy.fatherId || null) !== (newFatherId || null) ||
                           (genealogy.motherId || null) !== (newMotherId || null);

        genealogy.fatherId = newFatherId || null;
        genealogy.motherId = newMotherId || null;
        genealogy.changed('fatherId', true);
        genealogy.changed('motherId', true);
        const result = await genealogy.save();

        const [fatherObj, motherObj] = await Promise.all([
            result.fatherId ? Rabbit.findByPk(result.fatherId, { paranoid: false }) : Promise.resolve(null),
            result.motherId ? Rabbit.findByPk(result.motherId, { paranoid: false }) : Promise.resolve(null)
        ]);
        const fatherLabel = fatherObj ? (fatherObj.name ? `${fatherObj.name} - ${fatherObj.code}` : fatherObj.code) : 'Sin padre registrado';
        const motherLabel = motherObj ? (motherObj.name ? `${motherObj.name} - ${motherObj.code}` : motherObj.code) : 'Sin madre registrada';

        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'de la coneja' : 'del conejo';

        if (profileId && hasChanged) {
            recordWorkerChange({
                galponId: galponId || rabbit.galponId,
                profileId,
                action: 'modificar',
                entity: 'genealogy',
                entityId: rabbit.id,
                itemName: `${prefix} ${rabbitLabel}`,
                summary: `Actualizó el árbol genealógico ${article} ${rabbitLabel}`,
                before: beforeData,
                after: { father: fatherLabel, mother: motherLabel }
            }).catch(err => console.error('Error recording worker change on editGenealogy:', err));
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
