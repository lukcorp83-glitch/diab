const fs = require('fs');
let code = fs.readFileSync('src/components/MealPlate.tsx', 'utf8');

const replacement1 = 
    let maxChartHoursActive = 2;
    const maxCarbMultiplierActive = gI > 70 ? pkFast / 1.5 : gI < 50 ? pkSlow / 5.0 : pkNormal / 3.0;
    const maxCarbPeakActive = gI > 70 ? 0.75 : gI < 50 ? 1.5 : 1.0;
    const maxCarbTimeActive = WW > 0 ? (maxCarbPeakActive + 1.5) * maxCarbMultiplierActive : 0;
    const maxWbtTimeActive = WBT > 0 ? 5 * (pkSlow / 5.0) : 0;
    maxChartHoursActive = Math.max(maxCarbTimeActive, maxWbtTimeActive, 2);
    if (recentBoluses.length > 0) maxChartHoursActive = Math.max(maxChartHoursActive, 4);
    maxChartHoursActive = Math.ceil(maxChartHoursActive * 2) / 2;
    if (maxChartHoursActive > 8) maxChartHoursActive = 8;

    for (let currentHr = -1; currentHr <= maxChartHoursActive; currentHr += 0.5) {
;
code = code.replace(/for \(let currentHr = -1; currentHr <= 8; currentHr \+= 0\.5\) \{/, replacement1);

const replacement2 = 
          for (let step = 0; step <= maxChartHoursActive; step += 0.5)
            tCarbProfile += getCarbAbsorption(step, gI);
          let tWbtProfile = 0;
          for (let step = 0; step <= maxChartHoursActive; step += 0.5)
;
code = code.replace(/for \(let step = 0; step <= 8; step \+= 0\.5\)\s*tCarbProfile \+= getCarbAbsorption\(step, gI\);\s*let tWbtProfile = 0;\s*for \(let step = 0; step <= 8; step \+= 0\.5\)/, replacement2);


const replacement3 = 
      let maxChartHoursPlate = 2;
      const maxCarbMultiplierPlate = averageGi > 70 ? pkFast / 1.5 : averageGi < 50 ? pkSlow / 5.0 : pkNormal / 3.0;
      const maxCarbPeakPlate = averageGi > 70 ? 0.75 : averageGi < 50 ? 1.5 : 1.0;
      const maxCarbTimePlate = WW > 0 ? (maxCarbPeakPlate + 1.5) * maxCarbMultiplierPlate : 0;
      const maxWbtTimePlate = WBT > 0 ? 5 * (pkSlow / 5.0) : 0;
      maxChartHoursPlate = Math.max(maxCarbTimePlate, maxWbtTimePlate, 2);
      maxChartHoursPlate = Math.ceil(maxChartHoursPlate * 2) / 2;
      if (maxChartHoursPlate > 8) maxChartHoursPlate = 8;

      for (let currentHr = 0; currentHr <= maxChartHoursPlate; currentHr += 0.5) {
;
code = code.replace(/for \(let currentHr = 0; currentHr <= 8; currentHr \+= 0\.5\) \{/, replacement3);


const replacement4 = 
        for (let step = 0; step <= maxChartHoursPlate; step += 0.5) {
          tCarbProfile += getCarbAbsorption(step, averageGi);
        }
        let tWbtProfile = 0;
        for (let step = 0; step <= maxChartHoursPlate; step += 0.5) {
;
code = code.replace(/for \(let step = 0; step <= 8; step \+= 0\.5\) \{\s*tCarbProfile \+= getCarbAbsorption\(step, averageGi\);\s*\}\s*let tWbtProfile = 0;\s*for \(let step = 0; step <= 8; step \+= 0\.5\) \{/, replacement4);

fs.writeFileSync('src/components/MealPlate.tsx', code, 'utf8');
console.log("Done");
