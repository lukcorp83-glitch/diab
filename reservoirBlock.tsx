            <div
              className={cn(
                "group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden",
                settings.glassmorphismEnabled
                  ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
                  <Droplets size={22} />
                </div>
                <div>
                  <h4 className="text-base font-black dark:text-white uppercase tracking-tight">
                    {t('auto.zbiorniczek_na_insuline', { defaultValue: 'Zbiorniczek na insulinę' })}
                  </h4>
                  <p className="text-[10px] font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-[0.2em] mt-1">
                    {t('auto.pojemnik_z_insulina', { defaultValue: 'Pojemnik z insuliną' })}
                  </p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div
                  className={cn(
                    "p-4 rounded-2xl border",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
                  )}
                >
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
                    {t('auto.zywotnosc_zbiorniczka_dni', { defaultValue: 'Żywotność Zbiorniczka (dni)' })}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={settings.reservoirDurationDays === 0 ? "" : (settings.reservoirDurationDays || "")}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        if (rawVal === "") {
                          setSettings({
                            ...settings,
                            reservoirDurationDays: 0,
                          });
                        } else {
                          const val = Number(rawVal);
                          setSettings({
                            ...settings,
                            reservoirDurationDays: isNaN(val) ? 0 : val,
                          });
                        }
                      }}
                      onBlur={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val) || val < 1) val = 3;
                        if (val > 7) val = 7;
                        setSettings({
                          ...settings,
                          reservoirDurationDays: val,
                        });
                      }}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all"
                    />
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">
                      {t('auto.dni', { defaultValue: 'DNI' })}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-4 rounded-2xl border",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
                  )}
                >
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
                    {t('auto.data_i_godzina_zalozenia_zbiorniczka', { defaultValue: 'Data i godzina założenia' })}
                  </label>
                  <div className="relative">
                    <Calendar
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
                    />
                    <input
                      type="datetime-local"
                      value={
                        settings.reservoirChangeDate
                          ? new Date(
                              settings.reservoirChangeDate -
                                new Date().getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) => {
                        const d = new Date(e.target.value).getTime();
                        if (!isNaN(d))
                          setSettings({
                            ...settings,
                            reservoirChangeDate: d,
                          });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-10 pr-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={async () => {
                      const now = Date.now();
                      const currentInv = settings.inventory || [];
                      const setIndex = currentInv.findIndex(i => i.category === "reservoirs" && i.quantity > 0);
                      let updatedInv = currentInv;
                      if (setIndex !== -1) {
                        updatedInv = [...currentInv];
                        updatedInv[setIndex] = { ...updatedInv[setIndex], quantity: Math.max(0, updatedInv[setIndex].quantity - 1) };
                      }
                      const updates = { reservoirChangeDate: now, inventory: updatedInv };
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
                            type: "site_change", // We reuse site_change, but perhaps add notes
                            value: 1,
                            timestamp: now,
                            createdAt: serverTimestamp(),
                            notes: i18n.t('auto.wymiana_zbiorniczka', { defaultValue: "Wymiana zbiorniczka" }),
                            source: "system",
                          },
                        );
                      }
                      toast.success(
                        i18n.t('auto.zapisano_wymiane_zbiorniczka', { defaultValue: "Zapisano wymianę zbiorniczka!" })
                      );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 group/btn"
                  >
                    <Sparkles
                      size={12}
                      className="group-hover:animate-spin transition-all"
                    />
                    {t('auto.wymiana_teraz', { defaultValue: 'Wymiana teraz' })}
                  </button>

                  <button
                    onClick={async () => {
                      let days = settings.reservoirDurationDays;
                      if (!days || days < 1) days = 3;
                      if (days > 7) days = 7;

                      const updates = {
                        reservoirChangeDate: settings.reservoirChangeDate || Date.now(),
                        reservoirDurationDays: days
                      };
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
                      }
                      toast.success(i18n.t('auto.zaktualizowano_date_dni_zbiorniczka', { defaultValue: "Zaktualizowano datę/dni zbiorniczka!" }));
                    }}
                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all border border-slate-300/50 dark:border-slate-700/50 flex items-center justify-center gap-1.5"
                  >
                    <Save size={12} />
                    {t('auto.aktualizuj_dane', { defaultValue: 'Aktualizuj dane' })}
                  </button>
                </div>
              </div>
            </div>
