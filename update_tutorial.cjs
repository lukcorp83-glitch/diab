const fs = require('fs');
let content = fs.readFileSync('src/components/TutorialView.tsx', 'utf8');

// Replace compendium titles
content = content.replace(/title: 'Cele Glikemiczne \(rekomendacje PTD\)',/g, "title: i18n.t('auto.cele_glikemiczne_ptd', { defaultValue: 'Cele Glikemiczne (rekomendacje PTD)' }),");
content = content.replace(/title: 'Hipoglikemia \(niedocukrzenie\)',/g, "title: i18n.t('auto.hipoglikemia_niedocukrzenie', { defaultValue: 'Hipoglikemia (niedocukrzenie)' }),");
content = content.replace(/title: 'Hiperglikemia i Kwasica Ketonowa',/g, "title: i18n.t('auto.hiperglikemia_kwasica', { defaultValue: 'Hiperglikemia i Kwasica Ketonowa' }),");
content = content.replace(/title: 'Hemoglobina Glikowana \(HbA1c\)',/g, "title: i18n.t('auto.hba1c', { defaultValue: 'Hemoglobina Glikowana (HbA1c)' }),");
content = content.replace(/title: 'Zjawisko Brzasku \(Skoki rano\)',/g, "title: i18n.t('auto.zjawisko_brzasku', { defaultValue: 'Zjawisko Brzasku (Skoki rano)' }),");
content = content.replace(/title: 'Glukagon \(Zastrzyk ratunkowy\)',/g, "title: i18n.t('auto.glukagon_zastrzyk', { defaultValue: 'Glukagon (Zastrzyk ratunkowy)' }),");
content = content.replace(/title: 'Alkohol a Cukrzyca',/g, "title: i18n.t('auto.alkohol_a_cukrzyca', { defaultValue: 'Alkohol a Cukrzyca' }),");
content = content.replace(/title: 'Przechowywanie Insuliny',/g, "title: i18n.t('auto.przechowywanie_insuliny', { defaultValue: 'Przechowywanie Insuliny' }),");

// Replace FAQ titles
content = content.replace(/question: 'Czym jest Gliko Czat\?',/g, "question: i18n.t('auto.czym_jest_gliko_czat', { defaultValue: 'Czym jest Gliko Czat?' }),");
content = content.replace(/question: 'Skąd mam wziąć klucz Gemini API\?',/g, "question: i18n.t('auto.skad_wziac_klucz_gemini', { defaultValue: 'Skąd mam wziąć klucz Gemini API?' }),");
content = content.replace(/question: 'Czy aplikacja działa bez internetu\?',/g, "question: i18n.t('auto.czy_dziala_bez_internetu', { defaultValue: 'Czy aplikacja działa bez internetu?' }),");
content = content.replace(/question: 'Jak wejść w ukryte ustawienia profilu\?',/g, "question: i18n.t('auto.jak_wejsc_w_ukryte_ustawienia', { defaultValue: 'Jak wejść w ukryte ustawienia profilu?' }),");
content = content.replace(/question: 'Skąd pobierane są dane o żywności\?',/g, "question: i18n.t('auto.skad_pobierane_dane_zywnosc', { defaultValue: 'Skąd pobierane są dane o żywności?' }),");

fs.writeFileSync('src/components/TutorialView.tsx', content);
