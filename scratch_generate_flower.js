const fs = require('fs');
const numPetals = 16;
const innerRadius = 38;
const outerRadius = 45;
const cx = 50;
const cy = 50;
let path = '';

for (let i = 0; i <= numPetals; i++) {
  const angle1 = (i * 2 * Math.PI) / numPetals;
  const angle2 = ((i + 0.5) * 2 * Math.PI) / numPetals;
  const angle3 = ((i + 1) * 2 * Math.PI) / numPetals;

  const x1 = cx + innerRadius * Math.cos(angle1);
  const y1 = cy + innerRadius * Math.sin(angle1);

  const x2 = cx + outerRadius * Math.cos(angle2);
  const y2 = cy + outerRadius * Math.sin(angle2);

  const x3 = cx + innerRadius * Math.cos(angle3);
  const y3 = cy + innerRadius * Math.sin(angle3);

  if (i === 0) {
    path += M   ;
  }
  // Use a quadratic bezier curve for smoother petals
  path += Q     ;
}

console.log(path.trim());
