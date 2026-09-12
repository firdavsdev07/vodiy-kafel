import localImages from './image-assets.json' with { type: 'json' }

/**
 * Manufacturer reference imagery for the local demonstration catalogue.
 * Sources and rights status are documented in ASSETS.md. These are material
 * references, not photographs of Vodiy Kafel inventory or its showroom.
 */
const BASE = 'https://www.marazzi.it/app/uploads/collezioni/'
const surface = (collection, code) => `${BASE}${collection}-${code}/marazzi_${collection.replaceAll('-', '_')}_${code}.jpg`
const room = (collection, code) => `${BASE}${collection}/marazzi_${collection.replaceAll('-', '_')}_${code}.jpg`

export const MARBLE = ['m4l1', 'm4l2', 'm4lf', 'm4lg', 'm4ln', 'm4lr', 'm4lu', 'm4lz', 'm4m2', 'm4nu', 'm4nv', 'm4nw', 'm4ny', 'm4nz', 'm4p2'].map(code => surface('marbleplay', code))
export const TRAVERTINE = ['m99q', 'm99r', 'm99s', 'm9ek', 'm9el', 'm9em', 'm99q', 'm99r', 'm99s'].map(code => surface('mystone-travertino', code))
export const TILE = [...MARBLE]
export const INTERIOR = ['009','010','011','012','014','015','018','019','021','022','023','024','026','028','029'].map(code => room('mystone-travertino', code))
export const BATH = ['000','001','002','006','008','009','011','012','013','014','016','017','018','019','020'].map(code => room('marbleplay', code))

export function img(id) {
  if (localImages[id]) return localImages[id]
  if (id?.includes('/mystone-travertino/')) return localImages[INTERIOR[0]]
  if (id?.includes('/marbleplay/')) return localImages[BATH[1]]
  return localImages[MARBLE[0]]
}
export function imgSrcSet() { return undefined }
export function imgTiny(id) { return img(id) }
