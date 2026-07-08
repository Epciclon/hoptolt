const genealogyRepository = require('./genealogy.repository');
const { Rabbit } = require('../../domain/models');
const AppError = require('../../errors/AppError');

class GenealogyService {
    async registerGenealogy(data, galponId) {
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

        if (fatherId) {
            await this._validateParent(fatherId, rabbit, 'macho', 'padre');
            const fatherAncestors = await this.getAncestors(fatherId, 10);
            if (fatherAncestors.includes(rabbitId)) throw new AppError('El padre no puede ser descendiente del hijo (ciclo genealógico).', 400);
        }

        if (motherId) {
            await this._validateParent(motherId, rabbit, 'hembra', 'madre');
            const motherAncestors = await this.getAncestors(motherId, 10);
            if (motherAncestors.includes(rabbitId)) throw new AppError('La madre no puede ser descendiente del hijo (ciclo genealógico).', 400);
        }

        let consanguinityWarning = null;
        if (fatherId && motherId) {
            consanguinityWarning = await this._getConsanguinityWarning(fatherId, motherId, rabbitId);
        }

        const existing = await genealogyRepository.findByRabbitId(rabbitId);
        if (existing) {
            const result = await genealogyRepository.update(existing, { fatherId: fatherId || existing.fatherId, motherId: motherId || existing.motherId });
            return { ...result.toJSON(), consanguinityWarning };
        }

        const result = await genealogyRepository.create({ rabbitId, fatherId, motherId, galponId });
        return { ...result.toJSON(), consanguinityWarning };
    }

    async checkConsanguinity(rabbitId1, rabbitId2) {
        if (rabbitId1 === rabbitId2) return true;

        const ancestorsOf2 = await this.getAncestors(rabbitId2, 5);
        if (ancestorsOf2.includes(rabbitId1)) return true;

        const ancestorsOf1 = await this.getAncestors(rabbitId1, 5);
        if (ancestorsOf1.includes(rabbitId2)) return true;

        const ancestors1 = await this.getAncestors(rabbitId1, 3);
        const ancestors2 = await this.getAncestors(rabbitId2, 3);

        const commonAncestors = ancestors1.filter(id => ancestors2.includes(id));
        if (commonAncestors.length > 0) return true;

        const genealogy1 = await genealogyRepository.findByRabbitId(rabbitId1);
        const genealogy2 = await genealogyRepository.findByRabbitId(rabbitId2);

        if (genealogy1 && genealogy2) {
            if (genealogy1.fatherId && genealogy1.fatherId === genealogy2.fatherId) return true;
            if (genealogy1.motherId && genealogy1.motherId === genealogy2.motherId) return true;
        }

        return false;
    }

    async getAncestors(rabbitId, levels) {
        const ancestors = new Set();
        const queue = [{ id: rabbitId, level: 0 }];

        while (queue.length > 0) {
            const { id, level } = queue.shift();
            if (level >= levels) continue;

            const genealogy = await genealogyRepository.findByRabbitId(id);
            if (genealogy) {
                if (genealogy.fatherId) {
                    ancestors.add(genealogy.fatherId);
                    queue.push({ id: genealogy.fatherId, level: level + 1 });
                }
                if (genealogy.motherId) {
                    ancestors.add(genealogy.motherId);
                    queue.push({ id: genealogy.motherId, level: level + 1 });
                }
            }
        }

        return Array.from(ancestors);
    }

    async checkMotherMultiplePartners(motherId, currentFatherId, excludeRabbitId = null) {
        const allGenealogies = await genealogyRepository.findAll();
        const mothersChildren = allGenealogies.filter(g =>
            g.motherId === motherId && g.rabbitId !== excludeRabbitId
        );
        const fatherIds = new Set();
        mothersChildren.forEach(g => {
            if (g.fatherId) fatherIds.add(g.fatherId);
        });
        return fatherIds.size > 1;
    }

    async checkFatherMultiplePartners(fatherId, currentMotherId, excludeRabbitId = null) {
        const allGenealogies = await genealogyRepository.findAll();
        const fathersChildren = allGenealogies.filter(g =>
            g.fatherId === fatherId && g.rabbitId !== excludeRabbitId
        );
        const motherIds = new Set();
        fathersChildren.forEach(g => {
            if (g.motherId) motherIds.add(g.motherId);
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

    async editGenealogy(rabbitId, data) {
        const genealogy = await genealogyRepository.findByRabbitId(rabbitId);
        if (!genealogy) throw new AppError('Relación genealógica no encontrada.', 404);

        const { fatherId, motherId } = data;
        const rabbit = await Rabbit.findByPk(rabbitId, { paranoid: false });
        if (!rabbit) throw new AppError('El conejo no existe.', 404);

        const newFatherId = fatherId !== undefined ? fatherId : genealogy.fatherId;
        const newMotherId = motherId !== undefined ? motherId : genealogy.motherId;

        if (newFatherId && newFatherId === rabbitId) {
            throw new AppError('El conejo no puede ser su propio padre.', 400);
        }
        if (newMotherId && newMotherId === rabbitId) {
            throw new AppError('El conejo no puede ser su propia madre.', 400);
        }

        if (newFatherId) {
            await this._validateParent(newFatherId, rabbit, 'macho', 'padre', false);
            const fatherAncestors = await this.getAncestors(newFatherId, 10);
            if (fatherAncestors.includes(rabbitId)) throw new AppError('El padre no puede ser descendiente del hijo (ciclo genealógico).', 400);
        }

        if (newMotherId) {
            await this._validateParent(newMotherId, rabbit, 'hembra', 'madre', false);
            const motherAncestors = await this.getAncestors(newMotherId, 10);
            if (motherAncestors.includes(rabbitId)) throw new AppError('La madre no puede ser descendiente del hijo (ciclo genealógico).', 400);
        }

        let consanguinityWarning = null;
        if (newFatherId && newMotherId) {
            consanguinityWarning = await this._getConsanguinityWarning(newFatherId, newMotherId, rabbitId);
        }

        genealogy.fatherId = newFatherId || null;
        genealogy.motherId = newMotherId || null;
        genealogy.changed('fatherId', true);
        genealogy.changed('motherId', true);
        const result = await genealogy.save();
        return { ...result.toJSON(), consanguinityWarning };
    }

    async deleteGenealogy(rabbitId) {
        const genealogy = await genealogyRepository.findByRabbitId(rabbitId);
        if (!genealogy) throw new AppError('Relación genealógica no encontrada.', 404);
        await genealogyRepository.delete(genealogy);
    }

    async getGenealogyTree(rabbitId, levels = 3) {
        const rabbit = await Rabbit.findByPk(rabbitId, { paranoid: false });
        if (!rabbit) throw new AppError('El conejo no existe.', 404);

        const buildTree = async (id, currentLevel) => {
            if (currentLevel === 0) return null;

            const currentRabbit = await Rabbit.findByPk(id, { paranoid: false });
            if (!currentRabbit) return null;

            const genealogy = await genealogyRepository.findByRabbitId(id);
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

            if (genealogy.fatherId) {
                tree.parents.father = await buildTree(genealogy.fatherId, currentLevel - 1);
            }

            if (genealogy.motherId) {
                tree.parents.mother = await buildTree(genealogy.motherId, currentLevel - 1);
            }

            return tree;
        };

        return buildTree(rabbitId, levels);
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
        const areRelated = await this.checkConsanguinity(fatherId, motherId);
        if (areRelated) {
            warning = 'ADVERTENCIA: Los conejos seleccionados son emparentados. El cruce de conejos consanguíneos puede causar mutaciones y problemas de salud en los descendientes.';
        }

        const motherHasMultiplePartners = await this.checkMotherMultiplePartners(motherId, fatherId, excludeRabbitId);
        if (motherHasMultiplePartners) {
            if (warning) warning += ' Además, esta madre ya tiene hijos con otros padres.';
            else warning = 'ADVERTENCIA: Esta madre ya tiene hijos con otros padres. Esto puede causar problemas de salud en los descendientes.';
        }

        const fatherHasMultiplePartners = await this.checkFatherMultiplePartners(fatherId, motherId, excludeRabbitId);
        if (fatherHasMultiplePartners) {
            if (warning) warning += ' Además, este padre ya tiene hijos con otras madres.';
            else warning = 'ADVERTENCIA: Este padre ya tiene hijos con otras madres. Esto puede causar problemas de salud en los descendientes.';
        }
        return warning;
    }
}

module.exports = new GenealogyService();
