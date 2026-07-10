/*
  Modelo User respaldado por Prisma/PostgreSQL.
  Mantiene la API que el resto del código usaba con Mongoose:
  findOne/findById/find/findByIdAndUpdate/findByIdAndDelete/updateMany,
  documentos con .save(), .comparePassword(), .toJSON() (sin campos sensibles)
  y hash de contraseña automático al crear o modificar.
*/
const bcrypt = require('bcryptjs');
const { buildDocumentClass, buildModel } = require('./compat');

const FIELDS = [
  'email', 'password', 'firstName', 'lastName', 'microsoftId',
  'accessToken', 'refreshToken', 'tokenExpiry', 'isVerified',
  'preferences', 'lastSync', 'lastReprocess', 'syncEnabled', 'isDemo',
  'gmailEmail', 'gmailAccessToken', 'gmailRefreshToken', 'gmailTokenExpiry', 'gmailLastSync',
  'esPlatinum', 'trialUsado', 'trialIniciadoEn',
  'createdAt', 'updatedAt'
];

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  currency: 'PEN',
  notifications: { email: true, push: true }
};

const UserDocument = buildDocumentClass({
  delegateName: 'user',
  fields: FIELDS,
  jsonHidden: ['password', 'accessToken', 'refreshToken', 'gmailAccessToken', 'gmailRefreshToken'],
  onBeforeSave: async (doc) => {
    // Igual que el hook pre('save') de Mongoose: hashear solo si cambió
    if (doc.password && doc.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      doc.password = await bcrypt.hash(doc.password, salt);
    }
    if (doc.$isNew) {
      if (doc.email) doc.email = String(doc.email).toLowerCase().trim();
      if (doc.preferences === undefined) doc.preferences = DEFAULT_PREFERENCES;
    }
  }
});

UserDocument.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = buildModel({
  delegateName: 'user',
  fields: FIELDS,
  DocumentClass: UserDocument
});

// Permite `new User({...})` como con Mongoose
const UserModel = function (data) {
  return new UserDocument(data, { isNew: true });
};
Object.assign(UserModel, User);

module.exports = UserModel;
