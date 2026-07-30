const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

// We want to replace lines from 278 to 280
// Currently:
// 277:       // setFbLogs is handled by Zustand/useAppSubscriptions
// 278:     };
// 279:  dbService.deleteLog(id).catch(console.error);
// 280:  };
// 281:  const handleLogAdd = (e: any) => {

let targetLine = -1;
for (let i = 260; i < 300; i++) {
  if (lines[i] && lines[i].includes('dbService.deleteLog(id).catch(console.error);')) {
    targetLine = i;
    break;
  }
}

if (targetLine !== -1) {
  // The preceding line should be `    };`
  // And the line itself is ` dbService.deleteLog(id).catch(console.error);`
  // And next is ` };`
  
  lines[targetLine - 1] = '    };';
  lines[targetLine] = `    const handleLogDelete = (e: any) => {
      const { id } = e.detail;
      setCachedLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
      setNsLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
      setDeletedNsIds((prev) => new Set(prev).add(id));
      dbService.deleteLog(id).catch(console.error);
    };`;
  lines[targetLine + 1] = ''; // remove ` };`
  
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log("Fixed handleLogDelete!");
} else {
  console.log("Could not find dbService.deleteLog");
}
