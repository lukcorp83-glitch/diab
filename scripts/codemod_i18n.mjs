import { Project, SyntaxKind } from "ts-morph";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project({
    tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

const sourceFiles = project.getSourceFiles("src/**/*.tsx");

function slugify(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9ąćęłńóśźż]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 35);
}

let changedFiles = 0;

for (const sf of sourceFiles) {
    let fileModified = false;
    
    // ZBIERANIE TEKSTÓW Z ATRYBUTÓW (props)
    const validProps = [];
    const jsxAttributes = sf.getDescendantsOfKind(SyntaxKind.JsxAttribute);
    
    for (const attr of jsxAttributes) {
        const name = attr.getNameNode().getText();
        if (['placeholder', 'title', 'label', 'aria-label', 'text', 'description'].includes(name)) {
            const init = attr.getInitializer();
            if (init && init.getKind() === SyntaxKind.StringLiteral) {
                const text = init.getLiteralValue();
                if (text.trim().length > 1 && /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(text)) {
                    validProps.push({ node: init, text: text.trim(), original: text });
                }
            }
        }
    }
    
    // ZBIERANIE TEXTU Z TAGÓW (na wypadek gdyby coś zostało pominięte wczesniej)
    const validTexts = [];
    const jsxTexts = sf.getDescendantsOfKind(SyntaxKind.JsxText);
    
    for (const node of jsxTexts) {
        const text = node.getLiteralText();
        const trimmed = text.trim();
        if (trimmed.length > 1 && /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(trimmed)) {
             validTexts.push({ node, text: trimmed, original: text });
        }
    }
    
    if (validProps.length > 0 || validTexts.length > 0) {
        // Weryfikacja czy posiadamy instancję { t }
        let hasTranslationHook = false;
        const componentsWithTexts = new Set();
        
        const allNodes = [...validProps.map(p => p.node), ...validTexts.map(t => t.node)];
        
        for (const node of allNodes) {
             const funcAncestor = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || 
                                  node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
                                  node.getFirstAncestorByKind(SyntaxKind.FunctionExpression);
             if (funcAncestor) {
                 const block = funcAncestor.getFirstChildByKind(SyntaxKind.Block);
                 if (block && !componentsWithTexts.has(block)) {
                     componentsWithTexts.add(block);
                 }
             }
        }
        
        for (const block of componentsWithTexts) {
            if (!block.getText().includes("useTranslation(")) {
                block.insertStatements(0, "const { t } = useTranslation();");
                hasTranslationHook = true;
            } else {
                hasTranslationHook = true;
            }
        }
        
        if (hasTranslationHook) {
            // Nadpisywanie ATRYBUTÓW (props) -> zamiast title="Test" robimy title={t('slug', {defaultValue: 'Test'})}
            for (const { node, text } of validProps) {
                const slug = "auto." + slugify(text);
                const safeText = text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
                node.replaceWithText(`{t('${slug}', { defaultValue: '${safeText}' })}`);
                fileModified = true;
            }
            
            // Nadpisywanie JsxText -> {t('slug', {defaultValue: 'Test'})}
            for (const { node, text, original } of validTexts) {
                const slug = "auto." + slugify(text);
                const safeText = text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
                
                const matchStart = original.match(/^\s*/);
                const matchEnd = original.match(/\s*$/);
                const startSpace = matchStart ? matchStart[0] : '';
                const endSpace = matchEnd ? matchEnd[0] : '';
                
                const replacement = `${startSpace}{t('${slug}', { defaultValue: '${safeText}' })}${endSpace}`;
                try {
                    node.replaceWithText(replacement);
                    fileModified = true;
                } catch (e) {
                    // ignore format errors
                }
            }
            
            if (fileModified && !sf.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "react-i18next")) {
                sf.addImportDeclaration({
                    namedImports: ["useTranslation"],
                    moduleSpecifier: "react-i18next"
                });
            }
            
            if (fileModified) {
                sf.saveSync();
                changedFiles++;
                console.log(`[+] Zaktualizowano atrybuty/teksty w: ${sf.getBaseName()}`);
            }
        }
    }
}

console.log(`\n🎉 Codemod 2.0 (Atrybuty JSX) zakończony! Zaktualizowano ${changedFiles} plików.`);
