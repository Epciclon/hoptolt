export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const formattedDate = ecuadorDate.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${formattedDate} ${formattedTime}`;
};
