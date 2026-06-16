const fs = require('fs');

const path = "src/components/Profile.tsx";
let content = fs.readFileSync(path, 'utf8');

const target = fs.readFileSync("temp_logic.txt", 'utf8');

const replacement = `                    onClick={async () => {
                      const now = Date.now();
                      const currentInv = settings.inventory || [];
                      const setIndex = currentInv.findIndex(i => i.category === "infusion_sets" && i.quantity > 0);
                      const alsoReplaceReservoir = window.confirm(i18n.t('auto.czy_wymieniasz_rowniez_zbiornicze', { defaultValue: "Czy wymieniasz również zbiorniczek na insulinę?" }));
                      let updatedInv = [...currentInv];
                      if (setIndex !== -1) {
                        updatedInv[setIndex] = { ...updatedInv[setIndex], quantity: Math.max(0, updatedInv[setIndex].quantity - 1) };
                      }
                      const updates = { infusionSetChangeDate: now, infusionSetSite: insertionSite } as any;
                      
                      if (alsoReplaceReservoir) {
                        const resIndex = currentInv.findIndex(i => i.category === "reservoirs" && i.quantity > 0);
                        if (resIndex !== -1) {
                          updatedInv[resIndex] = { ...updatedInv[resIndex], quantity: Math.max(0, updatedInv[resIndex].quantity - 1) };
                        }
                        updates.reservoirChangeDate = now;
                      }
                      
                      updates.inventory = updatedInv;
                      
                      setSettings((prev) => ({ ...prev, ...updates }));
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          updates,
                          { merge: true },
                        );
                        await addDoc(
                          collection(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "logs",
                          ),
                          {
                            type: "site_change",
                            value: 1,
                            timestamp: now,
                            createdAt: serverTimestamp(),
                            notes: i18n.t('auto.wymiana_wklucia_var0', { defaultValue: "Wymiana wkłucia - {{var0}}", var0: insertionSite }),
                            source: "system",
                          },
                        );
                        if (alsoReplaceReservoir) {
                          await addDoc(
                            collection(
                              db,
                              "artifacts",
                              "diacontrolapp",
                              "users",
                              getEffectiveUid(user),
                              "logs",
                            ),
                            {
                              type: "site_change",
                              value: 1,
                              timestamp: now,
                              createdAt: serverTimestamp(),
                              notes: i18n.t('auto.wymiana_zbiorniczka', { defaultValue: "Wymiana zbiorniczka" }),
                              source: "system",
                            },
                          );
                        }
                      }
                      toast.success(
                        \`Zapisano wymianę wkłucia (\${insertionSite})\${alsoReplaceReservoir ? ' i zbiorniczka' : ''}!\`,
                      );
                    }}
`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced");
} else {
    console.log("Target not found. Length of target: " + target.length);
}
