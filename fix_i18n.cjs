const fs = require('fs');
const files = [
  'src/components/AGPReport.tsx',
  'src/components/CarbsBalanceWidget.tsx',
  'src/components/ChartFullView.tsx',
  'src/components/DailyTirWidget.tsx',
  'src/components/GlikoMemory.tsx',
  'src/components/GlikoSkyHigher.tsx',
  'src/components/GlikoWidget.tsx',
  'src/components/GlucoseChart.tsx',
  'src/components/HealthWidget.tsx',
  'src/components/InsulinDetectiveAlert.tsx',
  'src/components/LowGlucoseMealAlert.tsx',
  'src/components/MedicationsWidget.tsx',
  'src/components/NotebookManager.tsx',
  'src/components/PrivacyPopup.tsx',
  'src/components/RemoteAlertsListener.tsx',
  'src/components/UnlinkedCarbsWidget.tsx',
  'src/components/UpdateNotifier.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import i18n from')) {
     const relativePath = file.split('/').length > 2 ? '../i18n' : './i18n';
     // Insert after the last import
     const lines = content.split('\n');
     const lastImportIndex = lines.reduce((acc, line, idx) => line.startsWith('import ') ? idx : acc, -1);
     if (lastImportIndex !== -1) {
       lines.splice(lastImportIndex + 1, 0, `import i18n from "${relativePath}";`);
       fs.writeFileSync(file, lines.join('\n'));
       console.log(`Fixed ${file}`);
     }
  }
}
