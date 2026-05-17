import React, { createContext, useContext, useState, useEffect } from 'react';

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const [selectedEventId, setSelectedEventId] = useState(() => {
    return parseInt(localStorage.getItem('diwan_selected_event_id')) || null;
  });

  const handleEventSelect = (id) => {
    setSelectedEventId(id);
    localStorage.setItem('diwan_selected_event_id', id.toString());
  };

  return (
    <EventContext.Provider value={{ selectedEventId, setSelectedEventId: handleEventSelect }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
