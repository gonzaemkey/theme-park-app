// Misma lista que parks.js (frontend), pero como módulo ES para usar desde /api.
// Se mantiene duplicada a propósito: parks.js lo carga el navegador como script
// clásico (sin "export"), así que no se puede compartir directamente sin romperlo.
export const PARK_IDS = [
  298, 321, 19, 277, // España
  9, 4, 28, // Francia
  1, 2, // Reino Unido
  51, 56, 160, 53, 14, 317, // Alemania · Bélgica · Holanda · Polonia
  6, 5, 7, 8, // Walt Disney World
  64, 65, 334, 67, // Universal Orlando Resort
  274, 275, 284, // Japón
];
