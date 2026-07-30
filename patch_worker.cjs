const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{\s*if \(user && userSettings\?\.notificationsEnabled\) \{\s*notificationService\.registerToken\(\);\s*\}\s*\}, \[user, userSettings\?\.notificationsEnabled\]\);\s*(setDoc\(pumpRef,)/;

const fixedPart = `useEffect(() => {
    if (user && userSettings?.notificationsEnabled) {
      notificationService.registerToken();
    }
  }, [user, userSettings?.notificationsEnabled]);

  useEffect(() => {
    if (!user || !nsUrl) return;

    const worker = new Worker(new URL('./workers/nightscoutWorker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'SYNC_SUCCESS') {
        const { entries, treatments, devicestatus } = payload;
        
        // 1. Zapis statusu pompy
        if (devicestatus && devicestatus.pump) {
          const pumpRef = doc(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            getEffectiveUid(user),
            "status",
            "pump",
          );
        $1`;

if (regex.test(content)) {
  content = content.replace(regex, fixedPart);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched via regex successfully!");
} else {
  console.log("Regex still failed.");
}
