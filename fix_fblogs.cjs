const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const searchStr = `  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
  try {
  setCachedLogs((prev) => 
  prev.map(l => l.id === id ? { ...l, ...updates } : l)
  );`;

const replaceStr = `  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
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
      setCachedLogs((prev) => 
      prev.map(l => l.id === id ? { ...l, ...updates } : l)
      );`;

if (content.indexOf(searchStr) !== -1) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Restored fbLogs and deletedNsIds!");
} else {
  console.log("Could not find the broken string either.");
}
