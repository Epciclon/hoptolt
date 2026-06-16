const Cage               = require('./cage.model');
const Rabbit             = require('./rabbit.model');
const Race               = require('./race.model');
const Assignment         = require('./assignment.model');
const Galpon             = require('./galpon.model');
const Genealogy          = require('./genealogy.model');
const Feeding            = require('./feeding.model');
const Vaccination        = require('./vaccination.model');
const Deworming          = require('./deworming.model');
const Growth             = require('./growth.model');
const Cleaning           = require('./cleaning.model');
const Mortality          = require('./mortality.model');
const Reproduction       = require('./reproduction.model');
// Nuevos modelos
const Profile            = require('./profile.model');
const FarmMember         = require('./farmMember.model');
const WorkerPermission   = require('./workerPermission.model');
const WorkerCage         = require('./workerCage.model');
const Invitation         = require('./invitation.model');
const Notification       = require('./notification.model');
const AuditLog           = require('./audit.model');

// ─── Relaciones existentes ───────────────────────────────────────────────────
Cage.hasMany(Assignment, { foreignKey: 'cageId', sourceKey: 'id', as: 'assignments' });
Assignment.belongsTo(Cage, { foreignKey: 'cageId', targetKey: 'id', as: 'cage' });

// Rabbit y Cage se relacionan a través de Assignment, no directamente
Rabbit.hasMany(Assignment, { foreignKey: 'rabbitId', sourceKey: 'id', as: 'assignments' });
Assignment.belongsTo(Rabbit, { foreignKey: 'rabbitId', targetKey: 'id', as: 'rabbit' });

Cage.hasMany(Feeding, { foreignKey: 'cageId', sourceKey: 'id' });
Feeding.belongsTo(Cage, { foreignKey: 'cageId', targetKey: 'id', as: 'cage' });

Rabbit.hasMany(Vaccination, { foreignKey: 'rabbitId', sourceKey: 'id' });
Vaccination.belongsTo(Rabbit, { foreignKey: 'rabbitId', targetKey: 'id' });

Rabbit.hasMany(Deworming, { foreignKey: 'rabbitId', sourceKey: 'id' });
Deworming.belongsTo(Rabbit, { foreignKey: 'rabbitId', targetKey: 'id' });

Rabbit.hasMany(Growth, { foreignKey: 'rabbitId', sourceKey: 'id' });
Growth.belongsTo(Rabbit, { foreignKey: 'rabbitId', targetKey: 'id' });

Rabbit.hasMany(Mortality, { foreignKey: 'rabbitId', sourceKey: 'id' });
Mortality.belongsTo(Rabbit, { foreignKey: 'rabbitId', targetKey: 'id' });

Rabbit.hasMany(Reproduction, { foreignKey: 'femaleId', sourceKey: 'id' });
Reproduction.belongsTo(Rabbit, { foreignKey: 'femaleId', targetKey: 'id', as: 'female' });

Rabbit.hasMany(Reproduction, { foreignKey: 'maleId', sourceKey: 'id' });
Reproduction.belongsTo(Rabbit, { foreignKey: 'maleId', targetKey: 'id', as: 'male' });

Cage.hasMany(Cleaning, { foreignKey: 'cageId', sourceKey: 'id' });
Cleaning.belongsTo(Cage, { foreignKey: 'cageId', targetKey: 'id' });
Profile.hasMany(Cleaning, { foreignKey: 'profileId', as: 'cleanings' });
Cleaning.belongsTo(Profile, { foreignKey: 'profileId', as: 'profile' });
Profile.hasMany(Mortality, { foreignKey: 'profileId', as: 'mortalities' });
Mortality.belongsTo(Profile, { foreignKey: 'profileId', as: 'profile' });

Galpon.hasMany(Cage, { foreignKey: 'galponId' });
Cage.belongsTo(Galpon, { foreignKey: 'galponId' });

Galpon.hasMany(Rabbit, { foreignKey: 'galponId' });
Rabbit.belongsTo(Galpon, { foreignKey: 'galponId' });

Rabbit.hasMany(Genealogy, { foreignKey: 'rabbitId', sourceKey: 'id' });
Genealogy.belongsTo(Rabbit, { foreignKey: 'rabbitId', targetKey: 'id', as: 'rabbit' });

Genealogy.belongsTo(Rabbit, { foreignKey: 'fatherId', targetKey: 'id', as: 'father' });
Genealogy.belongsTo(Rabbit, { foreignKey: 'motherId', targetKey: 'id', as: 'mother' });

// ─── Relaciones nuevas (Auth / FarmMembers / Invitations) ───────────────────

// Un Profile tiene muchos Galpones (owner)
Profile.hasMany(Galpon, { foreignKey: 'profileId', as: 'galpones' });
Galpon.belongsTo(Profile, { foreignKey: 'profileId', as: 'owner' });

// Un Profile tiene muchos FarmMembers (pertenece a múltiples galpones con roles distintos)
Profile.hasMany(FarmMember, { foreignKey: 'profileId', as: 'memberships' });
FarmMember.belongsTo(Profile, { foreignKey: 'profileId', as: 'profile' });

// Un Galpon tiene muchos FarmMembers
Galpon.hasMany(FarmMember, { foreignKey: 'galponId', as: 'members' });
FarmMember.belongsTo(Galpon, { foreignKey: 'galponId', as: 'galpon' });

// Un FarmMember (worker) tiene muchos WorkerPermissions
FarmMember.hasMany(WorkerPermission, { foreignKey: 'farmMemberId', as: 'permissions' });
WorkerPermission.belongsTo(FarmMember, { foreignKey: 'farmMemberId', as: 'member' });

// Un FarmMember (worker) tiene muchos WorkerCages
FarmMember.hasMany(WorkerCage, { foreignKey: 'farmMemberId', as: 'assignedCages' });
WorkerCage.belongsTo(FarmMember, { foreignKey: 'farmMemberId', as: 'member' });

// Una Cage puede estar asignada a múltiples WorkerCages
Cage.hasMany(WorkerCage, { foreignKey: 'cageId', as: 'workerAssignments' });
WorkerCage.belongsTo(Cage, { foreignKey: 'cageId', as: 'cage' });

// Un Galpon tiene muchas Invitations
Galpon.hasMany(Invitation, { foreignKey: 'galponId', as: 'invitations' });
Invitation.belongsTo(Galpon, { foreignKey: 'galponId', as: 'galpon' });

// Un Profile (invitador) tiene muchas Invitations
Profile.hasMany(Invitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
Invitation.belongsTo(Profile, { foreignKey: 'invitedBy', as: 'inviter' });

// Un Profile tiene muchas Notifications
Profile.hasMany(Notification, { foreignKey: 'profileId', as: 'notifications' });
Notification.belongsTo(Profile, { foreignKey: 'profileId', as: 'profile' });

module.exports = {
    Cage,
    Rabbit,
    Race,
    Assignment,
    Galpon,
    Genealogy,
    Feeding,
    Vaccination,
    Deworming,
    Growth,
    Cleaning,
    Mortality,
    Reproduction,
    Profile,
    FarmMember,
    WorkerPermission,
    WorkerCage,
    Invitation,
    Notification,
    AuditLog
};
