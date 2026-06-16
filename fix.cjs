const fs = require('fs');

['src/locales/pl/translation.json', 'src/locales/en/translation.json'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // clean up powershell corruptions
  content = content.replace(/,\`n  \"auto\.zbiorniczki\": \"(Zbiorniczki|Reservoirs)\"\`n/g, '');
  content = content.replace(/,\r\n  \"auto\.zbiorniczki\": \"(Zbiorniczki|Reservoirs)\"\r\n/g, '');
  
  let obj;
  try { 
      obj = JSON.parse(content); 
  } catch (e) {
      console.log('first parse failed, aggressive clean for ' + file);
      // More aggressive clean if it's at the end of the file
      const match = content.match(/\"auto\.przod\"/);
      if (match) {
          content = content.substring(0, match.index);
          const langPrefix = file.includes('pl') ? 'przód' : 'front';
          content += `"auto.przod": "${langPrefix}"\n}`;
          obj = JSON.parse(content);
      }
  }
  
  if (obj) {
      obj['auto.zbiorniczki'] = file.includes('pl') ? 'Zbiorniczki' : 'Reservoirs';
      fs.writeFileSync(file, JSON.stringify(obj, null, 2));
      console.log('Fixed ' + file);
  }
});
