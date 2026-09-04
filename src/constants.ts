import { UserSettings } from "./types";
﻿import { Product } from './types';
import i18n from "./i18n";

export const APP_VERSION = '6.0.38';
export const CURRENT_VERSION = '6.0.38';

export const GLIKOSENSE_VERSION = '1.3.1';
export const REQUIRED_GLIKOSENSE_VERSION = '1.3.1';
export const FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/4442689766059238/';
export const FACEBOOK_GROUP_URL_EN = 'https://www.facebook.com/groups/1548051880440593/';

export const CATEGORIES = [
  "Owoce i Warzywa",
  i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) }),
  i18n.t('auto.nabial', { defaultValue: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) }),
  i18n.t('auto.mieso_i_ryby', { defaultValue: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) }),
  i18n.t('auto.gotowe_posilki', { defaultValue: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) }),
  i18n.t('auto.slodycze_i_przekaski', { defaultValue: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) }),
  "Inne"
];

export const MEDICAL_DICTIONARY: Record<string, { name: string; namePl?: string; nameEn?: string; category: "insulin" | "sensors" | "infusion_sets" | "reservoirs" | "strips" | "other" }> = {
  // Insuliny
  "5909990451814": { name: "NovoRapid Penfill", namePl: "NovoRapid Penfill", nameEn: "NovoRapid Penfill", category: "insulin" },
  "5712249127619": { name: "NovoRapid FlexPen", namePl: "NovoRapid FlexPen", nameEn: "NovoRapid FlexPen", category: "insulin" },
  "5909991306298": { name: "Fiasp Penfill", namePl: "Fiasp Penfill", nameEn: "Fiasp Penfill", category: "insulin" },
  "5712249127527": { name: "Fiasp FlexTouch", namePl: "Fiasp FlexTouch", nameEn: "Fiasp FlexTouch", category: "insulin" },
  "5909991402280": { name: "Lyumjev KwikPen", namePl: "Lyumjev KwikPen", nameEn: "Lyumjev KwikPen", category: "insulin" },
  "5909991402273": { name: "Lyumjev Junior KwikPen", namePl: "Lyumjev Junior KwikPen", nameEn: "Lyumjev Junior KwikPen", category: "insulin" },
  "5909990692422": { name: "Humalog Penfill", namePl: "Humalog Penfill", nameEn: "Humalog Penfill", category: "insulin" },
  "0300028799598": { name: "Humalog KwikPen", namePl: "Humalog KwikPen", nameEn: "Humalog KwikPen", category: "insulin" },
  "5909990930777": { name: "Liprolog KwikPen", namePl: "Liprolog KwikPen", nameEn: "Liprolog KwikPen", category: "insulin" },
  "5909990930760": { name: "Liprolog Penfill", namePl: "Liprolog Penfill", nameEn: "Liprolog Penfill", category: "insulin" },
  "5909991208929": { name: "Liprolog Junior KwikPen", namePl: "Liprolog Junior KwikPen", nameEn: "Liprolog Junior KwikPen", category: "insulin" },
  "5909990038817": { name: "Gensulin R (Wkłady)", namePl: "Gensulin R (Wkłady)", nameEn: "Gensulin R (Wkłady)", category: "insulin" },
  "5909990038824": { name: "Gensulin N (Wkłady)", namePl: "Gensulin N (Wkłady)", nameEn: "Gensulin N (Wkłady)", category: "insulin" },
  "5909990422111": { name: "Actrapid Penfill", namePl: "Actrapid Penfill", nameEn: "Actrapid Penfill", category: "insulin" },
  "5909990692514": { name: "Humulin R (Wkłady)", namePl: "Humulin R (Wkłady)", nameEn: "Humulin R (Wkłady)", category: "insulin" },
  "5909990962778": { name: "Lantus SoloStar", namePl: "Lantus SoloStar", nameEn: "Lantus SoloStar", category: "insulin" },
  "5909990962761": { name: i18n.t('auto.lantus_wklad', { defaultValue: i18n.t('auto.lantus_wklad', { defaultValue: "Lantus Wkład" }) }), category: "insulin" },
  "5909991206109": { name: "Toujeo SoloStar", namePl: "Toujeo SoloStar", nameEn: "Toujeo SoloStar", category: "insulin" },
  "5909991136451": { name: "Tresiba FlexTouch", namePl: "Tresiba FlexTouch", nameEn: "Tresiba FlexTouch", category: "insulin" },
  "5909991136420": { name: "Tresiba Penfill", namePl: "Tresiba Penfill", nameEn: "Tresiba Penfill", category: "insulin" },
  "5909990715978": { name: "Levemir FlexPen", namePl: "Levemir FlexPen", nameEn: "Levemir FlexPen", category: "insulin" },
  "5909990715992": { name: "Levemir Penfill", namePl: "Levemir Penfill", nameEn: "Levemir Penfill", category: "insulin" },
  "5909990970636": { name: "Apidra SoloStar", namePl: "Apidra SoloStar", nameEn: "Apidra SoloStar", category: "insulin" },
  "5909990861118": { name: "Abasaglar KwikPen", namePl: "Abasaglar KwikPen", nameEn: "Abasaglar KwikPen", category: "insulin" },

  // Sensory
  "5021791002504": { name: "FreeStyle Libre 2 (Sensor)", namePl: "FreeStyle Libre 2 (Sensor)", nameEn: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "5021791000876": { name: "FreeStyle Libre 2 (Sensor)", namePl: "FreeStyle Libre 2 (Sensor)", nameEn: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "5021791001033": { name: "FreeStyle Libre 2 (Sensor)", namePl: "FreeStyle Libre 2 (Sensor)", nameEn: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "5021791001316": { name: "FreeStyle Libre 2 (Sensor)", namePl: "FreeStyle Libre 2 (Sensor)", nameEn: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "00386270000866": { name: "Dexcom G6 Sensor (3-pack)", namePl: "Dexcom G6 Sensor (3-pack)", nameEn: "Dexcom G6 Sensor (3-pack)", category: "sensors" },
  "00386270001047": { name: "Dexcom G6 Sensor", namePl: "Dexcom G6 Sensor", nameEn: "Dexcom G6 Sensor", category: "sensors" },
  "00386270004062": { name: "Dexcom G7 Sensor", namePl: "Dexcom G7 Sensor", nameEn: "Dexcom G7 Sensor", category: "sensors" },
  "00763000519698": { name: "Guardian 4 Sensor", namePl: "Guardian 4 Sensor", nameEn: "Guardian 4 Sensor", category: "sensors" },
  "20763000519692": { name: "Guardian 4 Sensor (5-pack)", namePl: "Guardian 4 Sensor (5-pack)", nameEn: "Guardian 4 Sensor (5-pack)", category: "sensors" },
  "00763000046552": { name: "Guardian 3 Sensor", namePl: "Guardian 3 Sensor", nameEn: "Guardian 3 Sensor", category: "sensors" },

  // Paski i Wkłucia
  "4015630066804": { name: "Accu-Chek Performa (50)", namePl: "Accu-Chek Performa (50)", nameEn: "Accu-Chek Performa (50)", category: "strips" },
  "4015630066828": { name: "Accu-Chek Instant (50)", namePl: "Accu-Chek Instant (50)", nameEn: "Accu-Chek Instant (50)", category: "strips" },
  "5016003728308": { name: "Contour Plus (50)", namePl: "Contour Plus (50)", nameEn: "Contour Plus (50)", category: "strips" },
  "00381370046049": { name: "OneTouch Select Plus (50)", namePl: "OneTouch Select Plus (50)", nameEn: "OneTouch Select Plus (50)", category: "strips" },
  "00763000046545": { name: i18n.t('auto.medtronic_mio_advance_wklucia', { defaultValue: i18n.t('auto.medtronic_mio_advance_wkl', { defaultValue: "Medtronic Mio Advance (Wkłucia)" }) }), category: "infusion_sets" },
  "00763000046569": { name: i18n.t('auto.medtronic_quick_set_wklucia', { defaultValue: i18n.t('auto.medtronic_quick_set_wkluc', { defaultValue: "Medtronic Quick-Set (Wkłucia)" }) }), category: "infusion_sets" },
  "00763000046576": { name: i18n.t('auto.medtronic_silhouette_wklucia', { defaultValue: i18n.t('auto.medtronic_silhouette_wklu', { defaultValue: "Medtronic Silhouette (Wkłucia)" }) }), category: "infusion_sets" }
};

export function extractGTIN(barcode: string): string {
  if (!barcode) return barcode;
  
  // Remove GS1 symbology identifiers (e.g., ]d2, ]C1)
  let cleaned = barcode.replace(/^\][a-zA-Z0-9]{2}/, '');
  
  // Handle brackets or parentheses around the 01 Application Identifier
  // sometimes scanners return [01] or (01) instead of 01
  cleaned = cleaned.replace(/^[\[\(]01[\]\)]/, '01');

  // Look for (01) AI followed by 14 digits
  const gtinMatch = cleaned.match(/(?:^|\D)01(\d{14})/);
  if (gtinMatch) {
      return gtinMatch[1];
  }
  
  // Simple 01 prefix with at least 14 digits
  if (cleaned.startsWith("01") && cleaned.length >= 16) {
      return cleaned.substring(2, 16);
  }

  // Fallback: extract the first 13 or 14 consecutive digits
  const digitsMatch = cleaned.match(/(\d{13,14})/);
  if (digitsMatch) {
      return digitsMatch[1];
  }

  return barcode;
}

export function lookupMedicalDictionary(gtin: string) {
  if (MEDICAL_DICTIONARY[gtin]) return MEDICAL_DICTIONARY[gtin];
  if (gtin.length === 14 && gtin.startsWith('0') && MEDICAL_DICTIONARY[gtin.substring(1)]) {
      return MEDICAL_DICTIONARY[gtin.substring(1)];
  }
  if (gtin.length === 13 && MEDICAL_DICTIONARY['0' + gtin]) {
      return MEDICAL_DICTIONARY['0' + gtin];
  }
  return null;
}







export const DEFAULT_SETTINGS: UserSettings = {
 isf: 58,
 wwRatio: 16,
 wbtRatio: 18,
 targetMin: 70,
 targetMax: 140,
 dia: 4,
 showPrediction: true,
 notificationsEnabled: true,
 weatherWidgetEnabled: true,
 weatherNeuralEnabled: true,
 glassmorphismEnabled: false,
 material3Enabled: false,
 treatmentMode: (localStorage.getItem("treatmentMode") as 'diet_only' | 'insulin' | 'pump') || 'insulin',
};




