import ephemeris from 'ephemeris';

// lat 41, lon 28.9 is roughly Istanbul
const result = ephemeris.getAllPlanets(new Date('1990-05-15T12:00:00Z'), 28.9, 41.0, 0);

console.log(Object.keys(result.observed));
console.log("Venus:", result.observed.venus.apparentLongitudeDd);
console.log("Mars:", result.observed.mars.apparentLongitudeDd);

// Let's see if ascendant or houses are available
console.log(result.houses);
