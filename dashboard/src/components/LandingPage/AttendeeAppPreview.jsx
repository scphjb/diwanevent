import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, Calendar, Award } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const AttendeeAppPreview = () => {
  const { L, isRtl } = useLang();

  return (
    <section className="py-24 bg-brand-dark overflow-hidden relative" id="app-preview">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          <div className={`${isRtl ? 'order-2 lg:order-1 text-right' : 'order-2 lg:order-1 text-left'}`}>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
              {L({ ar: "تطبيق المشارك: كل ما يحتاجه في جيبه", en: "Attendee App: Everything in Their Pocket", fr: "App Participant : Tout dans la Poche", es: "App del Asistente: Todo en su Bolsillo" })}
            </h2>
            <p className="text-brand-light/60 text-lg mb-10">
              {L({ 
                ar: "لا حاجة لطباعة الأوراق. يحصل المشارك على تطبيق ويب بسيط وسريع يعرض تذكرته، جدول الأعمال، وحتى شهادة حضوره فور انتهاء الفعالية.", 
                en: "No need for paper. Attendees get a simple web app showing their ticket, agenda, and certificate instantly after the event.",
                fr: "Fini le papier. Les participants disposent d'une web app fluide affichant leur billet, l'agenda et leur certificat.",
                es: "Sin papeles. Los asistentes obtienen una web app fluida con su entrada, agenda y certificado al instante."
              })}
            </p>

            <div className="space-y-6">
              {[
                { icon: QrCode, text: L({ ar: "تذكرة دخول ذكية مع QR كود", en: "Smart entry ticket with QR", fr: "Billet intelligent avec code QR", es: "Entrada inteligente con código QR" }) },
                { icon: Calendar, text: L({ ar: "جدول أعمال الفعالية المحدث", en: "Updated event agenda", fr: "Agenda de l'événement à jour", es: "Agenda del evento actualizada" }) },
                { icon: Award, text: L({ ar: "تحميل شهادة الحضور بضغطة واحدة", en: "One-click certificate download", fr: "Téléchargement du certificat en un clic", es: "Descarga de certificado con un clic" }) }
              ].map((item, idx) => (
                <div key={idx} className={`flex items-center gap-4 text-white/80 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary">
                    <item.icon size={20} />
                  </div>
                  <span className="font-bold">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            {/* Phone Frame */}
            <div className="relative w-[320px] h-[650px] bg-black rounded-[3rem] border-[8px] border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Screen Content */}
              <div className="absolute inset-0 bg-brand-dark flex flex-col">
                <img 
                  src="/attendee_app.png" 
                  alt="Attendee App Mockup" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AttendeeAppPreview;
