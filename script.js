const fs = require('fs');

const path = 'src/components/GlucoseChart.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Lucide imports
content = content.replace(
    /import { Plus, Minus, Maximize2, Move, Droplets, Signal } from 'lucide-react';/,
    import { Plus, Minus, Maximize2, Move, Droplets, Signal, Apple, Syringe, Activity } from 'lucide-react';
);

// 2. Refactor Glucose Line drawing to use quadratic curves and Neon Glow
content = content.replace(
    /      ctx\.beginPath\(\);\s+let firstG = true;\s+for \(const d of chartData\) {\s+if \(d\.glucose !== undefined && !isNaN\(d\.glucose\)\) {\s+const x = getX\(d\.timestamp\);\s+const y = getY\(d\.glucose\);\s+if \(firstG\) { ctx\.moveTo\(x, y\); firstG = false; }\s+else ctx\.lineTo\(x, y\);\s+}\s+}\s+ctx\.strokeStyle = lineGrad;\s+ctx\.lineWidth = 3;\s+ctx\.stroke\(\);/g,
          const gPts = chartData.filter(d => d.glucose !== undefined && !isNaN(d.glucose)).map(d => ({ x: getX(d.timestamp), y: getY(d.glucose) }));
      ctx.beginPath();
      if (gPts.length > 0) {
        ctx.moveTo(gPts[0].x, gPts[0].y);
        for (let i = 1; i < gPts.length - 1; i++) {
          const xc = (gPts[i].x + gPts[i + 1].x) / 2;
          const yc = (gPts[i].y + gPts[i + 1].y) / 2;
          ctx.quadraticCurveTo(gPts[i].x, gPts[i].y, xc, yc);
        }
        if (gPts.length > 1) {
          ctx.lineTo(gPts[gPts.length-1].x, gPts[gPts.length-1].y);
        }
      }
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3;
      if (isDark) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(129, 140, 248, 0.6)';
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
);

// 3. Refactor Tooltip Lucide Icons
content = content.replace(
    /<span className="text-indigo-400 font-bold text-xs">\{t\('auto\.bolus', \{ defaultValue: '💉 Bolus:' \}\)\}<\/span>/,
    <Syringe size={14} className="text-indigo-400" /> <span className="text-indigo-400 font-bold text-xs">{t('auto.bolus', { defaultValue: 'Bolus:' })}</span>
);

content = content.replace(
    /<span className="text-amber-400 font-bold text-xs">\{t\('auto\.węgle', \{ defaultValue: i18n\.t\('auto\.wegle', \{ defaultValue: "🍽️ Węgle:" \}\) \}\)\}<\/span>/,
    <Apple size={14} className="text-amber-400" /> <span className="text-amber-400 font-bold text-xs">{t('auto.węgle', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}</span>
);

// 4. Add Haptics to scrubbing
content = content.replace(
    /       setCrosshair\(\{ x: clickX, data: closestData, tClick \}\);/,
           // Haptic feedback when scrubbing over an event
       if (!crosshair || crosshair.data.timestamp !== closestData.timestamp) {
          if (closestData.bolusVal || closestData.mealVal || closestData.siteVal) {
             Haptics.selectionStart();
          }
       }
       setCrosshair({ x: clickX, data: closestData, tClick });
);

// 5. ML Prediction Line smoothing
content = content.replace(
    /         ctx\.beginPath\(\);\s+let first = true;\s+for \(const d of chartData\) {\s+if \(d\.mlPrediction !== undefined\) {\s+const x = getX\(d\.timestamp\);\s+const y = getY\(d\.mlPrediction\);\s+if \(first\) { ctx\.moveTo\(x, y\); first = false; }\s+else ctx\.lineTo\(x, y\);\s+}\s+}/g,
             const mPts = chartData.filter(d => d.mlPrediction !== undefined).map(d => ({ x: getX(d.timestamp), y: getY(d.mlPrediction) }));
         ctx.beginPath();
         if (mPts.length > 0) {
           ctx.moveTo(mPts[0].x, mPts[0].y);
           for (let i = 1; i < mPts.length - 1; i++) {
             const xc = (mPts[i].x + mPts[i + 1].x) / 2;
             const yc = (mPts[i].y + mPts[i + 1].y) / 2;
             ctx.quadraticCurveTo(mPts[i].x, mPts[i].y, xc, yc);
           }
           if (mPts.length > 1) ctx.lineTo(mPts[mPts.length-1].x, mPts[mPts.length-1].y);
         }
);

fs.writeFileSync(path, content, 'utf8');
console.log('GlucoseChart.tsx refactored successfully.');
