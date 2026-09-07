import { param, query } from 'express-validator';

// check valid ids
export const intId = (field) => param(field).isInt({ min: 1 }).toInt();

// check pagination
export const paginationRules = () => [
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 })
];

export const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

// check image data
export function isImageDataUrl(value) {
  return (
    value === null ||
    (typeof value === 'string' && imageDataUrlPattern.test(value))
  );
}