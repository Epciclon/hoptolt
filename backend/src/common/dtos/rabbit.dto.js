const toRabbitDTO = (rabbit) => ({
    id: rabbit.id,
    code: rabbit.code,
    name: rabbit.name,
    race: rabbit.race,
    sex: rabbit.sex,
    birthDate: rabbit.birthDate,
    age: rabbit.age,
    weight: parseFloat(rabbit.weight),
    purpose: rabbit.purpose,
    imageUrl: rabbit.imageUrl
});

module.exports = { toRabbitDTO };
