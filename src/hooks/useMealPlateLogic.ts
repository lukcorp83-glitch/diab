import { useMemo } from 'react';

export function useMealPlateLogic(plate: any[], cookingMethod: string) {
 const calculations = useMemo(() => {
 const rawCarbs = plate.reduce((s: number, i: any) => s + (i.carbs * i.weight) / 100, 0);
 const rawPolyols = plate.reduce((s: number, i: any) => s + ((i.polyols || 0) * i.weight) / 100, 0);
 const rawProtein = plate.reduce((s: number, i: any) => s + (i.protein * i.weight) / 100, 0);
 const rawFat = plate.reduce((s: number, i: any) => s + (i.fat * i.weight) / 100, 0);

 const totalWeight = plate.reduce((s: number, i: any) => s + i.weight, 0);
 const rawCals = plate.reduce((s: number, i: any) => s + (i.calories || i.kcal || i.carbs * 4 + i.protein * 4 + i.fat * 9) * (i.weight / 100), 0);

 const totalCarbs = Math.max(0, rawCarbs - rawPolyols); // Net carbs
 const totalProtein = rawProtein;
 const totalFat = cookingMethod === "fried" ? rawFat + (totalWeight / 100) * 10 : rawFat;

 const totalCalsFromMacros = totalCarbs * 4 + totalProtein * 4 + totalFat * 9;
 const totalCals = Math.max(rawCals, totalCalsFromMacros);

 const totalWW = totalCarbs / 10;
 const totalWBT = (totalProtein * 4 + totalFat * 9) / 100;

 const rawGL = plate.reduce((s: number, i: any) => {
 if (typeof i.gi !== "number") return s;
 const itemNetCarbs = Math.max(0, i.carbs - (i.polyols || 0));
 return s + (((itemNetCarbs * i.weight) / 100) * i.gi) / 100;
 }, 0);

 let avgGI = rawCarbs > 0 ? (rawGL * 100) / rawCarbs : 0;
 if (cookingMethod === "boiled") avgGI = Math.min(100, avgGI * 1.3);
 if (cookingMethod === "baked") avgGI = Math.min(100, avgGI * 1.15);
 if (cookingMethod === "blended") avgGI = Math.min(100, avgGI * 1.2);
 if (cookingMethod === "fried") avgGI = avgGI * 0.9;

 const totalGL = (totalCarbs * avgGI) / 100;

 return {
 rawCarbs, rawPolyols, rawProtein, rawFat, totalWeight, rawCals,
 totalCarbs, totalProtein, totalFat, totalCalsFromMacros, totalCals,
 totalWW, totalWBT, rawGL, avgGI, totalGL
 };
 }, [plate, cookingMethod]);

 return calculations;
}
