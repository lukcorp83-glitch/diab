const fs = require('fs');

const r = 48;
const n = 4; // 4 petals
let path = '';
for (let i = 0; i <= 360; i += 5) {
  const rad = (i * Math.PI) / 180;
  // Radius varies harmonically: r(theta) = R + A * cos(n * theta)
  const radius = 38 + 10 * Math.cos(4 * rad);
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);
  if (i === 0) path += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
  else path += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
}
path += 'Z';
console.log(path);
