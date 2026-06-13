import { Product } from './types';
import i18n from "./i18n";

export const APP_VERSION = '5.3.1';
export const FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/4442689766059238/';

export const CATEGORIES = [
  "Owoce i Warzywa",
  i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }),
  i18n.t('auto.nabial', { defaultValue: "Nabiał" }),
  i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }),
  i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }),
  i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }),
  "Inne"
];

export const LIB_BASE: Product[] = [
  // Zbożowe i Pieczywo
  { id: 'p1', name: i18n.t('auto.ryz_bialy_gotowany', { defaultValue: "Ryż biały gotowany" }), carbs: 28, protein: 2.7, fat: 0.3, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p1_2', name: i18n.t('auto.ryz_brazowy_gotowany', { defaultValue: "Ryż brązowy gotowany" }), carbs: 23, protein: 2.6, fat: 0.9, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p1_3', name: i18n.t('auto.maka_pszenna_typ_500', { defaultValue: "Mąka pszenna typ 500" }), carbs: 76, protein: 10, fat: 1, gi: 85, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p1_4', name: i18n.t('auto.maka_zytnia_typ_720', { defaultValue: "Mąka żytnia typ 720" }), carbs: 70, protein: 9, fat: 1.5, gi: 45, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p1_5', name: i18n.t('auto.maka_orkiszowa_jasna', { defaultValue: "Mąka orkiszowa jasna" }), carbs: 70, protein: 14, fat: 2, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p1_6', name: i18n.t('auto.maka_orkiszowa_razowa', { defaultValue: "Mąka orkiszowa razowa" }), carbs: 63, protein: 15, fat: 2.5, gi: 45, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3', name: i18n.t('auto.chleb_zytni_pelnoziarnisty', { defaultValue: "Chleb żytni pełnoziarnisty" }), carbs: 45, protein: 6, fat: 1.5, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_0', name: "Chleb pszenny", carbs: 49, protein: 9, fat: 1.5, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_0_1', name: "Chleb orkiszowy", carbs: 46, protein: 10, fat: 2, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_0_2', name: "Chleb tostowy pszenny", carbs: 52, protein: 8, fat: 4, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_0_3', name: "Bagietka pszenna", carbs: 56, protein: 9, fat: 2, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_1', name: i18n.t('auto.bulka_pszenna_kajzerka', { defaultValue: "Bułka pszenna (kajzerka)" }), carbs: 55, protein: 8, fat: 1.5, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_1_1', name: i18n.t('auto.bulka_grahamka', { defaultValue: "Bułka grahamka" }), carbs: 50, protein: 9, fat: 1.5, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_1_2', name: "Bajgiel", carbs: 48, protein: 10, fat: 1.5, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_2', name: "Makaron pszenny jasny (gotowany)", carbs: 25, protein: 3.5, fat: 0.5, gi: 55, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_2_1', name: "Makaron spaghetti (al dente)", carbs: 24, protein: 5, fat: 1, gi: 45, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_2_2', name: "Makaron rurki (rozgotowany)", carbs: 28, protein: 4, fat: 0.5, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_3', name: "Kasza gryczana palona (gotowana)", carbs: 20, protein: 3, fat: 0.5, gi: 45, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_3_1', name: i18n.t('auto.kasza_gryczana_biala_gotowana', { defaultValue: "Kasza gryczana biała (gotowana)" }), carbs: 21, protein: 3.5, fat: 0.6, gi: 40, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_3_2', name: i18n.t('auto.kasza_peczak_gotowana', { defaultValue: "Kasza pęczak (gotowana)" }), carbs: 23, protein: 2.5, fat: 0.4, gi: 30, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_3_3', name: "Kasza bulgur (gotowana)", carbs: 18, protein: 3, fat: 0.2, gi: 45, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_4', name: i18n.t('auto.platki_owsiane_gorskie', { defaultValue: "Płatki owsiane górskie" }), carbs: 60, protein: 12, fat: 7, gi: 40, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_4_1', name: i18n.t('auto.platki_owsiane_blyskawiczne', { defaultValue: "Płatki owsiane błyskawiczne" }), carbs: 62, protein: 11, fat: 6, gi: 55, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p10', name: "Kasza jaglana (gotowana)", carbs: 23, protein: 3.5, fat: 1, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p11', name: "Kuskus (gotowany)", carbs: 23, protein: 3.8, fat: 0.2, gi: 65, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p12', name: "Tortilla pszenna", carbs: 50, protein: 8, fat: 7, gi: 65, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p12_1', name: i18n.t('auto.tortilla_pelnoziarnista', { defaultValue: "Tortilla pełnoziarnista" }), carbs: 45, protein: 9, fat: 6, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p19', name: i18n.t('auto.komosa_ryzowa_quinoa', { defaultValue: "Komosa ryżowa (Quinoa)" }), carbs: 21, protein: 4.4, fat: 2, gi: 50, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p20', name: "Chleb czystoziarnisty", carbs: 12, protein: 10, fat: 20, gi: 30, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_5', name: i18n.t('auto.platki_kukurydziane', { defaultValue: "Płatki kukurydziane" }), carbs: 84, protein: 8, fat: 1, gi: 80, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_6', name: i18n.t('auto.pieczywo_chrupkie_zytnie', { defaultValue: "Pieczywo chrupkie żytnie" }), carbs: 65, protein: 10, fat: 1.5, gi: 65, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_7', name: i18n.t('auto.makaron_pelnoziarnisty', { defaultValue: "Makaron pełnoziarnisty" }), carbs: 24, protein: 5, fat: 1, gi: 40, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_8', name: i18n.t('auto.wafle_ryzowe_naturalne', { defaultValue: "Wafle ryżowe naturalne" }), carbs: 80, protein: 8, fat: 3, gi: 85, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_9', name: i18n.t('auto.maka_migdalowa', { defaultValue: "Mąka migdałowa" }), carbs: 10, protein: 21, fat: 50, gi: 15, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_10', name: i18n.t('auto.maka_kokosowa', { defaultValue: "Mąka kokosowa" }), carbs: 21, protein: 18, fat: 15, gi: 35, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_11', name: "Makaron Konjac / Shirataki", carbs: 0.5, protein: 0, fat: 0, gi: 0, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_12', name: "Chleb proteinowy (Keto)", carbs: 7, protein: 22, fat: 14, gi: 25, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_13', name: i18n.t('auto.platki_jaglane', { defaultValue: "Płatki jaglane" }), carbs: 70, protein: 11, fat: 3, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_14', name: i18n.t('auto.tapioka_perly', { defaultValue: "Tapioka (perły)" }), carbs: 88, protein: 0.2, fat: 0, gi: 85, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_15', name: i18n.t('auto.maka_lubinowa', { defaultValue: "Mąka łubinowa" }), carbs: 12, protein: 40, fat: 10, gi: 15, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_16', name: i18n.t('auto.maka_gryczana', { defaultValue: "Mąka gryczana" }), carbs: 65, protein: 13, fat: 3, gi: 40, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_17', name: i18n.t('auto.maka_kukurydziana', { defaultValue: "Mąka kukurydziana" }), carbs: 73, protein: 7, fat: 2.5, gi: 70, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_18', name: i18n.t('auto.bulka_bezglutenowa_jasna', { defaultValue: "Bułka bezglutenowa jasna" }), carbs: 55, protein: 3, fat: 2, gi: 80, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_19', name: i18n.t('auto.platki_ryzowe', { defaultValue: "Płatki ryżowe" }), carbs: 80, protein: 7, fat: 1.5, gi: 85, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  { id: 'p3_20', name: i18n.t('auto.otreby_owsiane', { defaultValue: "Otręby owsiane" }), carbs: 45, protein: 17, fat: 7, gi: 55, category: i18n.t('auto.zbozowe_i_pieczywo', { defaultValue: "Zbożowe i Pieczywo" }) },
  
  // Owoce i Warzywa
  { id: 'p2', name: "Ziemniaki gotowane", carbs: 17, protein: 1.9, fat: 0.1, gi: 70, category: "Owoce i Warzywa" },
  { id: 'p2_1', name: "Ziemniaki pieczone", carbs: 21, protein: 2.5, fat: 0.2, gi: 85, category: "Owoce i Warzywa" },
  { id: 'p2_2', name: "Frytki", carbs: 41, protein: 3.4, fat: 15, gi: 75, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'p2_3', name: "Bataty gotowane", carbs: 20, protein: 1.6, fat: 0.1, gi: 45, category: "Owoce i Warzywa" },
  { id: 'p2_4', name: "Bataty pieczone", carbs: 21, protein: 2, fat: 0.1, gi: 94, category: "Owoce i Warzywa" },
  { id: 'p2_5', name: "Kalafior surowy", carbs: 2.5, protein: 2, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_6', name: "Kalafior gotowany", carbs: 2.3, protein: 1.8, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_7', name: i18n.t('auto.brokul_surowy', { defaultValue: "Brokuł surowy" }), carbs: 2.7, protein: 2.8, fat: 0.4, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_8', name: "Fasolka szparagowa gotowana", carbs: 4.1, protein: 1.9, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_9', name: "Kapusta kiszona", carbs: 1.5, protein: 1.1, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_10', name: i18n.t('auto.ogorki_kiszone', { defaultValue: "Ogórki kiszone" }), carbs: 1.3, protein: 0.6, fat: 0.1, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_11', name: "Cebula surowa", carbs: 8, protein: 1.1, fat: 0.1, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_12', name: i18n.t('auto.czosnek_1_zabek', { defaultValue: "Czosnek (1 ząbek)" }), carbs: 1, protein: 0.2, fat: 0, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p2_13', name: i18n.t('auto.salata_lodowa', { defaultValue: "Sałata lodowa" }), carbs: 1, protein: 0.9, fat: 0.1, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_14', name: "Rukola", carbs: 2, protein: 2.6, fat: 0.7, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_15', name: "Szpinak surowy", carbs: 0.5, protein: 2.9, fat: 0.4, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_16', name: "Rzodkiewka", carbs: 2, protein: 1, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_17', name: "Cukinia", carbs: 3, protein: 1.2, fat: 0.3, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p2_18', name: "Dynia pieczona", carbs: 10, protein: 1, fat: 0.1, gi: 75, category: "Owoce i Warzywa" },
  { id: 'p2_19', name: "Pieczarki", carbs: 0.5, protein: 3.1, fat: 0.3, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p4', name: i18n.t('auto.jablko', { defaultValue: "Jabłko" }), carbs: 12, protein: 0.3, fat: 0.2, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p4_1', name: "Gruszka", carbs: 13, protein: 0.4, fat: 0.1, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p4_2', name: "Maliny", carbs: 5, protein: 1.2, fat: 0.7, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p4_3', name: "Truskawki", carbs: 6, protein: 0.7, fat: 0.4, gi: 40, category: "Owoce i Warzywa" },
  { id: 'p4_4', name: i18n.t('auto.borowki_amerykanskie', { defaultValue: "Borówki amerykańskie" }), carbs: 12, protein: 0.7, fat: 0.3, gi: 50, category: "Owoce i Warzywa" },
  { id: 'p4_5', name: i18n.t('auto.jagody_lesne', { defaultValue: "Jagody leśne" }), carbs: 8, protein: 0.8, fat: 0.6, gi: 25, category: "Owoce i Warzywa" },
  { id: 'p4_6', name: i18n.t('auto.pomarancza', { defaultValue: "Pomarańcza" }), carbs: 9, protein: 0.9, fat: 0.1, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p4_7', name: "Mandarynka", carbs: 9, protein: 0.8, fat: 0.3, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p4_8', name: "Grejpfrut", carbs: 7, protein: 0.6, fat: 0.1, gi: 25, category: "Owoce i Warzywa" },
  { id: 'p4_9', name: "Cytryna", carbs: 3, protein: 1.1, fat: 0.3, gi: 20, category: "Owoce i Warzywa" },
  { id: 'p4_10', name: "Kiwi", carbs: 11, protein: 1.1, fat: 0.5, gi: 50, category: "Owoce i Warzywa" },
  { id: 'p4_11', name: i18n.t('auto.ananas_swiezy', { defaultValue: "Ananas świeży" }), carbs: 12, protein: 0.5, fat: 0.1, gi: 60, category: "Owoce i Warzywa" },
  { id: 'p4_12', name: "Mango", carbs: 14, protein: 0.8, fat: 0.4, gi: 50, category: "Owoce i Warzywa" },
  { id: 'p4_13', name: "Winogrona ciemne", carbs: 16, protein: 0.7, fat: 0.2, gi: 45, category: "Owoce i Warzywa" },
  { id: 'p4_14', name: "Winogrona jasne", carbs: 17, protein: 0.7, fat: 0.2, gi: 45, category: "Owoce i Warzywa" },
  { id: 'p4_15', name: i18n.t('auto.czeresnie', { defaultValue: "Czereśnie" }), carbs: 13, protein: 1, fat: 0.3, gi: 20, category: "Owoce i Warzywa" },
  { id: 'p4_16', name: i18n.t('auto.wisnie', { defaultValue: "Wiśnie" }), carbs: 10, protein: 1, fat: 0.3, gi: 25, category: "Owoce i Warzywa" },
  { id: 'p4_17', name: "Melon", carbs: 7, protein: 0.8, fat: 0.2, gi: 65, category: "Owoce i Warzywa" },
  { id: 'p4_18', name: i18n.t('auto.sliwki_swieze', { defaultValue: "Śliwki świeże" }), carbs: 10, protein: 0.7, fat: 0.3, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p5', name: i18n.t('auto.banan_dojrzaly', { defaultValue: "Banan dojrzały" }), carbs: 22, protein: 1.1, fat: 0.3, gi: 60, category: "Owoce i Warzywa" },
  { id: 'p5_1', name: "Banan zielonkawy", carbs: 20, protein: 1.1, fat: 0.3, gi: 40, category: "Owoce i Warzywa" },
  { id: 'p5_2', name: "Tofu naturalne", carbs: 2, protein: 14, fat: 8, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p5_3', name: i18n.t('auto.tofu_wedzone', { defaultValue: "Tofu wędzone" }), carbs: 2, protein: 15, fat: 9, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p5_4', name: "Tempeh", carbs: 9, protein: 19, fat: 11, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p5_5', name: "Soczewica czerwona (gotowana)", carbs: 20, protein: 9, fat: 0.4, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p5_6', name: "Ciecierzyca (gotowana)", carbs: 27, protein: 9, fat: 2.6, gi: 28, category: "Owoce i Warzywa" },
  { id: 'p5_7', name: "Fasola czerwona (gotowana)", carbs: 22, protein: 8.7, fat: 0.5, gi: 24, category: "Owoce i Warzywa" },
  { id: 'p5_8', name: "Awokado", carbs: 8.5, protein: 2, fat: 15, gi: 10, category: "Owoce i Warzywa" },

  // Nabiał
  { id: 'n1', name: "Mleko 0.5%", carbs: 5, protein: 3.5, fat: 0.5, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n1_1', name: "Mleko 2%", carbs: 5, protein: 3.4, fat: 2, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n1_2', name: "Mleko 3.2%", carbs: 4.8, protein: 3.2, fat: 3.2, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n1_3', name: "Mleko bez laktozy 1.5%", carbs: 4.7, protein: 3, fat: 1.5, gi: 35, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n2', name: "Jogurt naturalny", carbs: 5, protein: 4, fat: 2, gi: 35, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n2_1', name: "Jogurt grecki", carbs: 4, protein: 9, fat: 10, gi: 35, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n2_2', name: "Jogurt Skyr naturalny", carbs: 4, protein: 12, fat: 0, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n2_3', name: i18n.t('auto.jogurt_owocowy_srednio', { defaultValue: "Jogurt owocowy (średnio)" }), carbs: 14, protein: 3.5, fat: 2, gi: 50, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n3', name: i18n.t('auto.twarog_chudy', { defaultValue: "Twaróg chudy" }), carbs: 3.5, protein: 20, fat: 0.5, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n4', name: i18n.t('auto.twarog_poltlusty', { defaultValue: "Twaróg półtłusty" }), carbs: 3.5, protein: 18, fat: 4, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n4_1', name: i18n.t('auto.twarog_tlusty', { defaultValue: "Twaróg tłusty" }), carbs: 3, protein: 16, fat: 10, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n5', name: i18n.t('auto.ser_zolty_gouda', { defaultValue: "Ser żółty (Gouda)" }), carbs: 0.1, protein: 25, fat: 27, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n5_1', name: i18n.t('auto.ser_zolty_edamski', { defaultValue: "Ser żółty (Edamski)" }), carbs: 0.1, protein: 26, fat: 26, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n5_2', name: "Ser Cheddar", carbs: 1.3, protein: 25, fat: 33, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n5_3', name: i18n.t('auto.ser_zolty_radamer', { defaultValue: "Ser żółty Radamer" }), carbs: 0.1, protein: 26, fat: 26, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n6', name: "Jajko kurze (1 szt/50g)", carbs: 0.6, protein: 13, fat: 10, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n7', name: "Kefir", carbs: 4.5, protein: 3.5, fat: 1.5, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n8', name: i18n.t('auto.smietana_12', { defaultValue: "Śmietana 12%" }), carbs: 4, protein: 3, fat: 12, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n8_1', name: i18n.t('auto.smietanka_30', { defaultValue: "Śmietanka 30%" }), carbs: 3, protein: 2, fat: 30, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n9', name: "Ser feta", carbs: 4, protein: 14, fat: 21, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n10', name: "Serek wiejski", carbs: 2.7, protein: 11, fat: 5, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n11', name: "Mleko owsiane", carbs: 7, protein: 1, fat: 1.5, gi: 40, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n11_1', name: "Mleko sojowe naturalne", carbs: 1, protein: 3.5, fat: 2, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n11_2', name: i18n.t('auto.mleko_migdalowe_nieslodzone', { defaultValue: "Mleko migdałowe niesłodzone" }), carbs: 0.1, protein: 0.5, fat: 1.1, gi: 25, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n13', name: i18n.t('auto.maslanka', { defaultValue: "Maślanka" }), carbs: 5, protein: 3, fat: 1.5, gi: 30, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n14', name: "Camembert", carbs: 0.1, protein: 21, fat: 24, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n15', name: "Mozzarella", carbs: 2, protein: 18, fat: 17, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n16', name: "Serek mascarpone", carbs: 3, protein: 4.5, fat: 40, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n18', name: "Brie", carbs: 0.5, protein: 20.75, fat: 27.68, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n19', name: i18n.t('auto.maslo', { defaultValue: "Masło" }), carbs: 0.1, protein: 0.7, fat: 82, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n20', name: "Mleko kokosowe (z puszki)", carbs: 3, protein: 2, fat: 21, gi: 40, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n21', name: i18n.t('auto.napoj_kokosowy_karton', { defaultValue: "Napój kokosowy (karton)" }), carbs: 2.7, protein: 0.2, fat: 0.9, gi: 45, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n22', name: "Jogurt sojowy naturalny", carbs: 2.3, protein: 4, fat: 2.3, gi: 20, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n23', name: i18n.t('auto.smietanka_kokosowa', { defaultValue: "Śmietanka kokosowa" }), carbs: 3.5, protein: 2.5, fat: 30, gi: 40, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n24', name: "Jogurt kokosowy naturalny", carbs: 4.5, protein: 1.5, fat: 10, gi: 35, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },
  { id: 'n25', name: i18n.t('auto.weganski_plaster_a_la_ser_zolt', { defaultValue: "Wegański plaster (a'la ser żółty)" }), carbs: 20, protein: 0.5, fat: 23, gi: 0, category: i18n.t('auto.nabial', { defaultValue: "Nabiał" }) },

  // Napoje i Inne
  { id: 'i1', name: i18n.t('auto.sok_pomaranczowy_100ml', { defaultValue: "Sok pomarańczowy (100ml)" }), carbs: 10, protein: 0.7, fat: 0.2, gi: 50, category: "Inne" },
  { id: 'i1_0', name: "Woda niegazowana", carbs: 0, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i1_00', name: "Woda gazowana", carbs: 0, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i1_01', name: "Olej rzepakowy", carbs: 0, protein: 0, fat: 100, gi: 0, category: "Inne" },
  { id: 'i1_02', name: "Oliwa z oliwek", carbs: 0, protein: 0, fat: 100, gi: 0, category: "Inne" },
  { id: 'i1_1', name: "Sok pomidorowy (100ml)", carbs: 3.5, protein: 0.8, fat: 0.1, gi: 38, category: "Inne" },
  { id: 'i1_2', name: "Cola (z cukrem, 100ml)", carbs: 10.6, protein: 0, fat: 0, gi: 60, category: "Inne" },
  { id: 'i1_2_1', name: "Cola Zero / Max (100ml)", carbs: 0.1, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i1_3', name: i18n.t('auto.ketchup_1_lyzka', { defaultValue: "Ketchup (1 łyżka)" }), carbs: 4.2, protein: 0.1, fat: 0.1, gi: 55, category: "Inne" },
  { id: 'i1_4', name: i18n.t('auto.majonez_1_lyzka', { defaultValue: "Majonez (1 łyżka)" }), carbs: 0.1, protein: 0.2, fat: 10, gi: 0, category: "Inne" },
  { id: 'i1_5', name: i18n.t('auto.musztarda_1_lyzka', { defaultValue: "Musztarda (1 łyżka)" }), carbs: 0.6, protein: 0.4, fat: 0.3, gi: 35, category: "Inne" },
  { id: 'i2', name: i18n.t('auto.sok_jablkowy_100ml', { defaultValue: "Sok jabłkowy (100ml)" }), carbs: 11, protein: 0.1, fat: 0.1, gi: 40, category: "Inne" },
  { id: 'i2_1', name: "Sok grejpfrutowy (100ml)", carbs: 9, protein: 0.5, fat: 0.1, gi: 45, category: "Inne" },
  { id: 'i2_2', name: "Sok wielowarzywny (100ml)", carbs: 5, protein: 0.8, fat: 0.2, gi: 30, category: "Inne" },
  { id: 'i3', name: "Kawa czarna", carbs: 0.1, protein: 0.1, fat: 0, gi: 0, category: "Inne" },
  { id: 'i3_0', name: "Kawa z mlekiem 2% (bez cukru)", carbs: 2, protein: 1.5, fat: 1, gi: 30, category: "Inne" },
  { id: 'i3_1', name: "Herbata czarna (bez cukru)", carbs: 0, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i3_1_1', name: "Herbata zielona (bez cukru)", carbs: 0, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i3_1_2', name: "Herbata owocowa (bez cukru)", carbs: 0.2, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i3_3', name: i18n.t('auto.sos_sojowy_1_lyzka', { defaultValue: "Sos sojowy (1 łyżka)" }), carbs: 1, protein: 1.5, fat: 0, gi: 15, category: "Inne" },
  { id: 'i3_4', name: i18n.t('auto.maslo_orzechowe_1_lyzka_20g', { defaultValue: "Masło orzechowe (1 łyżka - 20g)" }), carbs: 3, protein: 5, fat: 10, gi: 15, category: "Inne" },
  { id: 'i3_5', name: "Pesto bazyliowe", carbs: 4, protein: 5, fat: 45, gi: 15, category: "Inne" },
  { id: 'i4', name: i18n.t('auto.cukier_bialy_1_lyzeczka_5g', { defaultValue: "Cukier biały (1 łyżeczka - 5g)" }), carbs: 5, protein: 0, fat: 0, gi: 65, category: "Inne" },
  { id: 'i4_1', name: "Erytrytol", carbs: 100, polyols: 100, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i4_2', name: "Ksylitol", carbs: 100, polyols: 100, protein: 0, fat: 0, gi: 13, category: "Inne" },
  { id: 'i4_3', name: i18n.t('auto.miod_wielokwiatowy_1_lyzeczka', { defaultValue: "Miód wielokwiatowy (1 łyżeczka - 10g)" }), carbs: 8, protein: 0, fat: 0, gi: 60, category: "Inne" },
  { id: 'i5', name: "Nasiona chia", carbs: 4.9, protein: 16.5, fat: 30.7, gi: 10, category: "Inne" },
  { id: 'i6', name: i18n.t('auto.siemie_lniane', { defaultValue: "Siemię lniane" }), carbs: 1.6, protein: 18.3, fat: 42.2, gi: 35, category: "Inne" },
  { id: 'i7', name: "Olej kokosowy", carbs: 0, protein: 0, fat: 100, gi: 0, category: "Inne" },
  { id: 'i8', name: i18n.t('auto.maslo_klarowane_ghee', { defaultValue: "Masło klarowane (Ghee)" }), carbs: 0, protein: 0.3, fat: 99.5, gi: 0, category: "Inne" },
  { id: 'i9', name: "Hummus", carbs: 14, protein: 8, fat: 10, gi: 25, category: "Inne" },
  { id: 'i10', name: i18n.t('auto.platki_drozdzowe_nieaktywne', { defaultValue: "Płatki drożdżowe nieaktywne" }), carbs: 15, protein: 45, fat: 5, gi: 15, category: "Inne" },

  { id: 'i11', name: i18n.t('auto.herbata_mietowa_bez_cukru', { defaultValue: "Herbata miętowa (bez cukru)" }), carbs: 0, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i12', name: i18n.t('auto.syrop_mietowy', { defaultValue: "Syrop miętowy" }), carbs: 70, protein: 0, fat: 0, gi: 65, category: "Inne" },
  { id: 'i13', name: i18n.t('auto.napoj_mietowy_z_cytryna', { defaultValue: "Napój miętowy z cytryną" }), carbs: 5, protein: 0, fat: 0, gi: 45, category: "Inne" },
  { id: 'i14', name: i18n.t('auto.swieza_mieta_liscie', { defaultValue: "Świeża mięta (liście)" }), carbs: 1.5, protein: 0.4, fat: 0.1, gi: 15, category: "Inne" },
  { id: 'i15', name: i18n.t('auto.blonnik_bambusowy', { defaultValue: "Błonnik bambusowy" }), carbs: 0, protein: 0, fat: 0, gi: 0, category: "Inne" },
  { id: 'i16', name: i18n.t('auto.babka_jajowata_luski', { defaultValue: "Babka jajowata (łuski)" }), carbs: 2, protein: 3, fat: 0.5, gi: 0, category: "Inne" },
  { id: 'i17', name: i18n.t('auto.bialko_konopne', { defaultValue: "Białko konopne" }), carbs: 8, protein: 50, fat: 12, gi: 15, category: "Inne" },
  { id: 'i18', name: i18n.t('auto.krem_z_orzechow_nerkowca', { defaultValue: "Krem z orzechów nerkowca" }), carbs: 18, protein: 20, fat: 46, gi: 15, category: "Inne" },
  { id: 'i19', name: "Kombucha", carbs: 3, protein: 0, fat: 0, gi: 20, category: "Inne" },
  { id: 'i20', name: "Pasta Tahini", carbs: 21, protein: 17, fat: 53, gi: 15, category: "Inne" },
  { id: 'i21', name: "Pesto czerwone suszone pomidory", carbs: 15, protein: 5, fat: 37, gi: 30, category: "Inne" },

  // Mięso i Ryby
  { id: 'm1', name: i18n.t('auto.piers_z_kurczaka_surowa', { defaultValue: "Pierś z kurczaka surowa" }), carbs: 0, protein: 22, fat: 1.3, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm1_1', name: i18n.t('auto.piers_z_kurczaka_duszona_piecz', { defaultValue: "Pierś z kurczaka duszona/pieczona" }), carbs: 0, protein: 31, fat: 3.6, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm1_2', name: "Udo z kurczaka pieczone", carbs: 0, protein: 24, fat: 12, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm1_3', name: i18n.t('auto.skrzydelka_z_kurczaka_pieczone', { defaultValue: "Skrzydełka z kurczaka pieczone" }), carbs: 0, protein: 22, fat: 16, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm2', name: "Schab pieczony", carbs: 0, protein: 25, fat: 10, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm2_1', name: "Schab surowy", carbs: 0, protein: 21, fat: 4, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm2_2', name: i18n.t('auto.poledwiczka_wieprzowa_pieczona', { defaultValue: "Polędwiczka wieprzowa pieczona" }), carbs: 0, protein: 26, fat: 4, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm3', name: "Mielone wieprzowe (szynka)", carbs: 0, protein: 18, fat: 12, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm3_1', name: i18n.t('auto.mielone_wolowe_chude', { defaultValue: "Mielone wołowe chude" }), carbs: 0, protein: 20, fat: 10, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm4', name: i18n.t('auto.losos_swiezy', { defaultValue: "Łosoś świeży" }), carbs: 0, protein: 20, fat: 13, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm4_1', name: i18n.t('auto.losos_wedzony', { defaultValue: "Łosoś wędzony" }), carbs: 0, protein: 21, fat: 10, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm5', name: i18n.t('auto.dorsz_swiezy', { defaultValue: "Dorsz świeży" }), carbs: 0, protein: 17, fat: 0.7, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm5_1', name: "Dorsz pieczony", carbs: 0, protein: 22, fat: 1, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm5_2', name: i18n.t('auto.pstrag_swiezy', { defaultValue: "Pstrąg świeży" }), carbs: 0, protein: 18, fat: 3, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm6', name: "Szynka drobiowa chuda", carbs: 1, protein: 18, fat: 2, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm6_1', name: "Szynka wieprzowa gotowana", carbs: 1, protein: 20, fat: 5, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm6_2', name: i18n.t('auto.poledwica_sopocka', { defaultValue: "Polędwica sopocka" }), carbs: 1, protein: 21, fat: 4, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm7', name: i18n.t('auto.parowki_z_szynki_90', { defaultValue: "Parówki z szynki (90%+) " }), carbs: 1.5, protein: 13, fat: 18, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm8', name: i18n.t('auto.stek_wolowy_antrykot', { defaultValue: "Stek wołowy (Antrykot)" }), carbs: 0, protein: 20, fat: 18, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm9', name: i18n.t('auto.piers_z_indyka_duszona', { defaultValue: "Pierś z indyka duszona" }), carbs: 0, protein: 28, fat: 1.5, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm10', name: i18n.t('auto.makrela_wedzona', { defaultValue: "Makrela wędzona" }), carbs: 0, protein: 19, fat: 15, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm11', name: i18n.t('auto.kielbasa_slaska', { defaultValue: "Kiełbasa Śląska" }), carbs: 1, protein: 15, fat: 24, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm11_1', name: i18n.t('auto.kielbasa_krakowska_sucha', { defaultValue: "Kiełbasa Krakowska sucha" }), carbs: 1, protein: 25, fat: 20, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm11_2', name: "Kabanosy wieprzowe", carbs: 3, protein: 24, fat: 38, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm12', name: i18n.t('auto.szynka_parmenska_prosciutto', { defaultValue: "Szynka parmeńska / Prosciutto" }), carbs: 0, protein: 25, fat: 14, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm13', name: i18n.t('auto.tunczyk_w_sosie_wlasnym', { defaultValue: "Tuńczyk w sosie własnym" }), carbs: 0, protein: 23, fat: 1, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm13_1', name: i18n.t('auto.tunczyk_w_oleju_odsaczony', { defaultValue: "Tuńczyk w oleju (odsączony)" }), carbs: 0, protein: 24, fat: 10, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm14', name: i18n.t('auto.sledz_w_oleju', { defaultValue: "Śledź w oleju" }), carbs: 0.5, protein: 16, fat: 20, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm15', name: "Boczek wieprzowy surowy", carbs: 0, protein: 12, fat: 45, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm15_1', name: i18n.t('auto.boczek_wedzony_podsmazony', { defaultValue: "Boczek wędzony podsmażony" }), carbs: 0, protein: 15, fat: 55, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm16', name: i18n.t('auto.kaczka_piers_ze_skora_pieczona', { defaultValue: "Kaczka (pierś ze skórą pieczona)" }), carbs: 0, protein: 18, fat: 35, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm17', name: "Krewetki gotowane", carbs: 0.2, protein: 24, fat: 0.3, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm18', name: i18n.t('auto.watrobka_drobiowa_smazona', { defaultValue: "Wątróbka drobiowa smażona" }), carbs: 4, protein: 24, fat: 10, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm19', name: "Pasztet pieczony", carbs: 4, protein: 14, fat: 25, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm20', name: "Seitan", carbs: 14, protein: 75, fat: 2, gi: 15, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm21', name: "Szarpany chlebowiec (Jackfruit)", carbs: 23, protein: 1.5, fat: 0.3, gi: 75, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm22', name: i18n.t('auto.kielbaski_sojowe', { defaultValue: "Kiełbaski sojowe" }), carbs: 6, protein: 16, fat: 12, gi: 25, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm23', name: i18n.t('auto.poledwica_wolowa', { defaultValue: "Polędwica wołowa" }), carbs: 0, protein: 21, fat: 6, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm24', name: "Halibut", carbs: 0, protein: 18, fat: 1.5, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm25', name: i18n.t('auto.morszczuk_smazony_bez_panierki', { defaultValue: "Morszczuk smażony bez panierki" }), carbs: 0, protein: 15, fat: 2.5, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },
  { id: 'm26', name: "Salami", carbs: 1.5, protein: 22, fat: 33, gi: 0, category: i18n.t('auto.mieso_i_ryby', { defaultValue: "Mięso i Ryby" }) },

  // Gotowe Posiłki
  { id: 'g1', name: "Pizza Margharita (100g)", carbs: 30, protein: 10, fat: 8, gi: 60, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_1', name: "Pizza Capricciosa (100g)", carbs: 28, protein: 11, fat: 10, gi: 60, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_2', name: i18n.t('auto.sushi_rolka_z_lososiem', { defaultValue: "Sushi - rolka z łososiem" }), carbs: 32, protein: 6, fat: 2, gi: 55, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_3', name: i18n.t('auto.nalesniki_z_twarogiem', { defaultValue: "Naleśniki z twarogiem" }), carbs: 29, protein: 8, fat: 5, gi: 60, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_4', name: "Pad Thai z kurczakiem", carbs: 22, protein: 8, fat: 7, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_5', name: "Kotlet schabowy panierowany", carbs: 12, protein: 18, fat: 15, gi: 60, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_6', name: i18n.t('auto.zupa_rosol_z_makaronem', { defaultValue: "Zupa rosół z makaronem" }), carbs: 6, protein: 3, fat: 2, gi: 55, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g1_7', name: "Zapiekanka z bagietki", carbs: 30, protein: 9, fat: 12, gi: 75, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g2', name: "Pierogi ruskie (100g)", carbs: 32, protein: 7, fat: 5, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g3', name: i18n.t('auto.zupa_pomidorowa_z_ryzem', { defaultValue: "Zupa pomidorowa z ryżem" }), carbs: 15, protein: 2, fat: 1, gi: 60, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g4', name: "Kebab w tortilli", carbs: 25, protein: 12, fat: 10, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g5', name: "Sushi (Nigiri/Maki)", carbs: 35, protein: 5, fat: 1, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g6', name: i18n.t('auto.leczo_z_cukinia', { defaultValue: "Leczo z cukinią" }), carbs: 6, protein: 2, fat: 4, gi: 30, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g7', name: "Spaghetti Bolognese", carbs: 25, protein: 8, fat: 6, gi: 55, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g8', name: "Burger (fast food)", carbs: 25, protein: 12, fat: 15, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g9', name: "Frytki z piekarnika", carbs: 30, protein: 3, fat: 6, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g10', name: "Zapiekanka z pieczarkami", carbs: 32, protein: 10, fat: 12, gi: 70, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g11', name: "Lasagne", carbs: 12, protein: 8, fat: 9, gi: 55, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g12', name: "Falafel", carbs: 31, protein: 13, fat: 17, gi: 40, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g13', name: i18n.t('auto.burger_roslinny_typu_beyond', { defaultValue: "Burger roślinny (typu Beyond)" }), carbs: 5, protein: 20, fat: 18, gi: 30, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g14', name: i18n.t('auto.curry_z_ciecierzyca_i_mlekiem', { defaultValue: "Curry z ciecierzycą i mlekiem kokosowym" }), carbs: 15, protein: 6, fat: 9, gi: 45, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g15', name: i18n.t('auto.keto_pizza_spod_z_kalafiora', { defaultValue: "Keto Pizza (spód z kalafiora)" }), carbs: 12, protein: 15, fat: 20, gi: 25, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g16', name: "Makaron cukiniowy (Zoodles) z pesto", carbs: 8, protein: 5, fat: 18, gi: 15, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g17', name: i18n.t('auto.pulpety_roslinne_w_sosie_pomid', { defaultValue: "Pulpety roślinne w sosie pomidorowym" }), carbs: 18, protein: 15, fat: 8, gi: 35, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g18', name: "Wrap z kurczakiem", carbs: 28, protein: 22, fat: 12, gi: 50, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g19', name: i18n.t('auto.salatka_cezar_z_kurczakiem', { defaultValue: "Sałatka Cezar z kurczakiem" }), carbs: 10, protein: 25, fat: 20, gi: 25, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g20', name: "Zupa krem z dyni (na mleku kokosowym)", carbs: 14, protein: 3, fat: 6, gi: 45, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g21', name: "Keto Bowl", carbs: 8, protein: 20, fat: 25, gi: 20, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g22', name: "Tofu Stir-fry", carbs: 15, protein: 18, fat: 14, gi: 40, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g23', name: i18n.t('auto.keto_burger_bulka_migdalowa', { defaultValue: "Keto Burger (Bułka migdałowa)" }), carbs: 6, protein: 30, fat: 35, gi: 20, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g24', name: "Risotto grzybowe (bezglutenowe)", carbs: 40, protein: 7, fat: 10, gi: 65, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g25', name: i18n.t('auto.nalesniki_bezglutenowe', { defaultValue: "Naleśniki bezglutenowe" }), carbs: 32, protein: 8, fat: 5, gi: 60, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g26', name: i18n.t('auto.sushi_witarianskie_z_kalafiora', { defaultValue: "Sushi witariańskie (z kalafiora)" }), carbs: 10, protein: 4, fat: 2, gi: 20, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g27', name: "Lasagne z cukinii (Keto)", carbs: 10, protein: 18, fat: 16, gi: 25, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g28', name: i18n.t('auto.owsianka_na_mleku_migdalowym', { defaultValue: "Owsianka na mleku migdałowym" }), carbs: 25, protein: 6, fat: 8, gi: 40, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g29', name: "Jajecznica z boczkiem (Keto)", carbs: 2, protein: 22, fat: 30, gi: 0, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g30', name: i18n.t('auto.curry_z_soczewica_dahl', { defaultValue: "Curry z soczewicą (Dahl)" }), carbs: 22, protein: 9, fat: 4, gi: 35, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g31', name: i18n.t('auto.buddha_bowl_weganskie', { defaultValue: "Buddha Bowl (wegańskie)" }), carbs: 32, protein: 12, fat: 15, gi: 45, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g32', name: "Zupa z soczewicy", carbs: 18, protein: 7, fat: 3, gi: 30, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g33', name: i18n.t('auto.pieczony_losos_z_brokulami_ket', { defaultValue: "Pieczony łosoś z brokułami (Keto)" }), carbs: 3, protein: 25, fat: 18, gi: 15, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g34', name: "Curry z kurczakiem na mleczku kokosowym (Keto)", carbs: 6, protein: 22, fat: 25, gi: 20, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g35', name: i18n.t('auto.pizza_bezglutenowa_spod_grycza', { defaultValue: "Pizza bezglutenowa (spód gryczany)" }), carbs: 38, protein: 12, fat: 10, gi: 55, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g36', name: i18n.t('auto.szaszlyki_z_tofu_i_warzywami', { defaultValue: "Szaszłyki z tofu i warzywami" }), carbs: 8, protein: 14, fat: 9, gi: 25, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g37', name: i18n.t('auto.schabowy_w_panierce_z_migdalow', { defaultValue: "Schabowy w panierce z migdałów (Keto)" }), carbs: 4, protein: 24, fat: 28, gi: 15, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g38', name: "Keto gofry", carbs: 5, protein: 12, fat: 22, gi: 20, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g39', name: i18n.t('auto.keto_kanapka_ze_chleba_bialkow', { defaultValue: "Keto kanapka ze chleba białkowego z awokado" }), carbs: 5, protein: 14, fat: 20, gi: 25, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },
  { id: 'g40', name: i18n.t('auto.szakszuka_keto_wegetarianska', { defaultValue: "Szakszuka (Keto/Wegetariańska)" }), carbs: 7, protein: 16, fat: 18, gi: 30, category: i18n.t('auto.gotowe_posilki', { defaultValue: "Gotowe Posiłki" }) },

  // Słodycze i Przekąski
  { id: 's1', name: "Czekolada mleczna", carbs: 55, protein: 7, fat: 30, gi: 50, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's1_1', name: i18n.t('auto.czekolada_biala', { defaultValue: "Czekolada biała" }), carbs: 59, protein: 6, fat: 32, gi: 44, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's1_2', name: "Lody czekoladowe", carbs: 24, protein: 4, fat: 12, gi: 68, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's1_3', name: i18n.t('auto.miod_1_lyzka_20g', { defaultValue: "Miód (1 łyżka - 20g)" }), carbs: 16, protein: 0.1, fat: 0, gi: 60, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's1_4', name: "Nutella (krem orzechowy)", carbs: 57, protein: 6, fat: 31, gi: 33, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's1_5', name: i18n.t('auto.zelki_haribo', { defaultValue: "Żelki Haribo" }), carbs: 77, protein: 7, fat: 0.1, gi: 78, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's2', name: "Czekolada gorzka 70%", carbs: 35, protein: 8, fat: 40, gi: 25, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's3', name: i18n.t('auto.orzechy_wloskie', { defaultValue: "Orzechy włoskie" }), carbs: 12, protein: 15, fat: 65, gi: 15, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's4', name: "Chipsy ziemniaczane", carbs: 50, protein: 6, fat: 35, gi: 80, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's5', name: i18n.t('auto.ciasto_drozdzowe', { defaultValue: "Ciasto drożdżowe" }), carbs: 50, protein: 7, fat: 8, gi: 65, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's6', name: "Lody waniliowe", carbs: 24, protein: 3.5, fat: 11, gi: 60, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's7', name: i18n.t('auto.migdaly', { defaultValue: "Migdały" }), carbs: 10, protein: 21, fat: 50, gi: 15, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's8', name: "Popcorn", carbs: 60, protein: 12, fat: 4, gi: 55, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's9', name: i18n.t('auto.zelki', { defaultValue: "Żelki" }), carbs: 75, protein: 6, fat: 0, gi: 80, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's10', name: "Rodzynki", carbs: 79, protein: 3, fat: 0.5, gi: 65, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's11', name: "Daktyle suszone", carbs: 75, protein: 2.5, fat: 0.4, gi: 70, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's12', name: "Precle", carbs: 70, protein: 10, fat: 3, gi: 80, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's13', name: "Baton proteinowy", carbs: 35, protein: 30, fat: 12, gi: 45, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's14', name: "Orzeszki ziemne", carbs: 16, protein: 26, fat: 49, gi: 15, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's15', name: "Czekolada gorzka 90% (Keto)", carbs: 14, protein: 10, fat: 55, gi: 20, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's16', name: "Orzechy makadamia", carbs: 5, protein: 8, fat: 76, gi: 10, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's17', name: "Orzechy nerkowca", carbs: 26, protein: 18, fat: 44, gi: 25, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's18', name: "Pestki dyni", carbs: 1.3, protein: 25, fat: 46, gi: 25, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's19', name: i18n.t('auto.lody_mietowe_z_czekolada', { defaultValue: "Lody miętowe z czekoladą" }), carbs: 25, protein: 3, fat: 12, gi: 65, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's20', name: i18n.t('auto.czekolada_mietowa', { defaultValue: "Czekolada miętowa" }), carbs: 50, protein: 6, fat: 35, gi: 45, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's21', name: i18n.t('auto.cukierki_mietowe', { defaultValue: "Cukierki miętowe" }), carbs: 95, protein: 0, fat: 0, gi: 70, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's22', name: i18n.t('auto.guma_do_zucia_mietowa_bez_cukr', { defaultValue: "Guma do żucia miętowa bez cukru" }), carbs: 60, polyols: 60, protein: 0, fat: 0, gi: 0, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's23', name: i18n.t('auto.ciasteczka_mietowe_z_czekolada', { defaultValue: "Ciasteczka miętowe z czekoladą" }), carbs: 60, protein: 5, fat: 25, gi: 65, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
  { id: 's24', name: i18n.t('auto.mietowki_owocowe', { defaultValue: "Miętówki owocowe" }), carbs: 95, protein: 0, fat: 0, gi: 70, category: i18n.t('auto.slodycze_i_przekaski', { defaultValue: "Słodycze i Przekąski" }) },
];

export interface PetSkin {
  id: string;
  name: string;
  icon: string;
  price: number;
  unlockedBy?: string; // id of achievement
  imageUrl?: string;
}

export const SKINS: PetSkin[] = [
  { id: 'default', name: 'Domowy Zwierzak', icon: '🐾', price: 0 },
  { id: 'cat', name: 'Puszysty Kot', icon: '😺', price: 100, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' },
  { id: 'dog', name: 'Wierny Pies', icon: '🐶', price: 200, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png' },
  { id: 'pig', name: i18n.t('auto.swinka_skarbonka', { defaultValue: "Świnka Skarbonka" }), icon: '🐷', price: 250, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png' },
  { id: 'robot', name: 'Robo-Zwierz', icon: '🤖', price: 400, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png' },
  { id: 'alien', name: 'Kosmita', icon: '👽', price: 600, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien.png' },
  { id: 'ghost', name: 'Duch Gliko', icon: '👻', price: 0, unlockedBy: 'night_owl', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ghost.png' },
  { id: 'ninja', name: 'Ninja Cukru', icon: '🥷', price: 0, unlockedBy: 'tir_ninja', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Ninja.png' },
  { id: 'fire', name: 'Ognisty Potworek', icon: '🔥', price: 1000, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20on%20Fire.png' },
  { id: 'unicorn', name: i18n.t('auto.jednorozec', { defaultValue: "Jednorożec" }), icon: '🦄', price: 0, unlockedBy: 'tir_master', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Unicorn.png' },
  { id: 'dragon', name: 'Smok Gnom', icon: '🐲', price: 2000, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon%20Face.png' },
  { id: 'panda', name: 'Panda Spokoju', icon: '🐼', price: 450, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Panda.png' },
  { id: 'superman', name: 'SuperGliko', icon: '🦸', price: 1500, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Supervillain.png' },
];

export interface PetAccessory {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
  price: number;
}

export const ACCESSORIES: PetAccessory[] = [
  { id: 'none', name: 'Brak', icon: '❌', imageUrl: '', price: 0 },
  { id: 'hat_top', name: 'Cylinder', icon: '🎩', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Top%20Hat.png', price: 150 },
  { id: 'glasses_cool', name: 'Okulary VIP', icon: '🕶️', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Sunglasses.png', price: 200 },
  { id: 'crown', name: 'Korona', icon: '👑', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Crown.png', price: 500 },
  { id: 'scarf', name: 'Szalik', icon: '🧣', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Scarf.png', price: 100 },
  { id: 'ribbon', name: 'Kokarda', icon: '🎀', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Ribbon.png', price: 75 },
  { id: 'magic_wand', name: i18n.t('auto.rozdzka', { defaultValue: "Różdżka" }), icon: '🪄', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Magic%20Wand.png', price: 300 },
  { id: 'shield', name: 'Tarcza', icon: '🛡️', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shield.png', price: 400 },
  { id: 'balloon', name: 'Balon', icon: '🎈', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Balloon.png', price: 50 },
];

export interface PetBackground {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  price: number;
  rewardTir?: number;
}

export const BACKGROUNDS: PetBackground[] = [
  { id: 'room', name: i18n.t('auto.pokoj', { defaultValue: "Pokój" }), icon: '🏠', gradient: 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900', price: 0 },
  { id: 'forest', name: 'Las', icon: '🌲', gradient: 'from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-900/20', price: 300 },
  { id: 'space', name: 'Kosmos', icon: '🚀', gradient: 'from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-black', price: 750 },
  { id: 'beach', name: i18n.t('auto.plaza', { defaultValue: "Plaża" }), icon: '🏖️', gradient: 'from-sky-100 to-amber-50 dark:from-sky-900/30 dark:to-amber-900/20', price: 500 },
  { id: 'candy', name: i18n.t('auto.kraina_slodyczy', { defaultValue: "Kraina Słodyczy" }), icon: '🍭', gradient: 'from-pink-50 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/30', price: 1000 },
  { id: 'champion', name: 'Arena Mistrza', icon: '🏆', gradient: 'from-amber-200 via-yellow-100 to-amber-200 dark:from-amber-900 dark:via-yellow-900 dark:to-amber-900', price: 0, rewardTir: 90 },
];

export interface PetItem {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'medicine';
  price: number;
  icon: string;
  effect: {
    hunger?: number;
    happiness?: number;
    xp?: number;
  };
  specialEffect?: 'hypo' | 'hyper';
}

export const ITEMS: PetItem[] = [
  { id: 'apple', name: i18n.t('auto.zlote_jablko', { defaultValue: "Złote Jabłko" }), type: 'food', price: 10, icon: '🍎', effect: { hunger: 30, xp: 10 } },
  { id: 'juice', name: 'Sok Ratunkowy', type: 'medicine', price: 15, icon: '🧃', effect: { hunger: 10, happiness: 10 }, specialEffect: 'hypo' },
  { id: 'water', name: 'Woda Mineralna', type: 'medicine', price: 15, icon: '💧', effect: { happiness: 10 }, specialEffect: 'hyper' },
  { id: 'ball', name: i18n.t('auto.pileczka', { defaultValue: "Piłeczka" }), type: 'toy', price: 20, icon: '🎾', effect: { happiness: 30, xp: 15 } },
  { id: 'cake', name: 'Pyszne Ciastko', type: 'food', price: 25, icon: '🍰', effect: { hunger: 50, happiness: 20, xp: 20 } },
];
export const MEDICAL_DICTIONARY: Record<string, { name: string; category: "insulin" | "sensors" | "infusion_sets" | "strips" | "other" }> = {
  // Insuliny
  "5909990451814": { name: "NovoRapid Penfill", category: "insulin" },
  "5712249127619": { name: "NovoRapid FlexPen", category: "insulin" },
  "5909991306298": { name: "Fiasp Penfill", category: "insulin" },
  "5712249127527": { name: "Fiasp FlexTouch", category: "insulin" },
  "5909990692422": { name: "Humalog Penfill", category: "insulin" },
  "0300028799598": { name: "Humalog KwikPen", category: "insulin" },
  "5909990962778": { name: "Lantus SoloStar", category: "insulin" },
  "5909990962761": { name: i18n.t('auto.lantus_wklad', { defaultValue: "Lantus Wkład" }), category: "insulin" },
  "5909991206109": { name: "Toujeo SoloStar", category: "insulin" },
  "5909991136451": { name: "Tresiba FlexTouch", category: "insulin" },
  "5909991136420": { name: "Tresiba Penfill", category: "insulin" },
  "5909990715978": { name: "Levemir FlexPen", category: "insulin" },
  "5909990715992": { name: "Levemir Penfill", category: "insulin" },
  "5909990970636": { name: "Apidra SoloStar", category: "insulin" },
  "5909990861118": { name: "Abasaglar KwikPen", category: "insulin" },

  // Sensory
  "5021791002504": { name: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "5021791000876": { name: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "5021791001033": { name: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "5021791001316": { name: "FreeStyle Libre 2 (Sensor)", category: "sensors" },
  "00386270000866": { name: "Dexcom G6 Sensor (3-pack)", category: "sensors" },
  "00386270001047": { name: "Dexcom G6 Sensor", category: "sensors" },
  "00386270004062": { name: "Dexcom G7 Sensor", category: "sensors" },
  "00763000519698": { name: "Guardian 4 Sensor", category: "sensors" },
  "20763000519692": { name: "Guardian 4 Sensor (5-pack)", category: "sensors" },
  "00763000046552": { name: "Guardian 3 Sensor", category: "sensors" },

  // Paski i Wkłucia
  "4015630066804": { name: "Accu-Chek Performa (50)", category: "strips" },
  "4015630066828": { name: "Accu-Chek Instant (50)", category: "strips" },
  "5016003728308": { name: "Contour Plus (50)", category: "strips" },
  "00381370046049": { name: "OneTouch Select Plus (50)", category: "strips" },
  "00763000046545": { name: i18n.t('auto.medtronic_mio_advance_wklucia', { defaultValue: "Medtronic Mio Advance (Wkłucia)" }), category: "infusion_sets" },
  "00763000046569": { name: i18n.t('auto.medtronic_quick_set_wklucia', { defaultValue: "Medtronic Quick-Set (Wkłucia)" }), category: "infusion_sets" },
  "00763000046576": { name: i18n.t('auto.medtronic_silhouette_wklucia', { defaultValue: "Medtronic Silhouette (Wkłucia)" }), category: "infusion_sets" }
};

export function extractGTIN(barcode: string): string {
  if (barcode.startsWith("01") && barcode.length >= 16) {
    return barcode.substring(2, 16);
  }
  return barcode;
}
