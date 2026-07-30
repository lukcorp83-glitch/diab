const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/services/gemini.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the broken block
const brokenBlockRegex = /const result = await Promise\.race\(\[\s*client\.models\.generateContent\(\{/;
const fixedBlock = `const result = await Promise.race([
            client.models.generateContent({
              model: model,
              contents: contents,
            }),
            new Promise<never>((_, reject) => {
              const id = setTimeout(() => {
                clearTimeout(id);
                reject(new Error("Timeout_AI"));
              }, 125000);
            }),
          ]);`;

if (content.match(brokenBlockRegex)) {
  content = content.replace(brokenBlockRegex, fixedBlock);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully fixed gemini.ts syntax!');
} else {
  console.log('Could not find broken block in gemini.ts!');
}
