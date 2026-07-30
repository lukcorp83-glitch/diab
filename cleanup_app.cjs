const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

// We will remove:
// 1. aiReports onSnapshot
// 2. pump status onSnapshot
// 3. pet onSnapshot
// 4. settings onSnapshot
// 5. logs onSnapshot
// 6. nightscout onSnapshot

// Function to find balanced braces from a starting index
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

// Remove blocks starting with a specific pattern until the closing brace
function removeUseEffect(text, patternStr) {
  const startIdx = text.indexOf(patternStr);
  if (startIdx === -1) return text;
  
  // Find the useEffect block starting before the pattern
  const useEffectStart = text.lastIndexOf('useEffect(() => {', startIdx);
  if (useEffectStart === -1) return text;
  
  // Find the end of useEffect block
  const blockStartBrace = text.indexOf('{', useEffectStart);
  const blockEndBrace = findClosingBrace(text, blockStartBrace);
  
  // Also find the ending `}, [deps]);`
  const useEffectEnd = text.indexOf(';', blockEndBrace) + 1;
  
  console.log(`Removing block for: ${patternStr}`);
  return text.substring(0, useEffectStart) + text.substring(useEffectEnd);
}

// 1. aiReports
content = removeUseEffect(content, '"aiReports"');

// 2. pump status
content = removeUseEffect(content, '"pump"');

// 3. pet status
content = removeUseEffect(content, '"pet"');

// 4. settings/profile
content = removeUseEffect(content, '"settings",\n            "profile"');
// Fallback if formatting differs:
content = removeUseEffect(content, '"settings",\r\n            "profile"');
content = removeUseEffect(content, 'settingsRef');

// 5. logs
content = removeUseEffect(content, 'const logsCollection = collection(');

// 6. nightscout
content = removeUseEffect(content, '"nightscout"');

// We also need to add the import to useAppSubscriptions and call it
content = content.replace(
  'import { useGlikoServer } from "./hooks/useGlikoServer";',
  'import { useGlikoServer } from "./hooks/useGlikoServer";\nimport { useAppSubscriptions } from "./hooks/useAppSubscriptions";'
);

content = content.replace(
  'const { t } = useTranslation();',
  'const { t } = useTranslation();\n  useAppSubscriptions(user);'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Cleanup complete!");
