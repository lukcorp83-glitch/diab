export function clampSafeBolus(
  proposedDose: number,
  currentBg: number,
  carbs: number, // Węglowodany w posiłku (g)
  iob: number, // Active Insulin (j.)
  cob: number, // Active Carbs (g)
  isf: number, // Insulin Sensitivity Factor (mg/dL per unit)
  wwRatio: number, // WWRatio (Carb ratio - g of carbs per unit)
  targetMin: number = 70 // Minimalna bezpieczna glikemia (mg/dL)
): { safeDose: number; capped: boolean; reason?: string; maxSafeDose: number } {
  // 1. Zabezpieczenie przed zerowymi/ujemnymi współczynnikami
  if (isf <= 0 || wwRatio <= 0) {
    return { safeDose: proposedDose, capped: false, maxSafeDose: proposedDose };
  }

  // 2. Ile przestrzeni (mg/dL) mamy do minimalnej bezpiecznej granicy?
  // Jeśli currentBg to 150, a targetMin to 70, to możemy spaść o 80 mg/dL.
  // Jeśli currentBg to 60, bgDropAllowed wynosi -10 mg/dL.
  const bgDropAllowed = currentBg - targetMin;
  
  // Przeliczamy to na insulinę. Ile insuliny możemy przyjąć "za darmo" zanim spadniemy poniżej 70?
  const insulinForBgDrop = bgDropAllowed / isf;

  // 3. Zapotrzebowanie z węglowodanów (teraz i w brzuchu)
  // Węglowodany, które zjemy podbiją nam cukier, więc możemy na nie wziąć insulinę.
  const insulinForCarbs = carbs / wwRatio;
  const insulinForCob = cob / wwRatio;

  // 4. Całkowite fizjologiczne maksimum zapotrzebowania na insulinę
  // To suma wszystkiego co nam potrzebne, MINUS to, co już w sobie mamy (IOB).
  let maxSafeDose = insulinForBgDrop + insulinForCarbs + insulinForCob - iob;

  // Matematycznie dawka nie może być ujemna
  maxSafeDose = Math.max(0, maxSafeDose);

  // 5. Filtr ucinający halucynacje AI (Inductive Bias Constraint)
  if (proposedDose > maxSafeDose) {
    // Jeśli z jakiegoś powodu różnica jest gigantyczna (np. AI proponuje 10, a bezpiecznie można 0.5),
    // to model zhalucynował. Obcinamy brutalnie do maxSafeDose.
    
    // Zaokrąglenie do 2 miejsc po przecinku
    const roundedMaxSafe = Math.round(maxSafeDose * 100) / 100;
    
    return {
      safeDose: roundedMaxSafe,
      maxSafeDose: roundedMaxSafe,
      capped: true,
      reason: `Zabezpieczenie fizjologiczne: Zablokowano próbę podania ${proposedDose.toFixed(2)} j. ze względu na ryzyko głębokiej hipoglikemii. Zredukowano do bezpiecznej granicy ${roundedMaxSafe} j.`
    };
  }

  return {
    safeDose: proposedDose,
    maxSafeDose: Math.round(maxSafeDose * 100) / 100,
    capped: false
  };
}
