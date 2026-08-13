// Datos de parques: id = ID en la API de Queue-Times.com (https://queue-times.com/parks.json)
const PARK_GROUPS = [
  {
    group: "España",
    parks: [
      { id: 298, name: "Parque Warner Madrid" },
      { id: 321, name: "Parque de Atracciones de Madrid" },
      { id: 19, name: "PortAventura Park" },
      { id: 277, name: "Ferrari Land" },
    ],
  },
  {
    group: "Francia",
    parks: [
      { id: 9, name: "Parc Astérix" },
      { id: 4, name: "Disneyland Park Paris" },
      { id: 28, name: "Disney Adventure World Paris" },
    ],
  },
  {
    group: "Reino Unido",
    parks: [
      { id: 1, name: "Alton Towers" },
      { id: 2, name: "Thorpe Park" },
    ],
  },
  {
    group: "Alemania · Bélgica · Holanda · Polonia",
    parks: [
      { id: 51, name: "Europa-Park" },
      { id: 56, name: "Phantasialand" },
      { id: 160, name: "Efteling" },
      { id: 53, name: "Walibi Holland" },
      { id: 14, name: "Walibi Belgium" },
      { id: 317, name: "Energylandia" },
    ],
  },
  {
    group: "Walt Disney World (Orlando)",
    parks: [
      { id: 6, name: "Magic Kingdom" },
      { id: 5, name: "Epcot" },
      { id: 7, name: "Hollywood Studios" },
      { id: 8, name: "Animal Kingdom" },
    ],
  },
  {
    group: "Universal Orlando Resort",
    parks: [
      { id: 64, name: "Islands of Adventure" },
      { id: 65, name: "Universal Studios Florida" },
      { id: 334, name: "Epic Universe" },
      { id: 67, name: "Universal Volcano Bay" },
    ],
  },
  {
    group: "Japón",
    parks: [
      { id: 274, name: "Tokyo Disneyland" },
      { id: 275, name: "Tokyo DisneySea" },
      { id: 284, name: "Universal Studios Japan" },
    ],
  },
];

// Lista plana para búsquedas rápidas por id
const PARKS_BY_ID = Object.fromEntries(
  PARK_GROUPS.flatMap((g) => g.parks).map((p) => [p.id, p])
);
