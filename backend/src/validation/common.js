import { param, query } from 'express-validator';

/** Reusable request validators shared by REST route modules. */
export const intId = (field) => param(field).isInt({ min: 1 }).toInt();
export const paginationRules = () => [
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 })
];

export const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
export const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
