import { Product } from '../../types';

export const BAKERY_PRODUCTS: Product[] = [
  // Chleby
  { id: 'b_001', name: 'Chleb żytni razowy', namePl: 'Chleb żytni razowy', nameEn: 'Rye wholemeal bread', carbs: 45, protein: 5.5, fat: 1.7, fiber: 8.5, kcal: 225, gi: 45, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_002', name: 'Chleb żytni na zakwasie', namePl: 'Chleb żytni na zakwasie', nameEn: 'Sourdough rye bread', carbs: 48, protein: 6.0, fat: 1.5, fiber: 7.0, kcal: 235, gi: 48, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_003', name: 'Chleb pszenny tradycyjny', namePl: 'Chleb pszenny tradycyjny', nameEn: 'White wheat bread', carbs: 54, protein: 8.0, fat: 1.3, fiber: 2.7, kcal: 260, gi: 70, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_004', name: 'Chleb pszenno-żytni', namePl: 'Chleb pszenno-żytni', nameEn: 'Wheat-rye bread', carbs: 51, protein: 7.2, fat: 1.4, fiber: 4.5, kcal: 250, gi: 60, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_005', name: 'Chleb graham', namePl: 'Chleb graham', nameEn: 'Graham bread', carbs: 47, protein: 8.5, fat: 1.8, fiber: 6.5, kcal: 245, gi: 50, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_006', name: 'Chleb orkiszowy', namePl: 'Chleb orkiszowy', nameEn: 'Spelt bread', carbs: 46, protein: 9.5, fat: 2.0, fiber: 6.0, kcal: 240, gi: 50, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_007', name: 'Chleb tostowy pszenny', namePl: 'Chleb tostowy pszenny', nameEn: 'White toast bread', carbs: 52, protein: 7.5, fat: 3.8, fiber: 2.5, kcal: 275, gi: 72, servingSize: 25, category: 'Zbożowe i Pieczywo' },
  { id: 'b_008', name: 'Chleb tostowy pełnoziarnisty', namePl: 'Chleb tostowy pełnoziarnisty', nameEn: 'Wholegrain toast bread', carbs: 46, protein: 9.0, fat: 3.5, fiber: 6.0, kcal: 255, gi: 55, servingSize: 25, category: 'Zbożowe i Pieczywo' },
  { id: 'b_009', name: 'Pumpernikiel', namePl: 'Pumpernikiel', nameEn: 'Pumpernickel', carbs: 42, protein: 6.5, fat: 1.5, fiber: 9.0, kcal: 220, gi: 45, servingSize: 45, category: 'Zbożowe i Pieczywo' },
  { id: 'b_010', name: 'Chleb wieloziarnisty ze słonecznikiem', namePl: 'Chleb wieloziarnisty ze słonecznikiem', nameEn: 'Multigrain bread with sunflower seeds', carbs: 43, protein: 9.5, fat: 6.5, fiber: 6.8, kcal: 270, gi: 52, servingSize: 35, category: 'Zbożowe i Pieczywo' },
  { id: 'b_011', name: 'Chleb czystoziarnisty (bez mąki)', namePl: 'Chleb czystoziarnisty (bez mąki)', nameEn: 'Seed-only bread (flourless)', carbs: 14, protein: 12.0, fat: 22.0, fiber: 11.0, kcal: 320, gi: 25, servingSize: 40, category: 'Zbożowe i Pieczywo' },
  { id: 'b_012', name: 'Chleb białkowy (Keto / Proteinowy)', namePl: 'Chleb białkowy (Keto / Proteinowy)', nameEn: 'Protein keto bread', carbs: 8, protein: 22.0, fat: 14.0, fiber: 14.0, kcal: 260, gi: 20, servingSize: 40, category: 'Zbożowe i Pieczywo' },
  { id: 'b_013', name: 'Chleb bezglutenowy jasny', namePl: 'Chleb bezglutenowy jasny', nameEn: 'Gluten-free white bread', carbs: 55, protein: 3.0, fat: 4.5, fiber: 3.5, kcal: 270, gi: 75, servingSize: 30, category: 'Zbożowe i Pieczywo' },
  { id: 'b_014', name: 'Pieczywo chrupkie żytnie (np. Wasa)', namePl: 'Pieczywo chrupkie żytnie (np. Wasa)', nameEn: 'Crispbread rye (Wasa style)', carbs: 65, protein: 9.5, fat: 2.0, fiber: 15.0, kcal: 340, gi: 60, servingSize: 10, category: 'Zbożowe i Pieczywo' },
  { id: 'b_015', name: 'Maca tradycyjna', namePl: 'Maca tradycyjna', nameEn: 'Matzah bread', carbs: 75, protein: 11.0, fat: 1.5, fiber: 3.5, kcal: 360, gi: 70, servingSize: 15, category: 'Zbożowe i Pieczywo' },
  { id: 'b_016', name: 'Chałka drożdżowa maślana', namePl: 'Chałka drożdżowa maślana', nameEn: 'Challah sweet bread', carbs: 58, protein: 8.5, fat: 7.0, fiber: 2.0, kcal: 330, gi: 75, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_017', name: 'Pita pszenna', namePl: 'Pita pszenna', nameEn: 'Pita bread', carbs: 55, protein: 9.0, fat: 1.5, fiber: 3.0, kcal: 275, gi: 65, servingSize: 60, category: 'Zbożowe i Pieczywo' },

  // Bułki
  { id: 'b_020', name: 'Bułka kajzerka', namePl: 'Bułka kajzerka', nameEn: 'Kaiser roll', carbs: 57, protein: 8.0, fat: 2.0, fiber: 2.5, kcal: 280, gi: 72, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_021', name: 'Bułka grahamka', namePl: 'Bułka grahamka', nameEn: 'Graham roll', carbs: 51, protein: 9.2, fat: 2.2, fiber: 6.5, kcal: 260, gi: 50, servingSize: 60, category: 'Zbożowe i Pieczywo' },
  { id: 'b_022', name: 'Bułka wieloziarnista (fitness)', namePl: 'Bułka wieloziarnista (fitness)', nameEn: 'Multigrain roll', carbs: 48, protein: 10.5, fat: 5.5, fiber: 7.0, kcal: 285, gi: 50, servingSize: 65, category: 'Zbożowe i Pieczywo' },
  { id: 'b_023', name: 'Bagietka pszenna', namePl: 'Bagietka pszenna', nameEn: 'Baguette', carbs: 58, protein: 8.5, fat: 1.8, fiber: 2.5, kcal: 285, gi: 75, servingSize: 70, category: 'Zbożowe i Pieczywo' },
  { id: 'b_024', name: 'Bagietka czosnkowa z masłem', namePl: 'Bagietka czosnkowa z masłem', nameEn: 'Garlic baguette with butter', carbs: 45, protein: 7.0, fat: 15.0, fiber: 2.5, kcal: 345, gi: 70, servingSize: 80, category: 'Zbożowe i Pieczywo' },
  { id: 'b_025', name: 'Ciabatta pszenna', namePl: 'Ciabatta pszenna', nameEn: 'Ciabatta', carbs: 53, protein: 8.5, fat: 3.5, fiber: 2.8, kcal: 275, gi: 70, servingSize: 70, category: 'Zbożowe i Pieczywo' },
  { id: 'b_026', name: 'Bajgiel pszenny', namePl: 'Bajgiel pszenny', nameEn: 'Plain bagel', carbs: 52, protein: 10.0, fat: 1.8, fiber: 3.0, kcal: 265, gi: 70, servingSize: 85, category: 'Zbożowe i Pieczywo' },
  { id: 'b_027', name: 'Rogal maślany', namePl: 'Rogal maślany', nameEn: 'Butter croissant/crescent', carbs: 54, protein: 8.0, fat: 10.0, fiber: 2.0, kcal: 340, gi: 72, servingSize: 60, category: 'Zbożowe i Pieczywo' },
  { id: 'b_028', name: 'Bułka tarta', namePl: 'Bułka tarta', nameEn: 'Breadcrumbs', carbs: 72, protein: 11.5, fat: 2.0, fiber: 4.5, kcal: 355, gi: 80, servingSize: 20, category: 'Zbożowe i Pieczywo' },
  { id: 'b_029', name: 'Bułka do hamburgera', namePl: 'Bułka do hamburgera', nameEn: 'Hamburger bun', carbs: 50, protein: 8.0, fat: 5.0, fiber: 2.5, kcal: 280, gi: 75, servingSize: 60, category: 'Zbożowe i Pieczywo' },
  { id: 'b_030', name: 'Bułka do hot-doga', namePl: 'Bułka do hot-doga', nameEn: 'Hot dog bun', carbs: 51, protein: 8.0, fat: 4.5, fiber: 2.0, kcal: 275, gi: 75, servingSize: 55, category: 'Zbożowe i Pieczywo' },

  // Makarony (wartości po ugotowaniu)
  { id: 'b_035', name: 'Makaron pszenny jasny (gotowany)', namePl: 'Makaron pszenny jasny (gotowany)', nameEn: 'Wheat pasta, white (cooked)', carbs: 28, protein: 5.0, fat: 0.9, fiber: 1.8, kcal: 140, gi: 55, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_036', name: 'Makaron spaghetti al dente (gotowany)', namePl: 'Makaron spaghetti al dente (gotowany)', nameEn: 'Spaghetti al dente (cooked)', carbs: 26, protein: 5.2, fat: 0.9, fiber: 2.0, kcal: 135, gi: 45, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_037', name: 'Makaron pełnoziarnisty (gotowany)', namePl: 'Makaron pełnoziarnisty (gotowany)', nameEn: 'Whole wheat pasta (cooked)', carbs: 25, protein: 5.8, fat: 1.1, fiber: 4.5, kcal: 130, gi: 40, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_038', name: 'Makaron jajeczny (gotowany)', namePl: 'Makaron jajeczny (gotowany)', nameEn: 'Egg pasta (cooked)', carbs: 27, protein: 5.5, fat: 1.8, fiber: 1.5, kcal: 145, gi: 55, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_039', name: 'Makaron ryżowy (gotowany)', namePl: 'Makaron ryżowy (gotowany)', nameEn: 'Rice noodles (cooked)', carbs: 24, protein: 1.8, fat: 0.3, fiber: 0.8, kcal: 110, gi: 65, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_040', name: 'Makaron sojowy / szklany (gotowany)', namePl: 'Makaron sojowy / szklany (gotowany)', nameEn: 'Glass / mung bean noodles (cooked)', carbs: 23, protein: 0.2, fat: 0.1, fiber: 0.5, kcal: 95, gi: 40, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_041', name: 'Makaron Konjac / Shirataki (0 kcal/WW)', namePl: 'Makaron Konjac / Shirataki (0 kcal/WW)', nameEn: 'Konjac / Shirataki noodles (0 carbs)', carbs: 0.5, protein: 0.1, fat: 0.1, fiber: 3.0, kcal: 9, gi: 0, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_042', name: 'Makaron gryczany Soba (gotowany)', namePl: 'Makaron gryczany Soba (gotowany)', nameEn: 'Buckwheat soba noodles (cooked)', carbs: 21, protein: 5.1, fat: 0.5, fiber: 2.8, kcal: 115, gi: 40, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_043', name: 'Makaron z czerwonej soczewicy (gotowany)', namePl: 'Makaron z czerwonej soczewicy (gotowany)', nameEn: 'Red lentil pasta (cooked)', carbs: 22, protein: 11.5, fat: 0.9, fiber: 4.8, kcal: 140, gi: 30, servingSize: 150, category: 'Zbożowe i Pieczywo' },

  // Ryże (wartości po ugotowaniu)
  { id: 'b_050', name: 'Ryż biały gotowany', namePl: 'Ryż biały gotowany', nameEn: 'White rice (cooked)', carbs: 28, protein: 2.7, fat: 0.3, fiber: 0.8, kcal: 130, gi: 70, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_051', name: 'Ryż basmati gotowany', namePl: 'Ryż basmati gotowany', nameEn: 'Basmati rice (cooked)', carbs: 27, protein: 3.0, fat: 0.4, fiber: 1.0, kcal: 125, gi: 50, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_052', name: 'Ryż jaśminowy gotowany', namePl: 'Ryż jaśminowy gotowany', nameEn: 'Jasmine rice (cooked)', carbs: 28, protein: 2.6, fat: 0.3, fiber: 0.7, kcal: 130, gi: 68, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_053', name: 'Ryż brązowy gotowany', namePl: 'Ryż brązowy gotowany', nameEn: 'Brown rice (cooked)', carbs: 23, protein: 2.6, fat: 0.9, fiber: 2.5, kcal: 115, gi: 50, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_054', name: 'Ryż parboiled gotowany', namePl: 'Ryż parboiled gotowany', nameEn: 'Parboiled rice (cooked)', carbs: 26, protein: 2.8, fat: 0.4, fiber: 1.2, kcal: 120, gi: 50, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_055', name: 'Ryż dziki gotowany', namePl: 'Ryż dziki gotowany', nameEn: 'Wild rice (cooked)', carbs: 21, protein: 4.0, fat: 0.3, fiber: 2.8, kcal: 100, gi: 45, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_056', name: 'Wafle ryżowe naturalne (1 szt ~10g)', namePl: 'Wafle ryżowe naturalne (1 szt ~10g)', nameEn: 'Rice cakes (1 pc ~10g)', carbs: 80, protein: 8.0, fat: 2.8, fiber: 3.5, kcal: 380, gi: 85, servingSize: 10, category: 'Zbożowe i Pieczywo' },
  { id: 'b_057', name: 'Wafle kukurydziane (1 szt ~10g)', namePl: 'Wafle kukurydziane (1 szt ~10g)', nameEn: 'Corn cakes (1 pc ~10g)', carbs: 82, protein: 8.5, fat: 2.0, fiber: 3.8, kcal: 385, gi: 80, servingSize: 10, category: 'Zbożowe i Pieczywo' },

  // Kasze (wartości po ugotowaniu)
  { id: 'b_060', name: 'Kasza gryczana palona (gotowana)', namePl: 'Kasza gryczana palona (gotowana)', nameEn: 'Roasted buckwheat groats (cooked)', carbs: 20, protein: 3.2, fat: 0.6, fiber: 3.5, kcal: 105, gi: 45, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_061', name: 'Kasza gryczana biała niepalona (gotowana)', namePl: 'Kasza gryczana biała niepalona (gotowana)', nameEn: 'White raw buckwheat (cooked)', carbs: 21, protein: 3.5, fat: 0.6, fiber: 3.8, kcal: 110, gi: 40, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_062', name: 'Kasza pęczak jęczmienny (gotowana)', namePl: 'Kasza pęczak jęczmienny (gotowana)', nameEn: 'Pearl barley (cooked)', carbs: 23, protein: 2.8, fat: 0.4, fiber: 4.2, kcal: 110, gi: 30, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_063', name: 'Kasza jęczmienna wiejska (gotowana)', namePl: 'Kasza jęczmienna wiejska (gotowana)', nameEn: 'Barley groats coarse (cooked)', carbs: 24, protein: 2.9, fat: 0.5, fiber: 3.8, kcal: 115, gi: 45, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_064', name: 'Kasza jaglana (gotowana)', namePl: 'Kasza jaglana (gotowana)', nameEn: 'Millet groats (cooked)', carbs: 24, protein: 3.5, fat: 1.0, fiber: 1.5, kcal: 120, gi: 70, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_065', name: 'Kasza bulgur (gotowana)', namePl: 'Kasza bulgur (gotowana)', nameEn: 'Bulgur wheat (cooked)', carbs: 19, protein: 3.1, fat: 0.2, fiber: 4.5, kcal: 95, gi: 45, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_066', name: 'Kuskus (gotowany/parzony)', namePl: 'Kuskus (gotowany/parzony)', nameEn: 'Couscous (cooked)', carbs: 23, protein: 3.8, fat: 0.2, fiber: 1.4, kcal: 115, gi: 65, servingSize: 150, category: 'Zbożowe i Pieczywo' },
  { id: 'b_067', name: 'Kasza manna (gotowana na wodzie)', namePl: 'Kasza manna (gotowana na wodzie)', nameEn: 'Semolina porridge (cooked on water)', carbs: 18, protein: 2.5, fat: 0.2, fiber: 0.8, kcal: 85, gi: 65, servingSize: 200, category: 'Zbożowe i Pieczywo' },
  { id: 'b_068', name: 'Komosa ryżowa Quinoa (gotowana)', namePl: 'Komosa ryżowa Quinoa (gotowana)', nameEn: 'Quinoa (cooked)', carbs: 21, protein: 4.4, fat: 1.9, fiber: 2.8, kcal: 120, gi: 45, servingSize: 150, category: 'Zbożowe i Pieczywo' },

  // Płatki, otręby, musli
  { id: 'b_070', name: 'Płatki owsiane górskie', namePl: 'Płatki owsiane górskie', nameEn: 'Rolled oats', carbs: 62, protein: 12.5, fat: 7.0, fiber: 10.0, kcal: 375, gi: 40, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_071', name: 'Płatki owsiane błyskawiczne', namePl: 'Płatki owsiane błyskawiczne', nameEn: 'Instant oats', carbs: 64, protein: 12.0, fat: 6.5, fiber: 9.0, kcal: 370, gi: 55, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_072', name: 'Płatki jaglane', namePl: 'Płatki jaglane', nameEn: 'Millet flakes', carbs: 70, protein: 11.0, fat: 3.0, fiber: 3.5, kcal: 360, gi: 70, servingSize: 40, category: 'Zbożowe i Pieczywo' },
  { id: 'b_073', name: 'Płatki orkiszowe', namePl: 'Płatki orkiszowe', nameEn: 'Spelt flakes', carbs: 60, protein: 13.0, fat: 2.5, fiber: 9.5, kcal: 340, gi: 45, servingSize: 40, category: 'Zbożowe i Pieczywo' },
  { id: 'b_074', name: 'Płatki kukurydziane (Corn Flakes)', namePl: 'Płatki kukurydziane (Corn Flakes)', nameEn: 'Corn flakes', carbs: 84, protein: 7.5, fat: 1.0, fiber: 3.0, kcal: 380, gi: 82, servingSize: 40, category: 'Zbożowe i Pieczywo' },
  { id: 'b_075', name: 'Otręby owsiane', namePl: 'Otręby owsiane', nameEn: 'Oat bran', carbs: 46, protein: 17.5, fat: 7.0, fiber: 15.5, kcal: 320, gi: 35, servingSize: 20, category: 'Zbożowe i Pieczywo' },
  { id: 'b_076', name: 'Otręby pszenne', namePl: 'Otręby pszenne', nameEn: 'Wheat bran', carbs: 20, protein: 16.0, fat: 4.5, fiber: 42.0, kcal: 215, gi: 25, servingSize: 15, category: 'Zbożowe i Pieczywo' },
  { id: 'b_077', name: 'Musli tradycyjne bez cukru', namePl: 'Musli tradycyjne bez cukru', nameEn: 'Sugar-free muesli', carbs: 60, protein: 11.0, fat: 8.0, fiber: 9.0, kcal: 370, gi: 50, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_078', name: 'Granola chrupiąca pieczona', namePl: 'Granola chrupiąca pieczona', nameEn: 'Crunchy granola', carbs: 65, protein: 9.0, fat: 15.0, fiber: 7.0, kcal: 440, gi: 65, servingSize: 45, category: 'Zbożowe i Pieczywo' },

  // Mąki i Skrobie
  { id: 'b_080', name: 'Mąka pszenna typ 500', namePl: 'Mąka pszenna typ 500', nameEn: 'Wheat flour type 500', carbs: 74, protein: 10.0, fat: 1.2, fiber: 2.5, kcal: 345, gi: 85, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_081', name: 'Mąka pszenna pełnoziarnista typ 1850', namePl: 'Mąka pszenna pełnoziarnista typ 1850', nameEn: 'Whole wheat flour 1850', carbs: 62, protein: 12.0, fat: 2.2, fiber: 11.0, kcal: 325, gi: 45, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_082', name: 'Mąka żytnia typ 720', namePl: 'Mąka żytnia typ 720', nameEn: 'Rye flour type 720', carbs: 69, protein: 8.5, fat: 1.7, fiber: 8.0, kcal: 330, gi: 50, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_083', name: 'Mąka orkiszowa razowa', namePl: 'Mąka orkiszowa razowa', nameEn: 'Whole spelt flour', carbs: 63, protein: 14.5, fat: 2.5, fiber: 9.5, kcal: 335, gi: 45, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_084', name: 'Mąka migdałowa (Keto)', namePl: 'Mąka migdałowa (Keto)', nameEn: 'Almond flour (Keto)', carbs: 9, protein: 21.0, fat: 52.0, fiber: 10.0, kcal: 590, gi: 15, servingSize: 30, category: 'Zbożowe i Pieczywo' },
  { id: 'b_085', name: 'Mąka kokosowa (Keto / Błonnik)', namePl: 'Mąka kokosowa (Keto / Błonnik)', nameEn: 'Coconut flour (Keto / High fiber)', carbs: 18, protein: 19.0, fat: 16.0, fiber: 38.0, kcal: 350, gi: 35, servingSize: 20, category: 'Zbożowe i Pieczywo' },
  { id: 'b_086', name: 'Mąka gryczana', namePl: 'Mąka gryczana', nameEn: 'Buckwheat flour', carbs: 66, protein: 12.5, fat: 3.0, fiber: 6.0, kcal: 340, gi: 40, servingSize: 50, category: 'Zbożowe i Pieczywo' },
  { id: 'b_087', name: 'Mąka z ciecierzycy', namePl: 'Mąka z ciecierzycy', nameEn: 'Chickpea flour (Gram)', carbs: 53, protein: 22.0, fat: 6.0, fiber: 11.0, kcal: 360, gi: 35, servingSize: 40, category: 'Zbożowe i Pieczywo' },
  { id: 'b_088', name: 'Mąka ziemniaczana (skrobia)', namePl: 'Mąka ziemniaczana (skrobia)', nameEn: 'Potato starch', carbs: 83, protein: 0.3, fat: 0.1, fiber: 0.5, kcal: 335, gi: 90, servingSize: 20, category: 'Zbożowe i Pieczywo' },
  { id: 'b_089', name: 'Tapioka w perełkach', namePl: 'Tapioka w perełkach', nameEn: 'Tapioca pearls', carbs: 88, protein: 0.2, fat: 0.1, fiber: 0.9, kcal: 355, gi: 85, servingSize: 30, category: 'Zbożowe i Pieczywo' },

  // Tortille i placki
  { id: 'b_090', name: 'Tortilla pszenna (1 szt ~60g)', namePl: 'Tortilla pszenna (1 szt ~60g)', nameEn: 'Wheat tortilla wrap (1 pc ~60g)', carbs: 52, protein: 8.5, fat: 6.5, fiber: 3.0, kcal: 305, gi: 65, servingSize: 60, category: 'Zbożowe i Pieczywo' },
  { id: 'b_091', name: 'Tortilla pełnoziarnista (1 szt ~60g)', namePl: 'Tortilla pełnoziarnista (1 szt ~60g)', nameEn: 'Whole wheat tortilla (1 pc ~60g)', carbs: 45, protein: 9.0, fat: 5.5, fiber: 7.0, kcal: 280, gi: 50, servingSize: 60, category: 'Zbożowe i Pieczywo' }
];
