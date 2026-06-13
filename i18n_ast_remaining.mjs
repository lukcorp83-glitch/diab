import { Project, SyntaxKind, Node } from "ts-morph";
import fs from "fs";

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.{ts,tsx}");

const polishRegex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

function createKey(text) {
    let base = text.toLowerCase()
        .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
        .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (base.length > 30) base = base.substring(0, 30);
    if (base.endsWith('_')) base = base.slice(0, -1);
    return base || "key_" + Math.random().toString(36).substring(7);
}

const outputJsonPath = "./src/locales/pl/translation.json";
const translations = {};
if (fs.existsSync(outputJsonPath)) {
    Object.assign(translations, JSON.parse(fs.readFileSync(outputJsonPath, "utf8")));
}

let totalReplaced = 0;

project.getSourceFiles().forEach(file => {
    let changed = false;
    
    // We only want to process files that already import i18n, or we'll have to add it.
    const hasI18nImport = file.getImportDeclarations().some(imp => 
        imp.getModuleSpecifierValue() === 'react-i18next' || 
        imp.getModuleSpecifierValue() === '../../i18n' || 
        imp.getModuleSpecifierValue() === '../i18n' ||
        imp.getModuleSpecifierValue() === '../../../i18n'
    );

    const replacements = [];

    file.forEachDescendant(node => {
        if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
            const text = node.getLiteralValue();
            if (polishRegex.test(text) && text.trim().length > 0) {
                // Skip if it's already inside an i18n.t call
                const callExpr = node.getFirstAncestorByKind(SyntaxKind.CallExpression);
                if (callExpr) {
                    const funcName = callExpr.getExpression().getText();
                    if (funcName === 't' || funcName === 'i18n.t') return;
                }
                
                // Skip if it is a property assignment key
                if (Node.isPropertyAssignment(node.getParent()) && node.getParent().getNameNode() === node) {
                     return;
                }

                const trimmed = text.trim();
                const key = `auto.${createKey(trimmed)}`;
                translations[key] = trimmed;
                
                // If inside JSX attribute, we might need to wrap in {} if it was just "..."
                if (Node.isJsxAttribute(node.getParent())) {
                    replacements.push({ pos: node.getStart(), end: node.getEnd(), text: `{t('${key}', { defaultValue: ${JSON.stringify(trimmed)} })}` });
                } else if (Node.isJsxExpression(node.getParent())) {
                    // It's inside a ternary like condition ? "Słucham..." : "Coś tam"
                    replacements.push({ pos: node.getStart(), end: node.getEnd(), text: `t('${key}', { defaultValue: ${JSON.stringify(trimmed)} })` });
                } else {
                    // It's a regular string literal in TS code like window.confirm("...")
                    // We need to use i18n.t or t() depending on what's available.
                    // For safety we'll try to use `i18n.t`, but that means we might need to import it.
                    replacements.push({ pos: node.getStart(), end: node.getEnd(), text: `i18n.t('${key}', { defaultValue: ${JSON.stringify(trimmed)} })` });
                }
            }
        }
    });

    if (replacements.length > 0) {
        // Reverse sort so replacing doesn't shift later nodes
        replacements.sort((a, b) => b.pos - a.pos);
        
        for (const rep of replacements) {
            file.replaceText([rep.pos, rep.end], rep.text);
        }
        
        // Add import for i18n if it's not a component using useTranslation, or if it is, maybe add it.
        // To be safe we'll just add `import i18n from '../i18n';` (adjust path) at the top if it's not there.
        if (!file.getImportDeclarations().some(imp => imp.getModuleSpecifierValue().includes('i18n'))) {
            const pathParts = file.getFilePath().split('src/')[1].split('/').length - 1;
            const upDirs = '../'.repeat(pathParts) || './';
            file.addImportDeclaration({
                defaultImport: "i18n",
                moduleSpecifier: `${upDirs}i18n`
            });
        }
        
        file.saveSync();
        totalReplaced += replacements.length;
    }
});

fs.writeFileSync(outputJsonPath, JSON.stringify(translations, null, 2), "utf8");
console.log(`Replaced ${totalReplaced} missing string literals.`);
