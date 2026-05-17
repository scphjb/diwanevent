/**
 * Unified time formatter for the application
 * Ensures consistent display of time in 24h format (HH:mm)
 */
export const formatTime = (dateInput) => {
  if (!dateInput) return '--:--';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';
  
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
};

export const getCurrentTime = () => {
  return formatTime(new Date());
};
