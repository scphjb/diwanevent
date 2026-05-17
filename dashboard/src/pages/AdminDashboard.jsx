import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Shield, Users, Calendar, CreditCard, Activity } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, orgsRes] = await Promise.all([
          api.get('super-admin/stats'),
          api.get('super-admin/organizers')
        ]);
        setStats(statsRes.data);
        setOrganizers(orgsRes.data);
      } catch (err) {
        console.error("Failed to fetch admin data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout activePath="/dashboard/super-admin">
        <div className="flex items-center justify-center h-96">
          <div className="text-emerald-400 animate-pulse font-bold text-xl">جاري تحميل بيانات النظام الشاملة...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/dashboard/super-admin">
      <div className="mb-10 bg-gradient-to-r from-amber-500/10 to-transparent p-8 rounded-[32px] border border-amber-500/20">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="w-12 h-12 text-amber-500" />
          مركز إدارة النظام الشامل (Super Admin)
        </h1>
        <p className="text-amber-500/60 font-medium">أنت الآن في منطقة التحكم العليا - إدارة المنظمين والاشتراكات والفعاليات عبر المنصة بالكامل.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <Users className="w-6 h-6 text-blue-400 mb-4" />
          <div className="text-emerald-400/50 text-sm">إجمالي المنظمين</div>
          <div className="text-3xl font-bold">{stats?.total_organizers || 0}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <Calendar className="w-6 h-6 text-emerald-400 mb-4" />
          <div className="text-emerald-400/50 text-sm">إجمالي الفعاليات</div>
          <div className="text-3xl font-bold">{stats?.total_events || 0}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <Activity className="w-6 h-6 text-purple-400 mb-4" />
          <div className="text-emerald-400/50 text-sm">إجمالي المشاركين</div>
          <div className="text-3xl font-bold">{stats?.total_participants || 0}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <CreditCard className="w-6 h-6 text-amber-400 mb-4" />
          <div className="text-emerald-400/50 text-sm">اشتراكات نشطة</div>
          <div className="text-3xl font-bold">{stats?.active_subscriptions || 0}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-xl font-bold">إدارة المنظمين</h2>
        </div>
        <table className="w-full text-right">
          <thead className="bg-white/5 text-emerald-400/50 text-xs uppercase tracking-widest">
            <tr>
              <th className="px-8 py-4">المنظم</th>
              <th className="px-8 py-4">الفعاليات</th>
              <th className="px-8 py-4">الباقة</th>
              <th className="px-8 py-4">الحالة</th>
              <th className="px-8 py-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {organizers.map(org => (
              <tr key={org.id} className="hover:bg-white/5 transition-colors">
                <td className="px-8 py-6">
                  <div className="font-bold">{org.full_name}</div>
                  <div className="text-xs text-emerald-400/30">{org.email}</div>
                </td>
                <td className="px-8 py-6">{org.event_count}</td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold border border-blue-500/20">
                    {org.plan}
                  </span>
                </td>
                <td className="px-8 py-6">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold border ${org.status ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {org.status ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <button className="text-sm text-emerald-400 hover:underline">تعديل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
