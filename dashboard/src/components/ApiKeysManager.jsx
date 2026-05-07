import React, { useState } from 'react';
import { Plus, Copy, Trash2, ShieldAlert, Eye, EyeOff, CheckCircle2, Globe, Key } from "lucide-react";
import { Button } from "./ui/Button";
import { Alert, AlertDescription, AlertTitle } from "./ui/Alert";
import { cn } from "../utils/cn";

const ApiKeysManager = () => {
  const [keys, setKeys] = useState([
    { id: '1', name: 'تطبيق الهاتف - الربط الأساسي', key: 'dw_key_a7x9...2m', lastUsed: 'منذ ساعتين', rateLimit: '1,000 طلب/دقيقة', status: 'نشط' },
    { id: '2', name: 'لوحة تحكم التحليلات', key: 'dw_key_p9k2...8q', lastUsed: 'الآن', rateLimit: '5,000 طلب/دقيقة', status: 'نشط' },
  ]);

  const [newKeySecret, setNewKeySecret] = useState(null);

  const handleCreateKey = () => {
    setNewKeySecret("dw_secret_8j3k9m2p1v6c4x7z5q9r2t4y8u0i1o3p");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">مفاتيح الوصول (API Keys)</h2>
          <p className="text-slate-400 font-medium text-sm">إدارة مفاتيح الوصول لربط تطبيقاتك الخارجية بنظام ديوان.</p>
        </div>
        <Button onClick={handleCreateKey} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-8 py-6 h-auto font-black shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
          <Plus className="w-5 h-5 ml-2" /> إنشاء مفتاح جديد
        </Button>
      </div>

      {newKeySecret && (
        <Alert className="bg-amber-500/10 border-amber-500/30 rounded-[2.5rem] p-8 border-dashed animate-in zoom-in-95 duration-500">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-amber-500/20 rounded-2xl">
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            </div>
            <div className="flex-1">
              <AlertTitle className="text-amber-500 font-black text-xl mb-3">تحذير أمني هام!</AlertTitle>
              <AlertDescription className="text-slate-300 text-lg leading-relaxed">
                هذه هي المرة الوحيدة التي سيظهر فيها مفتاحك السري. قم بنسخه الآن واحفظه في مكان آمن.
                <div className="mt-6 flex flex-col md:flex-row items-center gap-4 bg-black/40 p-5 rounded-[2rem] border border-amber-500/20">
                  <code className="text-amber-200 break-all font-mono text-sm flex-1 text-center md:text-right px-4">{newKeySecret}</code>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="rounded-xl hover:bg-amber-500/20 text-amber-500" onClick={() => navigator.clipboard.writeText(newKeySecret)}>
                      <Copy className="h-5 w-5 ml-2" /> نسخ المفتاح
                    </Button>
                  </div>
                </div>
                <Button onClick={() => setNewKeySecret(null)} className="mt-6 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl px-10">
                  لقد قمت بحفظ المفتاح بأمان
                </Button>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <div className="grid gap-6">
        {keys.map((apiKey) => (
          <div key={apiKey.id} className="bg-white/5 border border-white/5 rounded-[3rem] p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 hover:bg-white/10 hover:border-emerald-500/20 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
            
            <div className="flex gap-6 relative z-10 w-full lg:w-auto">
              <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-500">
                <Key className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white mb-2">{apiKey.name}</h3>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-mono bg-black/40 px-4 py-1.5 rounded-full border border-white/5 text-emerald-400/70">{apiKey.key}</span>
                  <span className="flex items-center gap-2 text-slate-500 font-bold bg-white/5 px-4 py-1.5 rounded-full">
                    <Globe className="w-4 h-4" />
                    آخر استخدام: {apiKey.lastUsed}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between w-full lg:w-auto gap-12 relative z-10 border-t lg:border-t-0 border-white/5 pt-6 lg:pt-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">الحصة المتاحة</div>
                <div className="text-white font-black text-lg">{apiKey.rateLimit}</div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="ghost" className="rounded-2xl h-14 px-6 hover:bg-rose-500/10 hover:text-rose-500 font-bold border border-transparent hover:border-rose-500/20">
                  <Trash2 className="w-4 h-4 ml-2" /> إبطال المفتاح
                </Button>
                <Button variant="outline" className="rounded-2xl h-14 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold">
                  تعديل الصلاحيات
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiKeysManager;
