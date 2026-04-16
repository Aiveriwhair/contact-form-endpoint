import { body } from 'express-validator';

export const contactValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('The name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('The name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('The email is required')
    .isEmail()
    .withMessage('The email must be valid')
    .normalizeEmail(),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('The subject is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('The subject must be between 3 and 200 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('The message is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('The message must be between 10 and 5000 characters'),

  body('context').optional().isObject().withMessage('The context must be a valid JSON object'),
  body('template')
    .optional()
    .isString()
    .isIn(['default', 'detailed', 'minimal'])
    .withMessage('The template must be: default, detailed, or minimal'),
];
