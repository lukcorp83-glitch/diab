// Evaluation & Diagnostic Testbench for GlikoSense (LSTM & Pharmacokinetic Engine)
// This script simulates the pharmacokinetic model and feature generation of glikosense.worker.ts

function calculateActiveAtTime(targetTime, pastLogs, rules) {
    let iob = 0, cob = 0, fastCobActive = 0, slowCobActive = 0, pob = 0, fob = 0;
    const pizzaMult = rules.pizzaEffectMultiplier || 1.0;
    const pkFast = rules.pkParams?.fastCarbDuration || 1.5;
    const pkNormal = rules.pkParams?.normalCarbDuration || 3.0;
    const pkSlow = rules.pkParams?.slowCarbDuration || 5.0;
    const pkInsulin = rules.pkParams?.insulinTau || 1.25;

    const cutoffTime = targetTime - (8 * 60 * 60 * 1000);
    
    const classifyMealGlycemia = (meal) => {
        const text = ((meal.description || meal.notes || meal.note || meal.nameValue || "") + " " + (meal.linkedMeal?.name || "")).toLowerCase();
        let isFastCarb = 0, isSlowCarb = 0;
        const fastKeywords = ["sok", "cukier", "glukoza", "glucose", "żel", "dextro", "miód", "honey", "cola", "słodkie", "słodki", "żelki", "banan", "dżem", "sprite", "fanta", "oranżada", "herbata z cukrem", "cukierki", "czekolada", "owoce", "juice"];
        const slowKeywords = ["pizza", "kebab", "burger", "ser", "cheese", "orzechy", "mięso", "meat", "pasta", "spaghetti", "makaron", "boczek", "frytki", "masło", "tłuszcz", "białko", "karkówka", "kiełbasa", "nuts", "chocolate"];
        if (fastKeywords.some(kw => text.includes(kw))) isFastCarb = 1;
        if (slowKeywords.some(kw => text.includes(kw))) isSlowCarb = 1;
        const protein = meal.protein || meal.linkedMeal?.protein || 0;
        const fat = meal.fat || meal.linkedMeal?.fat || 0;
        const carbs = meal.value || meal.carbs || meal.linkedMeal?.carbs || 0;
        if (protein > 15 || fat > 12) isSlowCarb = 1;
        if (carbs > 0 && (fat + protein) / carbs > 0.8) isSlowCarb = 1;
        if (carbs > 15 && (fat + protein) < 3) isFastCarb = 1;
        return { isFastCarb, isSlowCarb };
    };

    for (let i = pastLogs.length - 1; i >= 0; i--) {
        const log = pastLogs[i];
        const logTime = log.timestamp || new Date(log.createdAt).getTime();
        
        if (logTime < cutoffTime) break;
        const diffMs = targetTime - logTime;
        if (diffMs < 0) continue; 
        
        const diffHours = diffMs / (1000 * 60 * 60);
        
        const insulin = log.type === 'bolus' ? log.value : (log.insulin || 0);
        if (insulin && diffHours < 5.0) { 
            const tau = pkInsulin;
            const remaining = (1 + diffHours / tau) * Math.exp(-diffHours / tau);
            const adjustedRemaining = Math.max(0, remaining - 0.05);
            iob += insulin * adjustedRemaining;
        }
        
        const carbs = log.type === 'meal' ? log.value : (log.linkedMeal?.carbs || log.carbs || 0);
        if (carbs) {
            const { isFastCarb, isSlowCarb } = classifyMealGlycemia(log);
            let carbDuration = pkNormal * pizzaMult;
            if (isFastCarb) carbDuration = pkFast;
            else if (isSlowCarb) carbDuration = pkSlow * pizzaMult;
            
            if (diffHours < carbDuration) {
                const remaining = Math.max(0, (1 - (diffHours / carbDuration)));
                cob += carbs * remaining;
                if (isFastCarb) fastCobActive += carbs * remaining;
                else if (isSlowCarb) slowCobActive += carbs * remaining;
            }
        }

        const protein = log.type === 'meal' ? (log.protein || 0) : (log.linkedMeal?.protein || 0);
        const protDuration = pkSlow * pizzaMult;
        if (protein && diffHours < protDuration) pob += protein * Math.max(0, (1 - (diffHours / protDuration)));

        const fat = log.type === 'meal' ? (log.fat || 0) : (log.linkedMeal?.fat || 0);
        const fatDuration = (pkSlow + 2) * pizzaMult;
        if (fat && diffHours < fatDuration) fob += fat * Math.max(0, (1 - (diffHours / fatDuration)));
    }
    
    return { 
        iob: Math.max(0, iob), cob: Math.max(0, cob), fastCobActive: Math.max(0, fastCobActive),
        slowCobActive: Math.max(0, slowCobActive), pob: Math.max(0, pob), fob: Math.max(0, fob)
    };
}

function physiologicalNormalize(inputs) {
    // [bg, trend, accel, cob, fastCob, slowCob, iob, sin, cos, pob, fob, weekend, tMeal, tBolus, iobCobRatio]
    return [
        inputs[0] / 400.0,
        (inputs[1] + 15) / 30.0,
        (inputs[2] + 10) / 20.0,
        inputs[3] / 150.0,
        inputs[4] / 100.0,
        inputs[5] / 150.0,
        inputs[6] / 20.0,
        (inputs[7] + 1) / 2.0,
        (inputs[8] + 1) / 2.0,
        inputs[9] / 100.0,
        inputs[10] / 100.0,
        inputs[11],
        Math.min(1440, inputs[12]) / 360.0,
        Math.min(1440, inputs[13]) / 360.0,
        Math.min(5.0, inputs[14]) / 5.0
    ];
}

console.log("==================================================");
console.log("       GLIKOSENSE 3.0 BENCHMARK & EVALUATION      ");
console.log("==================================================\n");

const now = Date.now();
const scenarios = [
    {
        name: "1. Szybkie węglowodany (Sok glukozowy na hipo)",
        logs: [
            { type: 'meal', value: 30, description: "sok glukoza", timestamp: now - 30 * 60 * 1000, protein: 0, fat: 0 }
        ],
        rules: {}
    },
    {
        name: "2. Posiłek tłuszczowo-białkowy z Efektem Pizzy (Pizza z serem)",
        logs: [
            { type: 'meal', value: 80, description: "pizza z serem i boczkiem", timestamp: now - 2 * 60 * 60 * 1000, protein: 35, fat: 45 },
            { type: 'bolus', value: 8.0, timestamp: now - 2 * 60 * 60 * 1000 }
        ],
        rules: { pizzaEffectMultiplier: 1.2 }
    },
    {
        name: "3. Insulinooporność / Kumulacja dawki (Insulin Stacking)",
        logs: [
            { type: 'bolus', value: 6.0, timestamp: now - 3 * 60 * 60 * 1000 },
            { type: 'bolus', value: 5.0, timestamp: now - 1 * 60 * 60 * 1000 }
        ],
        rules: { insulinResistanceMultiplier: 1.15 }
    },
    {
        name: "4. Standardowy obiad z bolusem złożonym wchłaniający się prawidłowo",
        logs: [
            { type: 'meal', value: 55, description: "kurczak z ryżem", timestamp: now - 90 * 60 * 1000, protein: 25, fat: 10 },
            { type: 'bolus', value: 5.5, timestamp: now - 90 * 60 * 1000 }
        ],
        rules: {}
    }
];

scenarios.forEach((s) => {
    console.log(`▶ Scenariusz: ${s.name}`);
    const active = calculateActiveAtTime(now, s.logs, s.rules);
    console.log(`   Aktywne Węglowodany (COB): ${active.cob.toFixed(1)}g (Szybkie: ${active.fastCobActive.toFixed(1)}g, Wolne: ${active.slowCobActive.toFixed(1)}g)`);
    console.log(`   Aktywna Insulina (IOB):    ${active.iob.toFixed(2)} j.`);
    console.log(`   Aktywne Białko/Tłuszcz:    POB = ${active.pob.toFixed(1)}g, FOB = ${active.fob.toFixed(1)}g`);
    
    // Test norm
    const norm = physiologicalNormalize([140, 2.5, 0.5, active.cob, active.fastCobActive, active.slowCobActive, active.iob, 0, 1, active.pob, active.fob, 0, 90, 90, active.iob / (active.cob || 1)]);
    console.log(`   Znormalizowany wektor LSTM [BG, Trend, COB, IOB]: [${norm[0].toFixed(3)}, ${norm[1].toFixed(3)}, ${norm[3].toFixed(3)}, ${norm[6].toFixed(3)}]`);
    console.log("--------------------------------------------------\n");
});

console.log("✔ Symulacja GlikoSense Pharmacokinetic & Tensor normalization ukończona pomyślnie.");
