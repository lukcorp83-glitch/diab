import { Project, SyntaxKind } from "ts-morph";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { translate } from '@vitalets/google-translate-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project({
    tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

const enPath = path.join(__dirname, '../src/locales/en/translation.json');
const plPath = path.join(__dirname, '../src/locales/pl/translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const plData = JSON.parse(fs.readFileSync(plPath, 'utf8'));

const setNestedValue = (obj, pathString, value) => {
    const parts = pathString.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
};

const getNestedValue = (obj, pathString) => {
    const parts = pathString.split('.');
    let current = obj;
    for (let part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
};

async function main() {
    console.log("🔍 Skanowanie AST pod kątem tłumaczeń (TS-Morph Extraction)...");
    
    // Tylko pliki w components (gdzie działał nasz parser)
    const sourceFiles = project.getSourceFiles("src/components/**/*.tsx");
    
    let missingEnTranslations = [];
    let extractedCount = 0;
    
    for (const sf of sourceFiles) {
        const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
        for (const call of callExprs) {
            if (call.getExpression().getText() === "t") {
                const args = call.getArguments();
                if (args.length >= 2) {
                    const keyArg = args[0];
                    const objArg = args[1];
                    
                    if (keyArg.getKind() === SyntaxKind.StringLiteral && objArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                        const keyPath = keyArg.getLiteralValue();
                        
                        const prop = objArg.getProperty("defaultValue");
                        if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
                            const init = prop.getInitializer();
                            // Może to być StringLiteral lub NoSubstitutionTemplateLiteral
                            if (init && (init.getKind() === SyntaxKind.StringLiteral || init.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)) {
                                const defaultVal = init.getLiteralValue ? init.getLiteralValue() : init.getText().replace(/^[`'"]|[`'"]$/g, '');
                                extractedCount++;
                                
                                // Uzupełnijmy polski
                                if (!getNestedValue(plData, keyPath)) {
                                    setNestedValue(plData, keyPath, defaultVal);
                                }
                                
                                // Uzupełnijmy EN jeśli brak
                                if (!getNestedValue(enData, keyPath)) {
                                    missingEnTranslations.push({ keyPath, textToTranslate: defaultVal });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    console.log(`✅ Zlokalizowano ${extractedCount} kluczy 't()' przez parser składni AST.`);
    console.log(`🌍 Oczekujących na doładowanie przez API [EN]: ${missingEnTranslations.length}`);
    
    if (missingEnTranslations.length > 0) {
        // Usuńmy duplikaty z listy (ten sam klucz z różnych plików)
        const uniqueItems = Array.from(new Map(missingEnTranslations.map(item => [item.keyPath, item])).values());
        
        console.log(`🚀 Start tłumaczenia API... Unikalnych wywołań: ${uniqueItems.length}`);
        let batchCounter = 0;
        
        for (const item of uniqueItems) {
            try {
                batchCounter++;
                const res = await translate(item.textToTranslate, { to: 'en' });
                setNestedValue(enData, item.keyPath, res.text);
                console.log(`[${batchCounter}/${uniqueItems.length}] Przetłumaczono: "${item.textToTranslate}" -> "${res.text}"`);
                
                // Zapisujemy po każdym żeby nie tracić w razie bloku API (często Google banuje po 100 hitach w sekunde)
                fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
                
                // Sleep na opóźnienie przed banem limitu (50ms)
                await new Promise(r => setTimeout(r, 50));
            } catch (e) {
                console.error(`❌ Błąd API Google dla ${item.keyPath}:`, e.message);
                // Nie przerywamy, idziemy dalej
            }
        }
    }
    
    fs.writeFileSync(plPath, JSON.stringify(plData, null, 4));
    console.log("🎉 Tłumaczenia JSON ukończone z sukcesem!");
}

main().catch(console.error);
