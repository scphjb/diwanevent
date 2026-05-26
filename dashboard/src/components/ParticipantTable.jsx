import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ParticipantTable = ({ eventId }) => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                setLoading(true);
                const response = await api.get('participants/', {
                    params: { event_id: eventId }
                });
                setParticipants(response.data);
            } catch (err) {
                setError('Failed to fetch participants');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            fetchParticipants();
        }
    }, [eventId]);

    if (loading) return <div className="p-4 text-center">Loading participants...</div>;
    if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;

    return (
        <div className="overflow-x-auto shadow-xl rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <table className="w-full text-left border-collapse">
                <thead className="bg-brand-dark/50 text-brand-secondary">
                    <tr>
                        <th className="p-4 font-semibold uppercase text-sm">Full Name</th>
                        <th className="p-4 font-semibold uppercase text-sm">Council</th>
                        <th className="p-4 font-semibold uppercase text-sm">QR Code</th>
                        <th className="p-4 font-semibold uppercase text-sm">Status</th>
                    </tr>
                </thead>
                <tbody className="text-gray-200">
                    {participants.map((p) => (
                        <tr key={p.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                            <td className="p-4">{p.full_name}</td>
                            <td className="p-4">{p.council}</td>
                            <td className="p-4 font-mono text-xs">{p.qr_code}</td>
                            <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    p.payment_status === 'paid' ? 'bg-brand-primary/20 text-brand-secondary' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {p.payment_status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {participants.length === 0 && (
                        <tr>
                            <td colSpan="4" className="p-8 text-center text-gray-500">No participants found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ParticipantTable;
