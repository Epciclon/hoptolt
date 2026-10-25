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

export const formatDateString = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  if (dateString.includes('T')) {
    const date = new Date(dateString);
    const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    return ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

export const formatFriendlyDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days < 7) return `Hace ${days} d`;
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = formatFriendlyDate;

export const isIncidentFromToday = (dateInput: string | Date | null | undefined): boolean => {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

