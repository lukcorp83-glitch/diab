const numPetals = 20;
const innerRadius = 43;
const outerRadius = 47;
const cx = 50;
const cy = 50;
let path = '';

for (let i = 0; i < numPetals; i++) {
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
    path += `M ${x1.toFixed(2)} ${y1.toFixed(2)} `;
  }
  path += `Q ${x2.toFixed(2)} ${y2.toFixed(2)} ${x3.toFixed(2)} ${y3.toFixed(2)} `;
}

console.log(path.trim() + ' Z');
