const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /case \x22quick_bolus\x22:\s*\{[\s\S]*?(?=case \x22history_measurements\x22:)/;
const replacement = `case "quick_bolus": {
        // Ukryj widget bolusa dla pacjentów tylko na diecie/tabletkach
        if (!isInsulinMode) {
          return (
            <div className="glass-card w-full h-full flex flex-col items-center justify-center gap-2 min-h-[120px] opacity-60 cursor-default select-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">{t('auto.tryb_diety', { defaultValue: 'Tryb diety' })}</span>
            </div>
          );
        }

        return (
          <QuickBolusWidget
            isEditingLayout={isEditingLayout}
            setTab={setTab}
          />
        );
      }

      `;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced quick_bolus block!');
} else {
  console.log('Could not find quick_bolus block!');
}
