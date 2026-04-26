import React, { useState } from 'react';
import { Upload, Database } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';

export default function CgmImport({ user, onComplete }: { user: any, onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string;
        const newLogs = await parseCgmCsv(csv);
        
        if (newLogs.length === 0) {
          setResult('Nie znaleziono danych w pliku (lub zły format). Obsługiwane pliki: Dexcom Clarity / Freestyle Libre / CareLink CSV.');
          setLoading(false);
          return;
        }

        const batchSize = 400; // Firestore limit is 500
        for (let i = 0; i < newLogs.length; i += batchSize) {
            const chunk = newLogs.slice(i, i + batchSize);
            const batch = writeBatch(db);
            
            for (const log of chunk) {
                // Ensure unique ID
                const ms = log.timestamp;
                const firestoreId = `cgm_import_${log.type}_${ms}`;
                const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'logs', firestoreId);
                batch.set(docRef, {
                    ...log,
                    source: 'csv',
                    createdAt: serverTimestamp()
                }, { merge: true });
            }
            await batch.commit();
        }

        setResult(`Pomyślnie zaimportowano ${newLogs.length} wpisów.`);
        if (onComplete) onComplete();
      } catch (error: any) {
        setResult(`Błąd: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Very basic parser for Libre / Dexcom / CareLink
  const parseCgmCsv = async (csvText: string) => {
    const lines = csvText.split('\n');
    const logs: any[] = [];
    
    // Auto-detect format by checking first 5 lines (header)
    const isDexcom = csvText.includes('Dexcom') || csvText.includes('Wartość glukozy') || csvText.includes('Glucose Value') || csvText.includes('Glukoze');
    const isLibre = csvText.includes('Freestyle') || csvText.includes('Oznaczenie glukozy') || csvText.includes('Skalibrowane') || csvText.includes('Historic Glucose') || csvText.includes('Record Type');
    const isCarelink = csvText.includes('CareLink') || csvText.includes('Wartość SG') || csvText.includes('Sensor Glucose');

    let clBgIdx = -1;
    let clDateIdx = -1;
    let clTimeIdx = -1;
    let clTimestampIdx = -1;
    let clInsIdx = -1;
    let clCarbIdx = -1;

    let dxTimestampIdx = -1, dxBgIdx = -1, dxInsIdx = -1, dxCarbIdx = -1;
    let lbTimestampIdx = -1, lbTypeIdx = -1, lbBgIdx = -1, lbInsIdx = -1, lbCarbIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Auto-detect separator for this line
        const separator = line.includes(';') ? ';' : ',';
        const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        const colsOriginal = line.split(regex);
        const cols = colsOriginal.map(c => c.replace(/^"|"$/g, '').trim());
        
        const parseTimestamp = (tsStr: string) => {
            if (!tsStr) return NaN;
            let parsedStr = tsStr.replace('T', ' ').trim();
            
            // If it starts with YYYY
            if (parsedStr.match(/^\d{4}/)) {
                parsedStr = parsedStr.replace(/-/g, '/');
                return new Date(parsedStr).getTime();
            }
            
            // Check for DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY format
            const euroMatch = parsedStr.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})(.*)/);
            if (euroMatch) {
                let dd = parseInt(euroMatch[1], 10);
                let mm = parseInt(euroMatch[2], 10);
                // Fallback if MM and DD are swapped (e.g. US format)
                if (mm > 12 && dd <= 12) {
                    const temp = dd;
                    dd = mm;
                    mm = temp;
                }
                const formatted = `${euroMatch[3]}/${mm.toString().padStart(2, '0')}/${dd.toString().padStart(2, '0')}${euroMatch[4] || ''}`;
                return new Date(formatted).getTime();
            }
            
            return new Date(parsedStr.replace(/-/g, '/')).getTime();
        };

        if (isCarelink) {
            // Find headers
            if (clBgIdx === -1) {
                const bgMatches = cols.findIndex(c => c.includes('Sensor Glucose (mg/dL)') || c.includes('Wartość SG (mg/dL)') || c === 'SG' || c.includes('Sensor Glucose'));
                if (bgMatches > -1) {
                    clBgIdx = bgMatches;
                    clTimestampIdx = cols.findIndex(c => c.toLowerCase().includes('timestamp') || c.toLowerCase().includes('znacznik czasu') || c.toLowerCase().includes('data / czas'));
                    if (clTimestampIdx === -1) {
                        clDateIdx = cols.findIndex(c => c.toLowerCase() === 'date' || c.toLowerCase() === 'data');
                        clTimeIdx = cols.findIndex(c => c.toLowerCase() === 'time' || c.toLowerCase() === 'czas');
                    }
                    clInsIdx = cols.findIndex(c => c.toLowerCase().includes('bolus volume delivered') || c.toLowerCase().includes('podana objętość bolusa'));
                    clCarbIdx = cols.findIndex(c => c.toLowerCase().includes('carb input') || c.toLowerCase().includes('węglowodany w kalkulatorze'));
                }
                continue;
            }
            
            // Parse data row
            let tsStr = '';
            if (clTimestampIdx > -1) tsStr = cols[clTimestampIdx];
            else if (clDateIdx > -1 && clTimeIdx > -1) tsStr = `${cols[clDateIdx]} ${cols[clTimeIdx]}`;
            
            if (tsStr) {
                const ts = parseTimestamp(tsStr);
                if (!isNaN(ts)) {
                    // Glucose
                    if (clBgIdx > -1 && cols[clBgIdx] && /^\d+$/.test(cols[clBgIdx])) {
                        logs.push({ type: 'glucose', value: parseInt(cols[clBgIdx], 10), timestamp: ts, notes: 'CareLink Import' });
                    }
                    // Insulin
                    if (clInsIdx > -1 && cols[clInsIdx]) {
                        const insVal = parseFloat(cols[clInsIdx].replace(',', '.'));
                        if (!isNaN(insVal) && insVal > 0) logs.push({ type: 'bolus', value: insVal, timestamp: ts, notes: 'CareLink Import' });
                    }
                    // Carbs
                    if (clCarbIdx > -1 && cols[clCarbIdx]) {
                        const carbVal = parseFloat(cols[clCarbIdx].replace(',', '.'));
                        if (!isNaN(carbVal) && carbVal > 0) logs.push({ type: 'meal', value: carbVal, timestamp: ts, notes: 'CareLink Import' });
                    }
                }
            }
        } else if (isLibre) {
            // Find headers
            if (lbTypeIdx === -1) {
                const tIdx = cols.findIndex(c => c === 'Record Type' || c === 'Typ rekordu');
                if (tIdx > -1) {
                    lbTypeIdx = tIdx;
                    lbTimestampIdx = cols.findIndex(c => c.toLowerCase().includes('time') || c.toLowerCase().includes('czas'));
                    lbBgIdx = cols.findIndex(c => c.includes('Historic Glucose') || c.includes('Oznaczenie glukozy') || c.includes('Skalibrowane'));
                    lbInsIdx = cols.findIndex(c => c.toLowerCase().includes('insulin') || c.toLowerCase().includes('insulina'));
                    lbCarbIdx = cols.findIndex(c => c.toLowerCase().includes('carb') || c.toLowerCase().includes('węglowodany'));
                }
                continue;
            }

            if (lbTypeIdx > -1 && cols[lbTimestampIdx]) {
                const recType = cols[lbTypeIdx];
                const tsStr = cols[lbTimestampIdx];
                const ts = parseTimestamp(tsStr);
                
                if (!isNaN(ts)) {
                    if ((recType === '0' || recType === '1' || recType === '2') && lbBgIdx > -1 && cols[lbBgIdx]) {
                        const bgVal = parseFloat(cols[lbBgIdx].replace(',', '.'));
                        if (!isNaN(bgVal)) {
                            logs.push({ type: 'glucose', value: bgVal > 800 ? Math.round(bgVal/18) : bgVal, timestamp: ts, notes: 'Libre Import' });
                        }
                    }
                    if (recType === '4' && lbInsIdx > -1 && cols[lbInsIdx]) { // Insulin
                        const insVal = parseFloat(cols[lbInsIdx].replace(',', '.'));
                        if (!isNaN(insVal) && insVal > 0) {
                            logs.push({ type: 'bolus', value: insVal, timestamp: ts, notes: 'Libre Import (Rekord)' });
                        }
                    }
                    if (recType === '5' && lbCarbIdx > -1 && cols[lbCarbIdx]) { // Food
                        const carbVal = parseFloat(cols[lbCarbIdx].replace(',', '.'));
                        if (!isNaN(carbVal) && carbVal > 0) {
                            logs.push({ type: 'meal', value: carbVal, timestamp: ts, notes: 'Libre Import (Rekord)' });
                        }
                    }
                    // Extract if fields are populated directly even ignoring record type
                    if (lbInsIdx > -1 && cols[lbInsIdx] && recType !== '4') {
                        const insVal = parseFloat(cols[lbInsIdx].replace(',', '.'));
                        if (!isNaN(insVal) && insVal > 0) logs.push({ type: 'bolus', value: insVal, timestamp: ts, notes: 'Libre Import' });
                    }
                    if (lbCarbIdx > -1 && cols[lbCarbIdx] && recType !== '5') {
                        const carbVal = parseFloat(cols[lbCarbIdx].replace(',', '.'));
                        if (!isNaN(carbVal) && carbVal > 0) logs.push({ type: 'meal', value: carbVal, timestamp: ts, notes: 'Libre Import' });
                    }
                }
            }
        } else if (isDexcom) {
            // Find headers
            if (dxTimestampIdx === -1) {
                const tsIdx = cols.findIndex(c => c === 'Timestamp' || c === 'Czas' || c === 'Znacznik czasu');
                const bgIdx = cols.findIndex(c => c.includes('Glucose Value') || c.includes('Wartość glukozy'));
                if (tsIdx > -1 && bgIdx > -1) {
                    dxTimestampIdx = tsIdx;
                    dxBgIdx = bgIdx;
                    dxInsIdx = cols.findIndex(c => c.includes('Insulin (units)') || c.includes('Insulina'));
                    dxCarbIdx = cols.findIndex(c => c.includes('Carbohydrates (grams)') || c.includes('Węglowodany'));
                }
                continue;
            }

            if (dxTimestampIdx > -1 && cols[dxTimestampIdx]) {
                const ts = parseTimestamp(cols[dxTimestampIdx]);
                if (!isNaN(ts)) {
                    if (dxBgIdx > -1 && cols[dxBgIdx]) {
                        const bgVal = parseInt(cols[dxBgIdx], 10);
                        if (!isNaN(bgVal)) logs.push({ type: 'glucose', value: bgVal, timestamp: ts, notes: 'Dexcom Import' });
                    }
                    if (dxInsIdx > -1 && cols[dxInsIdx]) {
                        const insVal = parseFloat(cols[dxInsIdx].replace(',', '.'));
                        if (!isNaN(insVal) && insVal > 0) logs.push({ type: 'bolus', value: insVal, timestamp: ts, notes: 'Dexcom Import' });
                    }
                    if (dxCarbIdx > -1 && cols[dxCarbIdx]) {
                        const carbVal = parseFloat(cols[dxCarbIdx].replace(',', '.'));
                        if (!isNaN(carbVal) && carbVal > 0) logs.push({ type: 'meal', value: carbVal, timestamp: ts, notes: 'Dexcom Import' });
                    }
                }
            }
        }
    }
    
    // Sort and limit just in case
    logs.sort((a,b) => b.timestamp - a.timestamp);
    // Limit to latest 15000 to prevent db overloads on massive history dumps,
    // roughly enough for 1-2 months of CGM + bolus/carbs data.
    return logs.slice(0, 15000);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Database className="text-emerald-500" size={20} />
        <div>
          <span className="text-xs font-bold dark:text-white">Import danych CGM (Plik CSV)</span>
          <p className="text-[9px] text-slate-500 mt-1 leading-tight">Z Dexcom Clarity / LibreView / CareLink</p>
        </div>
      </div>
      
      <div className="relative">
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
           {loading ? <span className="animate-spin text-emerald-500">⏳</span> : <Upload className="text-emerald-500" size={16} />}
           <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Wybierz plik CSV...</span>
        </div>
      </div>

      {result && (
        <p className={`text-[10px] font-bold p-2 text-center rounded-lg ${result.includes('Błąd') || result.includes('Nie znaleziono') ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
