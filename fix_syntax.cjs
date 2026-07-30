const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const searchDelete = `      // setFbLogs is handled by Zustand/useAppSubscriptions
    };
 dbService.deleteLog(id).catch(console.error);
 };`;

const replaceDelete = `      // setFbLogs is handled by Zustand/useAppSubscriptions
    };
  const handleLogDelete = (e: any) => {
    const { id } = e.detail;
    setCachedLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
    setNsLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
    setDeletedNsIds((prev) => new Set(prev).add(id));
    dbService.deleteLog(id).catch(console.error);
  };`;

content = content.replace(searchDelete, replaceDelete);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed handleLogDelete syntax error.");
