const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const brokenPart = `  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
  try {
  setCachedLogs((prev) => 
  prev.map(l => l.id === id ? { ...l, ...updates } : l)
  );`;

const fixedPart = `  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
  try {
    const saved = localStorage.getItem("diacontrol_deleted_ns_ids");
    if (saved) return new Set(JSON.parse(saved));
  } catch (e) {}
  return new Set();
  });
  const fbLogs = useLogsStore((state) => state.logs);
  const [nsLogs, setNsLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handleLogUpdate = (e: any) => {
      const { id, updates } = e.detail;
      setCachedLogs((prev) => 
      prev.map(l => l.id === id ? { ...l, ...updates } : l)
      );`;

// Since formatting might differ slightly, let's use a robust replace
const searchStr = `  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
  try {`;
const replaceStart = content.indexOf(searchStr);
if (replaceStart !== -1) {
  // Find where setCachedLogs starts
  const endStr = `setCachedLogs((prev) =>`;
  const replaceEnd = content.indexOf(endStr, replaceStart);
  
  if (replaceEnd !== -1) {
    const toReplace = content.substring(replaceStart, replaceEnd);
    const replacement = `  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("diacontrol_deleted_ns_ids");
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });
  const fbLogs = useLogsStore((state) => state.logs);
  const [nsLogs, setNsLogs] = useState<any[]>([]);

  useEffect(() => {
    const handleLogUpdate = (e: any) => {
      const { id, updates } = e.detail;
      `;
    
    content = content.replace(toReplace, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Restored fbLogs properly.");
  }
} else {
  console.log("Could not find start block");
}
