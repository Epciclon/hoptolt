const toGrowthDTO = (growth) => {
    if (!growth) return null;
    
    // Si viene como modelo de Sequelize, extraer los valores
    const data = growth.get ? growth.get({ plain: true }) : growth;
    
    return {
        id: data.id,
        rabbitId: data.rabbitId,
        weight: data.weight,
        date: data.date,
        isAutomatic: data.isAutomatic
    };
};

module.exports = { toGrowthDTO };
