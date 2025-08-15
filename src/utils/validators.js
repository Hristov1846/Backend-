const { Joi, celebrate, Segments } = require('celebrate');

const email = Joi.string().email().max(254).required();
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/)      // главна буква
  .pattern(/[a-z]/)      // малка буква
  .pattern(/\d/)         // цифра
  .pattern(/[^A-Za-z0-9]/) // специален символ
  .required();

exports.registerValidator = celebrate({
  [Segments.BODY]: Joi.object({
    name: Joi.string().min(2).max(60).required(),
    email,
    password,
    birthDate: Joi.date().iso().less('now').required(),
    termsAccepted: Joi.boolean().valid(true).required()
  })
});

exports.loginValidator = celebrate({
  [Segments.BODY]: Joi.object({
    email,
    password: Joi.string().required()
  })
});
