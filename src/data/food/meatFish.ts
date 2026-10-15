import { Product } from '../../types';

export const MEAT_FISH_PRODUCTS: Product[] = [
  // Drób
  { id: 'm_001', name: 'Pierś z kurczaka (surowa)', namePl: 'Pierś z kurczaka (surowa)', nameEn: 'Raw chicken breast', carbs: 0.0, protein: 21.5, fat: 1.3, kcal: 100, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_002', name: 'Pierś z kurczaka pieczona / gotowana', namePl: 'Pierś z kurczaka pieczona / gotowana', nameEn: 'Cooked chicken breast', carbs: 0.0, protein: 31.0, fat: 3.6, kcal: 165, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_003', name: 'Udko z kurczaka bez skóry (pieczone)', namePl: 'Udko z kurczaka bez skóry (pieczone)', nameEn: 'Chicken thigh skinless (cooked)', carbs: 0.0, protein: 24.0, fat: 8.5, kcal: 175, gi: 0, servingSize: 130, category: 'Mięso i Ryby' },
  { id: 'm_004', name: 'Udko z kurczaka ze skórą (pieczone)', namePl: 'Udko z kurczaka ze skórą (pieczone)', nameEn: 'Chicken thigh with skin (roasted)', carbs: 0.0, protein: 22.0, fat: 15.0, kcal: 230, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_005', name: 'Pierś z indyka (pieczona)', namePl: 'Pierś z indyka (pieczona)', nameEn: 'Roasted turkey breast', carbs: 0.0, protein: 29.0, fat: 2.0, kcal: 135, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_006', name: 'Udziec z indyka bez skóry (pieczony)', namePl: 'Udziec z indyka bez skóry (pieczony)', nameEn: 'Turkey drumstick/thigh (cooked)', carbs: 0.0, protein: 26.0, fat: 5.5, kcal: 160, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_007', name: 'Kaczka pieczona ze skórą', namePl: 'Kaczka pieczona ze skórą', nameEn: 'Roast duck with skin', carbs: 0.0, protein: 19.0, fat: 28.0, kcal: 335, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },

  // Wieprzowina i Wołowina
  { id: 'm_010', name: 'Polędwiczka wieprzowa (pieczona)', namePl: 'Polędwiczka wieprzowa (pieczona)', nameEn: 'Pork tenderloin (roasted)', carbs: 0.0, protein: 26.0, fat: 3.5, kcal: 140, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_011', name: 'Schab wieprzowy pieczony', namePl: 'Schab wieprzowy pieczony', nameEn: 'Roast pork loin', carbs: 0.0, protein: 28.0, fat: 7.0, kcal: 180, gi: 0, servingSize: 130, category: 'Mięso i Ryby' },
  { id: 'm_012', name: 'Karkówka wieprzowa pieczona', namePl: 'Karkówka wieprzowa pieczona', nameEn: 'Roasted pork neck', carbs: 0.0, protein: 23.0, fat: 19.0, kcal: 265, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_013', name: 'Boczek wieprzowy pieczony', namePl: 'Boczek wieprzowy pieczony', nameEn: 'Baked pork belly / bacon', carbs: 0.0, protein: 14.0, fat: 48.0, kcal: 490, gi: 0, servingSize: 50, category: 'Mięso i Ryby' },
  { id: 'm_014', name: 'Mięso mielone z szynki wieprzowej', namePl: 'Mięso mielone z szynki wieprzowej', nameEn: 'Ground pork ham', carbs: 0.0, protein: 20.0, fat: 7.0, kcal: 145, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_015', name: 'Wołowina polędwica (stek)', namePl: 'Wołowina polędwica (stek)', nameEn: 'Beef tenderloin steak', carbs: 0.0, protein: 28.0, fat: 6.0, kcal: 170, gi: 0, servingSize: 200, category: 'Mięso i Ryby' },
  { id: 'm_016', name: 'Wołowina antrykot / rostbef', namePl: 'Wołowina antrykot / rostbef', nameEn: 'Ribeye / Striploin beef steak', carbs: 0.0, protein: 24.0, fat: 16.0, kcal: 240, gi: 0, servingSize: 200, category: 'Mięso i Ryby' },
  { id: 'm_017', name: 'Wołowina mielona chuda (10% tłuszczu)', namePl: 'Wołowina mielona chuda (10% tłuszczu)', nameEn: 'Lean ground beef 10% fat', carbs: 0.0, protein: 24.0, fat: 10.0, kcal: 190, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_018', name: 'Tatar wołowy (z przyprawami i jajkiem)', namePl: 'Tatar wołowy (z przyprawami i jajkiem)', nameEn: 'Beef tartare', carbs: 1.5, protein: 20.0, fat: 6.0, kcal: 140, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },

  // Wędliny, kiełbasy i parówki
  { id: 'm_020', name: 'Polędwica sopocka', namePl: 'Polędwica sopocka', nameEn: 'Sopocka cured pork loin', carbs: 1.0, protein: 20.0, fat: 3.5, kcal: 115, gi: 0, servingSize: 40, category: 'Mięso i Ryby' },
  { id: 'm_021', name: 'Szynka z piersi indyka', namePl: 'Szynka z piersi indyka', nameEn: 'Turkey breast ham', carbs: 1.2, protein: 18.0, fat: 1.8, kcal: 95, gi: 0, servingSize: 40, category: 'Mięso i Ryby' },
  { id: 'm_022', name: 'Szynka gotowana tradycyjna', namePl: 'Szynka gotowana tradycyjna', nameEn: 'Traditional cooked ham', carbs: 1.0, protein: 19.0, fat: 4.5, kcal: 120, gi: 0, servingSize: 40, category: 'Mięso i Ryby' },
  { id: 'm_023', name: 'Szynka dojrzewająca (Prosciutto / Szwarcwaldzka)', namePl: 'Szynka dojrzewająca (Prosciutto / Szwarcwaldzka)', nameEn: 'Dry-cured ham (Prosciutto)', carbs: 0.5, protein: 26.0, fat: 14.0, kcal: 235, gi: 0, servingSize: 30, category: 'Mięso i Ryby' },
  { id: 'm_024', name: 'Kabanosy wieprzowe tradycyjne', namePl: 'Kabanosy wieprzowe tradycyjne', nameEn: 'Pork kabanos sausage', carbs: 2.0, protein: 28.0, fat: 42.0, kcal: 500, gi: 0, servingSize: 50, category: 'Mięso i Ryby' },
  { id: 'm_025', name: 'Kabanosy drobiowe z kurczaka/indyka', namePl: 'Kabanosy drobiowe z kurczaka/indyka', nameEn: 'Poultry kabanos sausage', carbs: 2.5, protein: 30.0, fat: 28.0, kcal: 385, gi: 0, servingSize: 50, category: 'Mięso i Ryby' },
  { id: 'm_026', name: 'Kiełbasa śląska parzona / z grilla', namePl: 'Kiełbasa śląska parzona / z grilla', nameEn: 'Silesian pork sausage', carbs: 1.5, protein: 14.0, fat: 22.0, kcal: 260, gi: 0, servingSize: 100, category: 'Mięso i Ryby' },
  { id: 'm_027', name: 'Kiełbasa krakowska sucha', namePl: 'Kiełbasa krakowska sucha', nameEn: 'Dry Krakowska sausage', carbs: 1.0, protein: 25.0, fat: 12.0, kcal: 215, gi: 0, servingSize: 40, category: 'Mięso i Ryby' },
  { id: 'm_028', name: 'Parówki z szynki 93-100%', namePl: 'Parówki z szynki 93-100%', nameEn: 'Ham hot dog wieners 93-100%', carbs: 1.5, protein: 15.0, fat: 20.0, kcal: 245, gi: 0, servingSize: 90, category: 'Mięso i Ryby' },
  { id: 'm_029', name: 'Parówki klasyczne (np. Berlinki)', namePl: 'Parówki klasyczne (np. Berlinki)', nameEn: 'Classic hot dog wieners', carbs: 2.5, protein: 12.0, fat: 24.0, kcal: 275, gi: 0, servingSize: 80, category: 'Mięso i Ryby' },
  { id: 'm_030', name: 'Kaszanka tradycyjna gryczana', namePl: 'Kaszanka tradycyjna gryczana', nameEn: 'Polish black pudding / blood sausage', carbs: 14.0, protein: 8.5, fat: 16.0, kcal: 235, gi: 45, servingSize: 120, category: 'Mięso i Ryby' },
  { id: 'm_031', name: 'Pasztet pieczony wieprzowo-drobiowy', namePl: 'Pasztet pieczony wieprzowo-drobiowy', nameEn: 'Baked meat pate', carbs: 4.5, protein: 13.0, fat: 26.0, kcal: 305, gi: 25, servingSize: 50, category: 'Mięso i Ryby' },
  { id: 'm_032', name: 'Salami tradycyjne', namePl: 'Salami tradycyjne', nameEn: 'Traditional salami', carbs: 1.0, protein: 21.0, fat: 38.0, kcal: 430, gi: 0, servingSize: 30, category: 'Mięso i Ryby' },

  // Ryby świeże i pieczone
  { id: 'm_040', name: 'Łosoś atlantycki pieczony', namePl: 'Łosoś atlantycki pieczony', nameEn: 'Baked Atlantic salmon', carbs: 0.0, protein: 25.0, fat: 14.0, kcal: 230, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_041', name: 'Dorsz atlantycki pieczony', namePl: 'Dorsz atlantycki pieczony', nameEn: 'Baked Atlantic cod', carbs: 0.0, protein: 23.0, fat: 0.8, kcal: 105, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_042', name: 'Pstrąg tęczowy pieczony', namePl: 'Pstrąg tęczowy pieczony', nameEn: 'Baked rainbow trout', carbs: 0.0, protein: 24.0, fat: 7.0, kcal: 160, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_043', name: 'Makrela świeża pieczona', namePl: 'Makrela świeża pieczona', nameEn: 'Roasted fresh mackerel', carbs: 0.0, protein: 23.0, fat: 16.0, kcal: 240, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_044', name: 'Tuńczyk świeży (stek pieczony/grillowany)', namePl: 'Tuńczyk świeży (stek pieczony/grillowany)', nameEn: 'Fresh tuna steak', carbs: 0.0, protein: 30.0, fat: 3.0, kcal: 150, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_045', name: 'Mintaj filet pieczony', namePl: 'Mintaj filet pieczony', nameEn: 'Baked pollock fillet', carbs: 0.0, protein: 21.0, fat: 0.9, kcal: 95, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },
  { id: 'm_046', name: 'Morszczuk filet pieczony', namePl: 'Morszczuk filet pieczony', nameEn: 'Baked hake fillet', carbs: 0.0, protein: 20.0, fat: 1.5, kcal: 95, gi: 0, servingSize: 150, category: 'Mięso i Ryby' },

  // Ryby wędzone i przetwory
  { id: 'm_050', name: 'Łosoś wędzony na zimno w plastrach', namePl: 'Łosoś wędzony na zimno w plastrach', nameEn: 'Smoked salmon cold-smoked', carbs: 0.5, protein: 22.0, fat: 12.0, kcal: 200, gi: 0, servingSize: 50, category: 'Mięso i Ryby' },
  { id: 'm_051', name: 'Makrela wędzona', namePl: 'Makrela wędzona', nameEn: 'Smoked mackerel', carbs: 0.0, protein: 21.0, fat: 16.0, kcal: 230, gi: 0, servingSize: 100, category: 'Mięso i Ryby' },
  { id: 'm_052', name: 'Tuńczyk w puszce w sosie własnym', namePl: 'Tuńczyk w puszce w sosie własnym', nameEn: 'Canned tuna in water/brine', carbs: 0.0, protein: 25.5, fat: 0.8, kcal: 110, gi: 0, servingSize: 120, category: 'Mięso i Ryby' },
  { id: 'm_053', name: 'Tuńczyk w puszce w oleju', namePl: 'Tuńczyk w puszce w oleju', nameEn: 'Canned tuna in oil', carbs: 0.0, protein: 26.0, fat: 9.0, kcal: 190, gi: 0, servingSize: 120, category: 'Mięso i Ryby' },
  { id: 'm_054', name: 'Śledź w oleju z cebulką', namePl: 'Śledź w oleju z cebulką', nameEn: 'Herring fillets in oil with onion', carbs: 1.5, protein: 13.0, fat: 28.0, kcal: 310, gi: 0, servingSize: 100, category: 'Mięso i Ryby' },
  { id: 'm_055', name: 'Śledź w śmietanie', namePl: 'Śledź w śmietanie', nameEn: 'Herring in sour cream', carbs: 4.5, protein: 9.0, fat: 16.0, kcal: 200, gi: 25, servingSize: 120, category: 'Mięso i Ryby' },
  { id: 'm_056', name: 'Szproty wędzone w oleju', namePl: 'Szproty wędzone w oleju', nameEn: 'Canned smoked sprats in oil', carbs: 0.0, protein: 17.0, fat: 32.0, kcal: 360, gi: 0, servingSize: 100, category: 'Mięso i Ryby' },

  // Owoce morza
  { id: 'm_060', name: 'Krewetki gotowane / smażone', namePl: 'Krewetki gotowane / smażone', nameEn: 'Cooked prawns / shrimp', carbs: 0.5, protein: 24.0, fat: 1.5, kcal: 110, gi: 0, servingSize: 120, category: 'Mięso i Ryby' },
  { id: 'm_061', name: 'Kalmary krążki (smażone w maśle/czosnku)', namePl: 'Kalmary krążki (smażone w maśle/czosnku)', nameEn: 'Squid rings (garlic butter)', carbs: 2.0, protein: 18.0, fat: 4.0, kcal: 120, gi: 0, servingSize: 120, category: 'Mięso i Ryby' },
  { id: 'm_062', name: 'Małże (omułki gotowane w winie)', namePl: 'Małże (omułki gotowane w winie)', nameEn: 'Steamed mussels', carbs: 3.5, protein: 16.0, fat: 2.5, kcal: 105, gi: 0, servingSize: 150, category: 'Mięso i Ryby' }
];
