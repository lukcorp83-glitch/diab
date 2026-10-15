import { Product } from '../../types';

export const DAIRY_PRODUCTS: Product[] = [
  // Mleka
  { id: 'd_001', name: 'Mleko 0.5%', namePl: 'Mleko 0.5%', nameEn: 'Skimmed milk 0.5%', carbs: 5.0, protein: 3.5, fat: 0.5, kcal: 39, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_002', name: 'Mleko 1.5%', namePl: 'Mleko 1.5%', nameEn: 'Semi-skimmed milk 1.5%', carbs: 4.9, protein: 3.4, fat: 1.5, kcal: 47, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_003', name: 'Mleko 2.0%', namePl: 'Mleko 2.0%', nameEn: 'Milk 2.0%', carbs: 4.8, protein: 3.3, fat: 2.0, kcal: 51, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_004', name: 'Mleko 3.2%', namePl: 'Mleko 3.2%', nameEn: 'Whole milk 3.2%', carbs: 4.7, protein: 3.2, fat: 3.2, kcal: 60, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_005', name: 'Mleko bez laktozy 1.5%', namePl: 'Mleko bez laktozy 1.5%', nameEn: 'Lactose-free milk 1.5%', carbs: 4.8, protein: 3.3, fat: 1.5, kcal: 46, gi: 35, servingSize: 250, category: 'Nabiał' },
  { id: 'd_006', name: 'Mleko kozie', namePl: 'Mleko kozie', nameEn: 'Goat milk', carbs: 4.5, protein: 3.6, fat: 4.1, kcal: 69, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_007', name: 'Mleko zagęszczone niesłodzone', namePl: 'Mleko zagęszczone niesłodzone', nameEn: 'Evaporated milk unsweetened', carbs: 10.0, protein: 6.5, fat: 7.5, kcal: 135, gi: 35, servingSize: 50, category: 'Nabiał' },
  { id: 'd_008', name: 'Mleko zagęszczone słodzone (Kajmak)', namePl: 'Mleko zagęszczone słodzone (Kajmak)', nameEn: 'Condensed milk sweetened (Dulce de leche)', carbs: 55.0, protein: 7.5, fat: 8.0, kcal: 325, gi: 65, servingSize: 30, category: 'Nabiał' },

  // Napoje roślinne
  { id: 'd_010', name: 'Napój sojowy naturalny bez cukru', namePl: 'Napój sojowy naturalny bez cukru', nameEn: 'Unsweetened soy milk', carbs: 0.8, protein: 3.3, fat: 1.8, fiber: 0.5, kcal: 33, gi: 15, servingSize: 250, category: 'Nabiał' },
  { id: 'd_011', name: 'Napój migdałowy bez cukru', namePl: 'Napój migdałowy bez cukru', nameEn: 'Unsweetened almond milk', carbs: 0.2, protein: 0.5, fat: 1.1, fiber: 0.3, kcal: 13, gi: 15, servingSize: 250, category: 'Nabiał' },
  { id: 'd_012', name: 'Napój owsiany naturalny', namePl: 'Napój owsiany naturalny', nameEn: 'Oat drink/milk', carbs: 7.0, protein: 1.0, fat: 1.5, fiber: 0.8, kcal: 45, gi: 50, servingSize: 250, category: 'Nabiał' },
  { id: 'd_013', name: 'Napój kokosowy (z kartonu)', namePl: 'Napój kokosowy (z kartonu)', nameEn: 'Coconut milk drink (carton)', carbs: 2.7, protein: 0.2, fat: 1.0, fiber: 0.1, kcal: 20, gi: 25, servingSize: 250, category: 'Nabiał' },
  { id: 'd_014', name: 'Mleczko kokosowe w puszce (gęste)', namePl: 'Mleczko kokosowe w puszce (gęste)', nameEn: 'Canned coconut milk (rich)', carbs: 2.8, protein: 1.6, fat: 18.0, kcal: 180, gi: 20, servingSize: 100, category: 'Nabiał' },

  // Jogurty, Kefiry, Maślanki
  { id: 'd_020', name: 'Jogurt naturalny', namePl: 'Jogurt naturalny', nameEn: 'Plain natural yogurt', carbs: 5.2, protein: 4.2, fat: 2.0, kcal: 56, gi: 35, servingSize: 180, category: 'Nabiał' },
  { id: 'd_021', name: 'Jogurt grecki 10%', namePl: 'Jogurt grecki 10%', nameEn: 'Greek yogurt 10%', carbs: 3.8, protein: 5.0, fat: 10.0, kcal: 125, gi: 30, servingSize: 150, category: 'Nabiał' },
  { id: 'd_022', name: 'Skyr naturalny (0% tłuszczu)', namePl: 'Skyr naturalny (0% tłuszczu)', nameEn: 'Natural Skyr (0% fat)', carbs: 4.1, protein: 11.8, fat: 0.2, kcal: 65, gi: 25, servingSize: 150, category: 'Nabiał' },
  { id: 'd_023', name: 'Skyr waniliowy', namePl: 'Skyr waniliowy', nameEn: 'Vanilla Skyr', carbs: 8.5, protein: 10.5, fat: 0.2, kcal: 78, gi: 40, servingSize: 150, category: 'Nabiał' },
  { id: 'd_024', name: 'Kefir naturalny', namePl: 'Kefir naturalny', nameEn: 'Kefir natural', carbs: 4.7, protein: 3.4, fat: 1.5, kcal: 46, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_025', name: 'Maślanka naturalna', namePl: 'Maślanka naturalna', nameEn: 'Buttermilk natural', carbs: 4.8, protein: 3.2, fat: 1.5, kcal: 46, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_026', name: 'Zsiadłe mleko tradycyjne', namePl: 'Zsiadłe mleko tradycyjne', nameEn: 'Sour clabbered milk', carbs: 4.7, protein: 3.2, fat: 2.0, kcal: 50, gi: 30, servingSize: 250, category: 'Nabiał' },
  { id: 'd_027', name: 'Jogurt owocowy z kawałkami owoców', namePl: 'Jogurt owocowy z kawałkami owoców', nameEn: 'Fruit yogurt with pieces', carbs: 14.0, protein: 3.6, fat: 2.5, kcal: 92, gi: 50, servingSize: 150, category: 'Nabiał' },

  // Twarogi i Serki
  { id: 'd_030', name: 'Twaróg chudy', namePl: 'Twaróg chudy', nameEn: 'Lean curd cheese (fat-free)', carbs: 3.5, protein: 19.8, fat: 0.5, kcal: 98, gi: 30, servingSize: 100, category: 'Nabiał' },
  { id: 'd_031', name: 'Twaróg półtłusty', namePl: 'Twaróg półtłusty', nameEn: 'Semi-skimmed curd cheese', carbs: 3.7, protein: 17.5, fat: 4.0, kcal: 121, gi: 30, servingSize: 100, category: 'Nabiał' },
  { id: 'd_032', name: 'Twaróg tłusty', namePl: 'Twaróg tłusty', nameEn: 'Full-fat curd cheese', carbs: 3.5, protein: 15.5, fat: 8.5, kcal: 153, gi: 30, servingSize: 100, category: 'Nabiał' },
  { id: 'd_033', name: 'Serek wiejski (Cottage cheese)', namePl: 'Serek wiejski (Cottage cheese)', nameEn: 'Cottage cheese natural', carbs: 2.5, protein: 11.0, fat: 5.0, kcal: 99, gi: 30, servingSize: 200, category: 'Nabiał' },
  { id: 'd_034', name: 'Serek wiejski lekki (Light)', namePl: 'Serek wiejski lekki (Light)', nameEn: 'Cottage cheese light', carbs: 2.7, protein: 12.5, fat: 3.0, kcal: 88, gi: 30, servingSize: 200, category: 'Nabiał' },
  { id: 'd_035', name: 'Serek wiejski ze szczypiorkiem', namePl: 'Serek wiejski ze szczypiorkiem', nameEn: 'Cottage cheese with chives', carbs: 2.8, protein: 10.5, fat: 4.8, kcal: 97, gi: 30, servingSize: 200, category: 'Nabiał' },
  { id: 'd_036', name: 'Serek twarogowy do smarowania (np. Almette, Łaciaty)', namePl: 'Serek twarogowy do smarowania (np. Almette, Łaciaty)', nameEn: 'Cream cheese spread', carbs: 3.5, protein: 6.0, fat: 24.0, kcal: 255, gi: 25, servingSize: 30, category: 'Nabiał' },
  { id: 'd_037', name: 'Ser Ricotta', namePl: 'Ser Ricotta', nameEn: 'Ricotta cheese', carbs: 3.0, protein: 11.0, fat: 12.0, kcal: 165, gi: 25, servingSize: 80, category: 'Nabiał' },
  { id: 'd_038', name: 'Ser Mascarpone', namePl: 'Ser Mascarpone', nameEn: 'Mascarpone cheese', carbs: 3.0, protein: 4.5, fat: 40.0, kcal: 390, gi: 20, servingSize: 50, category: 'Nabiał' },

  // Sery żółte i twarde
  { id: 'd_040', name: 'Ser Gouda', namePl: 'Ser Gouda', nameEn: 'Gouda cheese', carbs: 0.1, protein: 25.5, fat: 27.0, kcal: 345, gi: 0, servingSize: 30, category: 'Nabiał' },
  { id: 'd_041', name: 'Ser Edamski', namePl: 'Ser Edamski', nameEn: 'Edam cheese', carbs: 0.1, protein: 26.0, fat: 25.0, kcal: 330, gi: 0, servingSize: 30, category: 'Nabiał' },
  { id: 'd_042', name: 'Ser Cheddar', namePl: 'Ser Cheddar', nameEn: 'Cheddar cheese', carbs: 1.0, protein: 25.0, fat: 33.0, kcal: 400, gi: 0, servingSize: 30, category: 'Nabiał' },
  { id: 'd_043', name: 'Ser Ementaler / Radamer (z dziurami)', namePl: 'Ser Ementaler / Radamer (z dziurami)', nameEn: 'Swiss Emmental cheese', carbs: 0.5, protein: 27.0, fat: 28.0, kcal: 365, gi: 0, servingSize: 30, category: 'Nabiał' },
  { id: 'd_044', name: 'Ser Parmezan / Grana Padano tarty', namePl: 'Ser Parmezan / Grana Padano tarty', nameEn: 'Parmesan / Grana Padano', carbs: 0.5, protein: 35.0, fat: 28.0, kcal: 395, gi: 0, servingSize: 15, category: 'Nabiał' },

  // Sery białe, solankowe i pleśniowe
  { id: 'd_050', name: 'Ser Mozzarella w zalewie (kulka)', namePl: 'Ser Mozzarella w zalewie (kulka)', nameEn: 'Mozzarella ball in brine', carbs: 1.5, protein: 18.0, fat: 19.0, kcal: 250, gi: 0, servingSize: 125, category: 'Nabiał' },
  { id: 'd_051', name: 'Ser Mozzarella wiórki (do pizzy)', namePl: 'Ser Mozzarella wiórki (do pizzy)', nameEn: 'Shredded mozzarella', carbs: 2.0, protein: 24.0, fat: 22.0, kcal: 300, gi: 0, servingSize: 50, category: 'Nabiał' },
  { id: 'd_052', name: 'Ser Feta grecka oryginalna', namePl: 'Ser Feta grecka oryginalna', nameEn: 'Greek Feta cheese (PDO)', carbs: 1.0, protein: 14.5, fat: 21.0, kcal: 250, gi: 0, servingSize: 50, category: 'Nabiał' },
  { id: 'd_053', name: 'Ser typu greckiego (np. Favita)', namePl: 'Ser typu greckiego (np. Favita)', nameEn: 'Salad cheese (Feta type)', carbs: 3.5, protein: 11.0, fat: 16.0, kcal: 205, gi: 0, servingSize: 50, category: 'Nabiał' },
  { id: 'd_054', name: 'Ser Halloumi (do smażenia)', namePl: 'Ser Halloumi (do smażenia)', nameEn: 'Halloumi grilling cheese', carbs: 2.0, protein: 21.0, fat: 26.0, kcal: 325, gi: 0, servingSize: 60, category: 'Nabiał' },
  { id: 'd_055', name: 'Ser Camembert', namePl: 'Ser Camembert', nameEn: 'Camembert cheese', carbs: 0.5, protein: 20.0, fat: 23.0, kcal: 290, gi: 0, servingSize: 60, category: 'Nabiał' },
  { id: 'd_056', name: 'Ser Brie', namePl: 'Ser Brie', nameEn: 'Brie cheese', carbs: 0.5, protein: 19.0, fat: 28.0, kcal: 335, gi: 0, servingSize: 50, category: 'Nabiał' },
  { id: 'd_057', name: 'Ser z niebieską pleśnią (Gorgonzola / Rokpol)', namePl: 'Ser z niebieską pleśnią (Gorgonzola / Rokpol)', nameEn: 'Blue cheese', carbs: 1.0, protein: 21.0, fat: 29.0, kcal: 350, gi: 0, servingSize: 40, category: 'Nabiał' },
  { id: 'd_058', name: 'Ser topiony w trójkącikach', namePl: 'Ser topiony w trójkącikach', nameEn: 'Processed cheese triangle', carbs: 5.5, protein: 12.0, fat: 22.0, kcal: 270, gi: 0, servingSize: 25, category: 'Nabiał' },

  // Jaja
  { id: 'd_060', name: 'Jajko kurze całe (1 szt ~55g)', namePl: 'Jajko kurze całe (1 szt ~55g)', nameEn: 'Whole chicken egg (1 pc ~55g)', carbs: 0.6, protein: 12.5, fat: 10.0, kcal: 145, gi: 0, servingSize: 55, category: 'Nabiał' },
  { id: 'd_061', name: 'Białko jaja kurzego (1 szt ~35g)', namePl: 'Białko jaja kurzego (1 szt ~35g)', nameEn: 'Egg white (1 pc ~35g)', carbs: 0.7, protein: 11.0, fat: 0.2, kcal: 50, gi: 0, servingSize: 35, category: 'Nabiał' },
  { id: 'd_062', name: 'Żółtko jaja kurzego (1 szt ~20g)', namePl: 'Żółtko jaja kurzego (1 szt ~20g)', nameEn: 'Egg yolk (1 pc ~20g)', carbs: 0.6, protein: 16.0, fat: 31.0, kcal: 320, gi: 0, servingSize: 20, category: 'Nabiał' },

  // Masła i Śmietany
  { id: 'd_070', name: 'Masło ekstra 82%', namePl: 'Masło ekstra 82%', nameEn: 'Butter 82% fat', carbs: 0.7, protein: 0.7, fat: 82.5, kcal: 740, gi: 0, servingSize: 10, category: 'Nabiał' },
  { id: 'd_071', name: 'Masło klarowane (Ghee)', namePl: 'Masło klarowane (Ghee)', nameEn: 'Clarified butter (Ghee)', carbs: 0.0, protein: 0.1, fat: 99.8, kcal: 895, gi: 0, servingSize: 10, category: 'Nabiał' },
  { id: 'd_072', name: 'Śmietanka 12% (do kawy/zup)', namePl: 'Śmietanka 12% (do kawy/zup)', nameEn: 'Cream 12% fat', carbs: 4.4, protein: 3.0, fat: 12.0, kcal: 138, gi: 30, servingSize: 30, category: 'Nabiał' },
  { id: 'd_073', name: 'Śmietana 18% kwaśna', namePl: 'Śmietana 18% kwaśna', nameEn: 'Sour cream 18%', carbs: 3.8, protein: 2.8, fat: 18.0, kcal: 186, gi: 30, servingSize: 30, category: 'Nabiał' },
  { id: 'd_074', name: 'Śmietanka 30% słodka', namePl: 'Śmietanka 30% słodka', nameEn: 'Whipping cream 30%', carbs: 3.2, protein: 2.2, fat: 30.0, kcal: 290, gi: 30, servingSize: 30, category: 'Nabiał' },
  { id: 'd_075', name: 'Śmietanka 36% kremówka', namePl: 'Śmietanka 36% kremówka', nameEn: 'Heavy cream 36%', carbs: 2.8, protein: 2.0, fat: 36.0, kcal: 340, gi: 30, servingSize: 30, category: 'Nabiał' }
];
