import sys

with open("src/components/Profile.tsx", "r", encoding="utf-8") as f:
    content = f.read()
    
with open("temp_logic.txt", "r", encoding="utf-8") as f:
    target = f.read()

# Make the replacement string based on target but modified
lines = target.split('\n')
new_lines = []
for line in lines:
    if "let updatedInv = currentInv;" in line:
        new_lines.append(line.replace("let updatedInv = currentInv;", "const alsoReplaceReservoir = window.confirm(i18n.t('auto.czy_wymieniasz_rowniez_zbiornicze', { defaultValue: \"Czy wymieniasz również zbiorniczek na insulinę?\" }));\n                      let updatedInv = [...currentInv];"))
    elif "const updates = { infusionSetChangeDate: now, infusionSetSite: insertionSite, inventory: updatedInv };" in line:
        new_lines.append("                      const updates: any = { infusionSetChangeDate: now, infusionSetSite: insertionSite };\n                      if (alsoReplaceReservoir) {\n                        const resIndex = currentInv.findIndex(i => i.category === \"reservoirs\" && i.quantity > 0);\n                        if (resIndex !== -1) {\n                          updatedInv[resIndex] = { ...updatedInv[resIndex], quantity: Math.max(0, updatedInv[resIndex].quantity - 1) };\n                        }\n                        updates.reservoirChangeDate = now;\n                      }\n                      updates.inventory = updatedInv;")
    elif "toast.success(" in line:
        new_lines.append("                      toast.success(")
        new_lines.append("                        `Zapisano wymianę wkłucia (${insertionSite})${alsoReplaceReservoir ? ' i zbiorniczka' : ''}!`")
        new_lines.append("                      );")
    elif "`Zapisano wymianę wkłucia (${insertionSite})!`" in line:
        pass # we handled it above
    elif "                      );" in line and "toast" not in line and "Zapisano" not in line: # Be careful not to skip right
        # just keep the original line if it's the `});` or something
        if "`Zapisano wymianę wkłucia" not in line:
            new_lines.append(line)
    elif "source: \"system\"," in line:
        new_lines.append(line)
        # after closing the log add logic
        new_lines.append("                          },\n                        );")
        new_lines.append("                        if (alsoReplaceReservoir) {\n                          await addDoc(\n                            collection(\n                              db,\n                              \"artifacts\",\n                              \"diacontrolapp\",\n                              \"users\",\n                              getEffectiveUid(user),\n                              \"logs\",\n                            ),\n                            {\n                              type: \"site_change\",\n                              value: 1,\n                              timestamp: now,\n                              createdAt: serverTimestamp(),\n                              notes: i18n.t('auto.wymiana_zbiorniczka', { defaultValue: \"Wymiana zbiorniczka\" }),\n                              source: \"system\",\n                            },\n                          );\n                        }")
    elif "                          }," in line and "source: \"system\"" not in line and "addDoc" in new_lines[-1]: # it's the closing of addDoc
        pass # we handled it above
    elif "                        );" in line and "source: \"system\"" not in new_lines[-1] and "addDoc" in new_lines[-2]:
        pass # handled
    else:
        # Check if line is empty but we just added a block, ignore
        if "`Zapisano" in line or "toast" in line:
            pass # skipping because handled
        else:
            new_lines.append(line)

replacement = """                    onClick={async () => {
                      const now = Date.now();
                      const currentInv = settings.inventory || [];
                      const setIndex = currentInv.findIndex(i => i.category === "infusion_sets" && i.quantity > 0);
                      const alsoReplaceReservoir = window.confirm(i18n.t('auto.czy_wymieniasz_rowniez_zbiornicze', { defaultValue: "Czy wymieniasz również zbiorniczek na insulinę?" }));
                      let updatedInv = [...currentInv];
                      if (setIndex !== -1) {
                        updatedInv[setIndex] = { ...updatedInv[setIndex], quantity: Math.max(0, updatedInv[setIndex].quantity - 1) };
                      }
                      const updates: any = { infusionSetChangeDate: now, infusionSetSite: insertionSite };
                      
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
                        `Zapisano wymianę wkłucia (${insertionSite})${alsoReplaceReservoir ? ' i zbiorniczka' : ''}!`,
                      );
                    }}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/Profile.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced!")
else:
    print("Target not found.")
