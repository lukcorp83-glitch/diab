const fs = require('fs');
const enPath = 'src/locales/en/translation.json';
let enContent = fs.readFileSync(enPath, 'utf8');

const regex1 = /"💪 In my price list for your immunization, there is a slight insulin blockade\.Take into account that your body's reaction will be a bit cooler\."/g;
const regex2 = /"💪 In my pricing for your immunity, there is a slight insulin block\. Expect a slightly cooler reaction from your body\."/g;
const regex3 = /"💪 In my price list for your immunization, there is a slight insulin blockade\. Take into account that your body's reaction will be a bit cooler\."/g;

const goodEnStr = '"💪 According to my analysis of your insulin resistance, there is a slight block. Expect a slightly reduced bodily response to doses."';

enContent = enContent.replace(regex1, goodEnStr);
enContent = enContent.replace(regex2, goodEnStr);
enContent = enContent.replace(regex3, goodEnStr);

fs.writeFileSync(enPath, enContent);
console.log('English translations fixed!');
