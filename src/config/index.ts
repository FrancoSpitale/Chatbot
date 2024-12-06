export const MAKE_ADD_TO_CALENDAR = process.env.MAKE_ADD_TO_CALENDAR ?? ''
export const MAKE_ADD_TO_CALENDAR_2 = process.env.MAKE_ADD_TO_CALENDAR_2 ?? ''
export const MAKE_GET_FROM_CALENDAR = process.env.MAKE_GET_FROM_CALENDAR ?? ''

export const CHATPDF_API = process.env.CHATPDF_API ?? ''
export const CHATPDF_KEY = process.env.CHATPDF_KEY ?? ''
export const CHATPDF_SRC = process.env.CHATPDF_SRC ?? ''

// config.js o config.ts

// La variable interna que mantendrá el estado de la duración de la reunión.
let internalDurationMeet = parseInt(process.env.DURATION_MEET, 10) || 30;

// Función para obtener la duración actual de la reunión.
export function getDurationMeet() {
  return internalDurationMeet;
}

// Función para establecer una nueva duración de la reunión.
export function setDurationMeet(newDuration) {
  internalDurationMeet = newDuration;
}


