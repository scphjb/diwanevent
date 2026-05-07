import React, { useState } from 'react';
import { Camera, BarChart3, Users, Flame, Thermometer, IceCream, Mic, Save, ArrowRight, TrendingUp } from 'lucide-react';

const ExhibitorLeads = () => {
  const [activeTab, setActiveTab] = useState('scan'); // scan, dashboard
  const [scanResult, setScanResult] = useState(null);

  // محاكاة نتيجة مسح QR
  const handleScanMock = () => {
    setScanResult({
      name: "Ahmed Al-Farsi",
      company: "Oman Tech Solutions",
      matchScore: 94,
      needs: ["Cloud Security", "Enterprise Storage"],
      status: 'warm'
    });
  };

  return (
    <div className="p-4 bg-slate-950 min-h-screen text-slate-200 pb-20">
      {/* Header Stat Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-slate-500 text-[10px] uppercase font-bold">Total Leads</div>
          <div className="text-xl font-black text-white">42</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-slate-500 text-[10px] uppercase font-bold">Hot Today</div>
          <div className="text-xl font-black text-orange-500">12</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-slate-500 text-[10px] uppercase font-bold">Sync Status</div>
          <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             Cloud Ready
          </div>
        </div>
      </div>

      {/* Main Action Area */}
      {activeTab === 'scan' ? (
        <div className="space-y-6">
          {!scanResult ? (
            <div className="relative aspect-square bg-black rounded-[2.5rem] border-2 border-dashed border-slate-700 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent"></div>
              <Camera className="w-16 h-16 text-indigo-400 mb-4 animate-pulse" />
              <p className="text-slate-400 text-sm font-medium">Position QR code within frame</p>
              <button 
                onClick={handleScanMock}
                className="mt-6 bg-white text-black font-bold py-3 px-8 rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                Scan Badge
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] p-6 animate-in slide-in-from-bottom-10 duration-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">{scanResult.name}</h2>
                  <p className="text-indigo-400 font-bold text-sm">{scanResult.company}</p>
                </div>
                <div className="bg-emerald-500/20 text-emerald-500 px-4 py-2 rounded-2xl border border-emerald-500/30">
                  <span className="text-xs font-bold uppercase">Match</span>
                  <div className="text-lg font-black">{scanResult.matchScore}%</div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-slate-500 uppercase">Interested In:</div>
                <div className="flex flex-wrap gap-2">
                  {scanResult.needs.map(need => (
                    <span key={need} className="bg-slate-800 text-slate-300 text-[10px] px-3 py-1.5 rounded-full">{need}</span>
                  ))}
                </div>
              </div>

              {/* Lead Scoring */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-3xl flex flex-col items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-500">HOT</span>
                </button>
                <button className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-3xl flex flex-col items-center gap-2">
                  <Thermometer className="w-6 h-6 text-yellow-500" />
                  <span className="text-[10px] font-bold text-yellow-500">WARM</span>
                </button>
                <button className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-3xl flex flex-col items-center gap-2">
                  <IceCream className="w-6 h-6 text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-500">COLD</span>
                </button>
              </div>

              {/* Voice Notes */}
              <div className="relative mb-6">
                <textarea 
                  className="w-full bg-slate-800 border-none rounded-3xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 h-24"
                  placeholder="Quick notes..."
                ></textarea>
                <button className="absolute bottom-4 right-4 bg-indigo-600 p-2 rounded-xl">
                  <Mic className="w-4 h-4 text-white" />
                </button>
              </div>

              <button className="w-full bg-white text-black font-black py-4 rounded-3xl flex items-center justify-center gap-2 shadow-2xl">
                <Save className="w-5 h-5" />
                Save Potential Deal
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Leads Card */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white overflow-hidden relative">
            <TrendingUp className="absolute top-4 right-4 opacity-20 w-32 h-32" />
            <h3 className="text-xl font-black mb-4">Top Targets Today</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between">
                  <span className="font-bold">Deal Opportunity #{i}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-full p-2 flex justify-between shadow-2xl">
        <button 
          onClick={() => setActiveTab('scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all ${activeTab === 'scan' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500'}`}
        >
          <Camera className="w-5 h-5" />
          Scan
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500'}`}
        >
          <BarChart3 className="w-5 h-5" />
          Analytics
        </button>
      </div>
    </div>
  );
};

export default ExhibitorLeads;
