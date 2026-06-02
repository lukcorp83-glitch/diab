const r = 40;
const a = 6;
const n = 16; // 16 petals
let path = '';
for (let i = 0; i <= 360; i += 2) {
  const rad = (i * Math.PI) / 180;
  const radius = r + a * Math.cos(n * rad);
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);
  if (i === 0) path += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
  else path += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
}
path += 'Z';
console.log(path);
