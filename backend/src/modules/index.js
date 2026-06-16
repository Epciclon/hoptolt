const express = require('express');
const router = express.Router();

// Módulos existentes
router.use(require('./cage/cage.routes'));
router.use(require('./race/race.routes'));
router.use(require('./rabbit/rabbit.routes'));
router.use(require('./assignment/assignment.routes'));
router.use(require('./galpon/galpon.routes'));
router.use(require('./genealogy/genealogy.routes'));
router.use(require('./feeding/feeding.routes'));
router.use(require('./vaccination/vaccination.routes'));
router.use(require('./deworming/deworming.routes'));
router.use(require('./growth/growth.routes'));
router.use(require('./cleaning/cleaning.routes'));
router.use(require('./mortality/mortality.routes'));
router.use(require('./reproduction/reproduction.routes'));

// Módulos nuevos - Auth, FarmMembers, Invitations, Notifications
router.use(require('./auth/auth.routes'));
router.use(require('./farmMember/farmMember.routes'));
router.use(require('./invitation/invitation.routes'));
router.use('/notifications', require('./notification/notification.routes'));

module.exports = router;
