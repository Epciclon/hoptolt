const toGenealogyDTO = (g) => ({
    id: g.id,
    rabbitId: g.rabbitId,
    fatherId: g.fatherId,
    motherId: g.motherId,
    galponId: g.galponId,
    consanguinityWarning: g.consanguinityWarning || undefined,
    rabbit: g.rabbit ? {
        id: g.rabbit.id,
        code: g.rabbit.code,
        name: g.rabbit.name,
        race: g.rabbit.race,
        sex: g.rabbit.sex,
        age: g.rabbit.age
    } : undefined,
    father: g.father ? {
        id: g.father.id,
        code: g.father.code,
        name: g.father.name,
        race: g.father.race,
        sex: g.father.sex,
        age: g.father.age
    } : undefined,
    mother: g.mother ? {
        id: g.mother.id,
        code: g.mother.code,
        name: g.mother.name,
        race: g.mother.race,
        sex: g.mother.sex,
        age: g.mother.age
    } : undefined,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt
});

// Nota: getGenealogyTree ya devuelve un objeto GenealogyTree bien formateado en el servicio,
// pero si fuera necesario se podría mover aquí también.

module.exports = { toGenealogyDTO };
