const catchAsync = require('../../common/middlewares/catchAsync');
const genealogyService = require('./genealogy.service');
const { toGenealogyDTO } = require('../../common/dtos/genealogy.dto');

exports.registerGenealogy = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const genealogy = await genealogyService.registerGenealogy(req.body, galponId);
    res.status(201).json({ success: true, message: 'Relación genealógica registrada exitosamente.', genealogy: toGenealogyDTO(genealogy) });
});

exports.getGenealogy = catchAsync(async (req, res) => {
    const genealogy = await genealogyService.getGenealogy(req.params.rabbitId);
    res.status(200).json({ success: true, genealogy: genealogy ? toGenealogyDTO(genealogy) : null });
});

exports.getAllGenealogies = catchAsync(async (req, res) => {
    const genealogies = await genealogyService.getAllGenealogies(req.galponId);
    res.status(200).json({ success: true, genealogies: genealogies.map(toGenealogyDTO) });
});

exports.editGenealogy = catchAsync(async (req, res) => {
    const genealogy = await genealogyService.editGenealogy(req.params.rabbitId, req.body);
    res.status(200).json({ success: true, message: 'Relación genealógica actualizada exitosamente.', genealogy: toGenealogyDTO(genealogy) });
});

exports.getGenealogyTree = catchAsync(async (req, res) => {
    const tree = await genealogyService.getGenealogyTree(req.params.rabbitId, req.query.levels || 3);
    res.status(200).json({ success: true, tree });
});

exports.checkConsanguinity = catchAsync(async (req, res) => {
    const id1 = Number.parseInt(req.params.id1, 10);
    const id2 = Number.parseInt(req.params.id2, 10);
    const areRelated = await genealogyService.checkConsanguinity(id1, id2);
    res.status(200).json({ success: true, areRelated });
});
