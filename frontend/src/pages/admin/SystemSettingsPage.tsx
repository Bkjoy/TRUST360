import React, { useEffect, useState } from 'react';
import { Settings, Save, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  is_editable: boolean;
  updated_at: string;
}

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<SystemSetting[]>('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    try {
      await api.put(`/settings/${key}`, { value: editValue });
      setSaveNotice(`Setting '${key}' updated successfully.`);
      setEditingKey(null);
      await fetchSettings();
      setTimeout(() => setSaveNotice(null), 3000);
    } catch (err) {
      alert('Failed to update setting');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Policies</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configurable maturity alert chronometer intervals, discrepancy tolerances, and regulatory rule thresholds.
        </p>
      </div>

      {saveNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-semibold">
          {saveNotice}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {settings.map((s) => (
          <div key={s.id} className="p-5 flex items-start justify-between gap-6 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gov-navy-800">{s.key}</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 font-semibold rounded text-slate-500">
                  {s.category}
                </span>
                {!s.is_editable && (
                  <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded">
                    Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{s.description}</p>
              
              {editingKey === s.key ? (
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded font-mono w-72 focus:outline-none focus:ring-2 focus:ring-gov-navy-600"
                  />
                  <button
                    onClick={() => handleSave(s.key)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingKey(null)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="pt-1 text-xs font-mono font-semibold text-slate-800">
                  Value: <span className="bg-slate-100 px-2 py-0.5 rounded">{s.value}</span>
                </div>
              )}
            </div>

            {s.is_editable && editingKey !== s.key && (
              <button
                onClick={() => {
                  setEditingKey(s.key);
                  setEditValue(s.value);
                }}
                className="px-3 py-1 text-xs font-semibold text-gov-navy-700 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm"
              >
                Modify
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
