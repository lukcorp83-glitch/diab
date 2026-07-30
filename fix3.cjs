const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const brokenIndex = lines.findIndex(l => l.includes(' material3Enabled: false,'));

if (brokenIndex !== -1) {
  // It removed:
  // import { useTranslation } from "react-i18next";
  // import i18n from "./i18n";
  // import { NavButton } from "./components/app/NavButton";
  // 
  // export default function App() {
  //  const { t } = useTranslation();
  //   useAppSubscriptions(user);
  //  const { user, loading, initAuthListener } = useAuthStore();
  //  const { data: pumpStatus = null } = usePumpStatus(user);
  //  const [showSplash, setShowSplash] = useState(true);
  // 
  //  useEffect(() => {
  //  const timer = setTimeout(() => {

  const missingLines = [
    '',
    'import { useTranslation } from "react-i18next";',
    'import i18n from "./i18n";',
    'import { NavButton } from "./components/app/NavButton";',
    '',
    'export default function App() {',
    ' const { t } = useTranslation();',
    ' const { user, loading, initAuthListener } = useAuthStore();',
    ' useAppSubscriptions(user);',
    ' const { data: pumpStatus = null } = usePumpStatus(user);',
    ' const [showSplash, setShowSplash] = useState(true);',
    '',
    ' useEffect(() => {',
    ' const timer = setTimeout(() => {'
  ];

  lines.splice(brokenIndex + 2, 0, ...missingLines);
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log("Restored App.tsx init");
} else {
  console.log("Couldn't find broken index");
}
