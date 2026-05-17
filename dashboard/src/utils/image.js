export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.split('/api/v1')[0] 
    : 'http://localhost:8000';
  return `${baseUrl}${url}`;
};
