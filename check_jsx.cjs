const fs = require('fs');
let code = fs.readFileSync('C:/Users/luk/Downloads/diab/src/components/MLAnalysisWidget.tsx', 'utf8');
code = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // remove comments
let tags = [];
let i = 0;
while (i < code.length) {
  if (code[i] === '<' && code[i+1] !== ' ' && code[i+1] !== '=') {
    let j = i + 1;
    let isClosing = false;
    if (code[j] === '/') {
      isClosing = true;
      j++;
    }
    let tagName = '';
    while (j < code.length && /[a-zA-Z0-9_.-]/.test(code[j])) {
      tagName += code[j];
      j++;
    }
    if (tagName) {
      let braceDepth = 0;
      let quote = null;
      let k = j;
      let isSelfClosing = false;
      while (k < code.length) {
        if (quote) {
          if (code[k] === quote) quote = null;
        } else {
          if (code[k] === '\"' || code[k] === '\'') quote = code[k];
          else if (code[k] === '{') braceDepth++;
          else if (code[k] === '}') braceDepth--;
          else if (braceDepth === 0 && code[k] === '>') {
            if (code[k-1] === '/') isSelfClosing = true;
            break;
          }
        }
        k++;
      }
      if (k < code.length && !isSelfClosing && tagName !== 'Fragment' && tagName !== '') {
        if (isClosing) {
          if (tags.length > 0 && tags[tags.length-1].name === tagName) {
            tags.pop();
          } else {
            let found = -1;
            for(let x = tags.length - 1; x >= 0; x--) {
              if (tags[x].name === tagName) { found = x; break; }
            }
            if (found !== -1) {
              console.log('Unclosed tags before', tagName, ':', tags.slice(found + 1).map(t => t.name + ' at ' + t.line));
              tags = tags.slice(0, found);
            } else {
              console.log('Extra closing tag:', tagName, 'at line', code.slice(0, i).split('\n').length);
            }
          }
        } else {
          tags.push({ name: tagName, line: code.slice(0, i).split('\n').length });
        }
      }
      i = k;
    }
  }
  i++;
}
console.log('Unclosed at EOF:', tags.map(t => t.name + ' at ' + t.line));
