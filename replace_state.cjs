const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace state declarations with TanStack hook calls
const replacements = [
  {
    from: 'const [aiInsights, setAiInsights] = useState<string[]>([]);',
    to: 'const { data: aiInsights = [] } = useQuery({ queryKey: [\'aiInsights\', user ? getEffectiveUid(user) : \'\'], enabled: !!user, queryFn: () => [] });'
  },
  {
    from: 'const [pumpStatus, setPumpStatus] = useState<any>(null);',
    to: 'const { data: pumpStatus = null } = usePumpStatus(user);'
  },
  {
    from: 'const [petData, setPetData] = useState<any>(null);',
    to: 'const { data: petData = null } = usePetStatus(user);'
  },
  {
    from: 'const [userSettings, setUserSettings] = useState<UserSettings | null>(null);',
    to: 'const { data: userSettings = null } = useUserSettings(user) as any;'
  },
  {
    from: 'const [nsUrl, setNsUrl] = useState<string>("");',
    to: 'const { data: nsSettings } = useNightscoutSettings(user);\n  const nsUrl = nsSettings?.url || "";'
  },
  {
    from: 'const [nsSecret, setNsSecret] = useState<string>("");',
    to: 'const nsSecret = nsSettings?.secret || "";'
  }
];

let newContent = content;
for (const rep of replacements) {
  if (newContent.includes(rep.from)) {
    newContent = newContent.replace(rep.from, rep.to);
  } else {
    console.log("Could not find:", rep.from);
  }
}

// Add imports for these hooks
const importStr = 'import { useQuery } from "@tanstack/react-query";\nimport { usePetStatus, useNightscoutSettings, useUserSettings, usePumpStatus } from "./hooks/queries/useProfileData";\n';
newContent = newContent.replace('import { useGlikoServer } from "./hooks/useGlikoServer";', importStr + 'import { useGlikoServer } from "./hooks/useGlikoServer";');

fs.writeFileSync('src/App.tsx', newContent);
console.log("State variables replaced.");
