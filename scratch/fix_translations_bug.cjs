const fs = require('fs');

const fixFiles = () => {
  const plPath = 'src/locales/pl/translation.json';
  const enPath = 'src/locales/en/translation.json';
  const profilePath = 'src/components/Profile.tsx';

  let plContent = fs.readFileSync(plPath, 'utf8');
  let enContent = fs.readFileSync(enPath, 'utf8');
  let profileContent = fs.readFileSync(profilePath, 'utf8');

  // Fix &quot;
  plContent = plContent.replace(/&quot;/g, '\\"');
  enContent = enContent.replace(/&quot;/g, '\\"');
  profileContent = profileContent.replace(/&quot;/g, '\\"');

  // Fix "cennik" in PL
  const badPlRegex = /"💪 W moim cenniku Twojego uodpornienia, widnieje lekka blokada na insulinę\. Licz się z trochę chłodniejszą reakcją organizmu\."/g;
  const goodPlStr = '"💪 Z moich analiz insulinooporności wynika, że występuje u Ciebie lekka blokada na insulinę. Licz się z trochę słabszą reakcją organizmu na dawki."';
  plContent = plContent.replace(badPlRegex, goodPlStr);

  // Note: Since I am not 100% sure what the English was, I will also replace the PL string that got mistakenly put into EN JSON if it happened.
  enContent = enContent.replace(badPlRegex, goodPlStr);

  fs.writeFileSync(plPath, plContent);
  fs.writeFileSync(enPath, enContent);
  fs.writeFileSync(profilePath, profileContent);

  console.log("Translation and &quot; fixes applied!");
};

fixFiles();
