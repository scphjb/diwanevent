import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  Bell, 
  ShieldCheck,
  Search
} from 'lucide-react';

const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('diwan_token');
    localStorage.removeItem('diwan_user');
    window.location.href = '/login';
  };

  const menuItems = [
    { name: 'لوحة القيادة الشاملة', icon: LayoutDashboard, path: '/super-admin' },
    { name: 'إدارة المنظمين', icon: Users, path: '/super-admin/organizers' },
    { name: 'باقات الاشتراك', icon: CreditCard, path: '/super-admin/plans' },
    { name: 'إعدادات المنصة', icon: Settings, path: '/super-admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#022C22] text-[#F0F4F2] flex flex-row-reverse font-sans" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-72 bg-[#0A3D2B] border-l border-white/5 flex flex-col z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-[#F0F4F2] leading-none tracking-tight">ديوان</span>
            <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
                  isActive 
                  ? 'bg-[#1A8A6A] text-white shadow-lg shadow-[#1A8A6A]/20' 
                  : 'hover:bg-white/5 text-[#F0F4F2]/60 hover:text-white'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-[#D4AF37]' : 'group-hover:text-[#D4AF37]'} />
                <span className="font-bold text-sm">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-8 mt-8 border-t border-white/5">
            <div className="px-4 mb-4 text-[10px] uppercase tracking-widest text-[#F0F4F2]/30 font-bold">بوابة الفعاليات</div>
            <Link
                to="/dashboard"
                className="flex items-center gap-4 px-4 py-3 rounded-xl text-[#1A8A6A] hover:bg-[#1A8A6A]/10 transition-all font-bold text-sm"
            >
                <LayoutDashboard size={20} />
                <span>إدارة الفعاليات</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 bg-[#0A3D2B]/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 z-10">
          <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-full border border-white/5 w-96">
            <Search size={18} className="text-[#F0F4F2]/30" />
            <input 
              type="text" 
              placeholder="بحث عن منظم، فعالية، أو فاتورة..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#F0F4F2]/20"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <Bell size={22} className="text-[#F0F4F2]/60 hover:text-[#D4AF37] cursor-pointer transition-colors" />
            </div>
            
            <div className="h-10 w-[1px] bg-white/5" />

            <div className="flex items-center gap-4">
              <div className="text-left hidden sm:block">
                <p className="text-xs font-black text-white leading-none mb-1 text-right">أدمن المنصة</p>
                <p className="text-[10px] text-[#D4AF37] font-bold text-right uppercase">Root Access</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A8A6A] to-[#D4AF37] p-[2px]">
                <div className="w-full h-full rounded-full bg-[#0A3D2B] flex items-center justify-center">
                  <ShieldCheck size={20} className="text-[#D4AF37]" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <section className="flex-1 overflow-y-auto p-10 bg-[#022C22] noise-bg">
          <Outlet />
        </section>
      </main>

    </div>
  );
};

export default SuperAdminLayout;
