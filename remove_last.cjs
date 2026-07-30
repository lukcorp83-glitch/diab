const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

function findClosingBrace(text, startIdx) {
  let openBraces = 0;
  let inString = false;
  let stringChar = '';
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === stringChar && text[i-1] !== '\\') {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '\`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === '{') openBraces++;
    else if (char === '}') {
      openBraces--;
      if (openBraces === 0) {
        return i;
      }
    }
  }
  return -1;
}

function removeUseEffect(text, patternStr) {
  const startIdx = text.indexOf(patternStr);
  if (startIdx === -1) return text;
  
  const useEffectStart = text.lastIndexOf('useEffect(() => {', startIdx);
  if (useEffectStart === -1) return text;
  
  const blockStartBrace = text.indexOf('{', useEffectStart);
  const blockEndBrace = findClosingBrace(text, blockStartBrace);
  
  const useEffectEnd = text.indexOf(';', blockEndBrace) + 1;
  
  console.log(`Removing block for: ${patternStr}`);
  return text.substring(0, useEffectStart) + text.substring(useEffectEnd);
}

content = removeUseEffect(content, 'settingsRef');
content = removeUseEffect(content, '"nightscout"');
fs.writeFileSync('src/App.tsx', content);
