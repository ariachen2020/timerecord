export const formatTime = (hours, minutes) => {
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'expired':
      return 'text-red-600 bg-red-50';
    case 'expiring_soon':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-green-600 bg-green-50';
  }
};

export const getStatusText = (status) => {
  switch (status) {
    case 'expired':
      return '已過期';
    case 'expiring_soon':
      return '即將到期';
    default:
      return '正常';
  }
};
