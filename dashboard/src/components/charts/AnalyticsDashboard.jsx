import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell 
} from 'recharts';
import axios from 'axios';
import useAttendanceSocket from '../hooks/useAttendanceSocket';

const COLORS = ['#2A64EC', '#F59E0B', '#3B82F6', '#EF4444'];

/**
 * مكون لوحة التحليلات - يعرض البيانات بجلبها من الـ API وتحديثها لحظياً.
 */
const AnalyticsDashboard = ({ eventId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const response = await axios.get(`/api/v1/analytics/${eventId}/summary`);
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [eventId]);

    // التحديث اللحظي عند تسجيل دخول مشارك جديد
    useAttendanceSocket(eventId, (message) => {
        if (message.type === 'check_in') {
            fetchAnalytics(); // إعادة جلب البيانات لتحديث الرسوم البيانية
        }
    });

    if (loading) return <div className="p-10 text-center">جاري تحميل البيانات...</div>;

    return (
        <div className="p-6 space-y-8 bg-brand-dark min-h-screen text-white">
            <h2 className="text-2xl font-bold border-r-4 border-amber-500 pr-4">تحليلات الفعالية</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="إجمالي المسجلين" value={data.overview.total_invited} />
                <StatCard label="الحضور الفعلي" value={data.overview.checked_in} color="text-brand-secondary" />
                <StatCard label="نسبة الحضور" value={`${data.overview.attendance_rate}%`} color="text-amber-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* توزيع الحضور حسب الجهة */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                    <h3 className="text-lg font-semibold mb-6">توزيع الحضور حسب المؤسسة</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.councils_distribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{ backgroundColor: '#050B18', border: 'none' }} />
                                <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* نسبة الحضور الفعلي */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                    <h3 className="text-lg font-semibold mb-6">معدل الإنجاز</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'حضروا', value: data.overview.checked_in },
                                        { name: 'بانتظارهم', value: data.overview.pending }
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#2A64EC" />
                                    <Cell fill="rgba(255,255,255,0.1)" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color = "text-white" }) => (
    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
        <p className="text-slate-400 text-sm mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);

export default AnalyticsDashboard;
