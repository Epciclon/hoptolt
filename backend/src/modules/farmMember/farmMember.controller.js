const catchAsync = require('../../common/middlewares/catchAsync');
const farmMemberService = require('./farmMember.service');
const { toFarmMemberDTO } = require('../../common/dtos/farmMember.dto');

exports.getWorkersByGalpon = catchAsync(async (req, res) => {
    const workers = await farmMemberService.getWorkersByGalpon(
        Number(req.params.galponId),
        req.user.id
    );
    res.status(200).json({ success: true, workers: workers.map(toFarmMemberDTO) });
});

exports.getMembershipsForMe = catchAsync(async (req, res) => {
    const memberships = await farmMemberService.getMembershipsForUser(req.user.id);
    res.status(200).json({ success: true, memberships: memberships.map(toFarmMemberDTO) });
});

exports.getWorkerById = catchAsync(async (req, res) => {
    const member = await farmMemberService.getWorkerById(
        Number(req.params.id),
        req.user.id
    );
    res.status(200).json({ success: true, worker: toFarmMemberDTO(member) });
});

exports.updateWorker = catchAsync(async (req, res) => {
    const member = await farmMemberService.updateWorker(
        Number(req.params.id),
        req.body,
        req.user.id
    );
    res.status(200).json({ success: true, message: 'Trabajador actualizado.', worker: toFarmMemberDTO(member) });
});

exports.removeWorker = catchAsync(async (req, res) => {
    await farmMemberService.removeWorker(Number(req.params.id), req.user.id);
    res.status(200).json({ success: true, message: 'Trabajador desvinculado del galpón exitosamente.' });
});
