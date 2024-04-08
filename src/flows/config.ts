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
