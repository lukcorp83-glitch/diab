const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Profile/ProfileMedications.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert const queryClient = useQueryClient();
content = content.replace(
    'const { t } = useTranslation();',
    'const { t } = useTranslation();\n  const queryClient = useQueryClient();'
);

// Also fix customDrugDictionary undefined bug in analyzeDrug
content = content.replace(
    '{ customDrugDictionary: updatedDict },',
    '{ customDrugDictionary: JSON.parse(JSON.stringify(updatedDict)) },'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed queryClient error in ProfileMedications.tsx');
