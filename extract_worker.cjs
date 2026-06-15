const fs = require('fs');
const { Project, SyntaxKind, Node } = require('ts-morph');
const { translate } = require('bing-translate-api');

const project = new Project();
project.addSourceFilesAtPaths("src/workers/glikosense.worker.ts");

const plFile = 'src/locales/pl/translation.json';
const enFile = 'src/locales/en/translation.json';

const pl = JSON.parse(fs.readFileSync(plFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

const polishRegex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

function createKey(text) {
    let base = text.toLowerCase()
        .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
        .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (base.length > 25) base = base.substring(0, 25);
    if (base.endsWith('_')) base = base.slice(0, -1);
    return base || "key_" + Math.random().toString(36).substring(7);
}

let modified = 0;
const missingEn = [];

// Adding specific keys from GlikoSenseNeural
const manualKeys = {
  'auto.opiekun': 'Opiekun ',
  'auto.analiza_systemowa_ai': 'Analiza Systemowa AI',
  'auto.analiza_trendu': 'Analiza Trendu',
  'auto.detekcja_anomalii': 'Detekcja Anomalii',
  'auto.ochrona_hypo': 'Ochrona Hypo'
};

for (const [k, v] of Object.entries(manualKeys)) {
  const shortK = k.replace('auto.', '');
  if (!pl.auto) pl.auto = {};
  if (!en.auto) en.auto = {};
  pl.auto[shortK] = v;
  if (!en.auto[shortK]) missingEn.push({ key: shortK, text: v });
}

project.getSourceFiles().forEach(file => {
    const replacements = [];
    
    file.forEachDescendant(node => {
        if (Node.isTemplateExpression(node)) {
            const fullText = node.getText().slice(1, -1); // remove backticks
            if (polishRegex.test(fullText)) {
                // Find parent to avoid double wrap
                if (node.getParentIfKind(SyntaxKind.CallExpression)?.getExpression().getText().includes('t')) return;

                const head = node.getHead().getLiteralText();
                const spans = node.getTemplateSpans();
                
                let defaultValue = head;
                const variables = {};
                
                spans.forEach((span, i) => {
                    const varName = `var${i}`;
                    defaultValue += `{{${varName}}}` + span.getLiteral().getLiteralText();
                    variables[varName] = span.getExpression().getText();
                });
                
                const shortKey = createKey(defaultValue);
                const fullKey = `auto.${shortKey}`;
                
                pl.auto[shortKey] = defaultValue;
                if (!en.auto[shortKey]) missingEn.push({ key: shortKey, text: defaultValue });
                
                let varStr = Object.entries(variables).map(([k, v]) => `${k}: ${v}`).join(', ');
                const rep = `i18n.t('${fullKey}', { defaultValue: ${JSON.stringify(defaultValue)}${varStr ? ', ' + varStr : ''} })`;
                
                replacements.push({ pos: node.getStart(), end: node.getEnd(), text: rep });
            }
        } else if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
            const text = node.getLiteralValue();
            if (polishRegex.test(text)) {
                if (node.getParentIfKind(SyntaxKind.CallExpression)?.getExpression().getText().includes('t')) return;
                if (Node.isPropertyAssignment(node.getParent()) && node.getParent().getNameNode() === node) return;

                const shortKey = createKey(text);
                const fullKey = `auto.${shortKey}`;
                
                pl.auto[shortKey] = text;
                if (!en.auto[shortKey]) missingEn.push({ key: shortKey, text: text });
                
                const rep = `i18n.t('${fullKey}', { defaultValue: ${JSON.stringify(text)} })`;
                replacements.push({ pos: node.getStart(), end: node.getEnd(), text: rep });
            }
        }
    });

    if (replacements.length > 0) {
        replacements.sort((a, b) => b.pos - a.pos);
        for (const rep of replacements) {
            file.replaceText([rep.pos, rep.end], rep.text);
        }
        if (!file.getImportDeclarations().some(imp => imp.getModuleSpecifierValue().includes('i18n'))) {
            file.addImportDeclaration({ defaultImport: "i18n", moduleSpecifier: "../i18n" });
        }
        file.saveSync();
        modified += replacements.length;
    }
});

async function runTrans() {
  console.log(`Zmieniono ${modified} wyrażeń w glikosense.worker.ts. Do tłumaczenia: ${missingEn.length}`);
  
  for (let i = 0; i < missingEn.length; i++) {
    const item = missingEn[i];
    try {
      // Clean up variables {{var0}} for translation
      const cleanText = item.text.replace(/\{\{.*?\}\}/g, (match) => match); 
      // Bing usually keeps {{var}} intact but sometimes adds spaces.
      const res = await translate(cleanText, null, 'en');
      let t = res.translation.replace(/\{\{ /g, '{{').replace(/ \}\}/g, '}}');
      en.auto[item.key] = t;
      console.log(`[${i+1}/${missingEn.length}] ${item.text} -> ${t}`);
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(e.message);
    }
  }

  fs.writeFileSync(plFile, JSON.stringify(pl, null, 2));
  fs.writeFileSync(enFile, JSON.stringify(en, null, 2));
  console.log('Gotowe!');
}

runTrans();
