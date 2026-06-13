import { Project, SyntaxKind, Node } from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
    skipAddingFilesFromTsConfig: true
});

const files = glob.sync("src/**/*.tsx");
project.addSourceFilesAtPaths(files);

const polishRegex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

function createKey(text) {
    let base = text.toLowerCase()
        .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
        .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (base.length > 30) base = base.substring(0, 30).replace(/_+$/, '');
    if (!base) base = "text_" + Math.random().toString(36).substring(7);
    return base;
}

const translations = {};
const outputJsonPath = "./src/locales/pl/translation.json";
if (fs.existsSync(outputJsonPath)) {
    Object.assign(translations, JSON.parse(fs.readFileSync(outputJsonPath, "utf8")));
} else {
    fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
}

let modifiedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
    let replacements = [];

    sourceFile.forEachDescendant((node) => {
        const parentCall = node.getFirstAncestorByKind(SyntaxKind.CallExpression);
        if (parentCall) {
            const exp = parentCall.getExpression().getText();
            if (exp === "t" || exp === "i18n.t") return;
        }

        if (Node.isStringLiteral(node) && node.getParentIfKind(SyntaxKind.PropertyAssignment)) {
            const text = node.getLiteralValue();
            if (polishRegex.test(text)) {
                const prop = node.getParentIfKind(SyntaxKind.PropertyAssignment);
                const propName = prop.getName();
                if (["label", "name", "desc", "sub", "title", "content", "question", "answer", "tooltip"].includes(propName)) {
                    const key = `auto.${createKey(text)}`;
                    translations[key] = text;
                    replacements.push({ node, text: `i18n.t('${key}', { defaultValue: ${JSON.stringify(text)} })` });
                }
            }
        }

        if (Node.isJsxText(node)) {
            const text = node.getLiteralText();
            if (polishRegex.test(text) && text.trim().length > 0) {
                const trimmed = text.trim();
                const key = `auto.${createKey(trimmed)}`;
                translations[key] = trimmed;
                replacements.push({ node, text: `{i18n.t('${key}', { defaultValue: ${JSON.stringify(trimmed)} })}` });
            }
        }

        if (Node.isStringLiteral(node) && node.getParentIfKind(SyntaxKind.CallExpression)) {
            const callExp = node.getParentIfKind(SyntaxKind.CallExpression);
            const funcText = callExp.getExpression().getText();
            if (funcText.startsWith("toast") || funcText === "alert" || funcText === "console.log" || funcText === "console.error") {
                const text = node.getLiteralValue();
                if (polishRegex.test(text)) {
                    const key = `auto.${createKey(text)}`;
                    translations[key] = text;
                    replacements.push({ node, text: `i18n.t('${key}', { defaultValue: ${JSON.stringify(text)} })` });
                }
            }
        }

        if (Node.isStringLiteral(node) && node.getParentIfKind(SyntaxKind.JsxAttribute)) {
            const text = node.getLiteralValue();
            if (polishRegex.test(text)) {
                const key = `auto.${createKey(text)}`;
                translations[key] = text;
                replacements.push({ node, text: `{i18n.t('${key}', { defaultValue: ${JSON.stringify(text)} })}` });
            }
        }

        if (Node.isNoSubstitutionTemplateLiteral(node)) {
            const text = node.getLiteralValue();
            if (polishRegex.test(text) && !node.getFirstAncestorByKind(SyntaxKind.JsxExpression)) {
                 const key = `auto.${createKey(text)}`;
                 translations[key] = text;
                 replacements.push({ node, text: `i18n.t('${key}', { defaultValue: ${JSON.stringify(text)} })` });
            }
        }
    });

    if (replacements.length > 0) {
        replacements.sort((a, b) => b.node.getPos() - a.node.getPos());
        for (const rep of replacements) {
            rep.node.replaceWithText(rep.text);
        }

        const hasI18nImport = sourceFile.getImportDeclarations().some(imp => imp.getDefaultImport()?.getText() === "i18n");
        if (!hasI18nImport) {
            const isApp = sourceFile.getFilePath().endsWith("App.tsx");
            sourceFile.addImportDeclaration({
                defaultImport: "i18n",
                moduleSpecifier: isApp ? "./i18n" : "../i18n",
            });
        }
        
        sourceFile.saveSync();
        modifiedCount++;
        console.log(`Updated ${sourceFile.getFilePath()}`);
    }
}

fs.writeFileSync(outputJsonPath, JSON.stringify(translations, null, 2), "utf8");
console.log(`Extracted ${Object.keys(translations).length} Polish phrases to ${outputJsonPath}. Modified ${modifiedCount} files.`);
