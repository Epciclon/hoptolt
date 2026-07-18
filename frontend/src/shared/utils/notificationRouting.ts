import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Notification } from '@/modules/notification/types/notification.types';

export const routeNotification = (notification: Notification, router: AppRouterInstance) => {
  const type = notification.data?.type;
  
  if (type === 'worker_action' && notification.data?.module) {
    router.push(`/dashboard/${notification.data.module}?tab=historial`);
    return;
  }
  
  if (type === 'reproduction_automated' || type === 'reproduction_manual') {
    const phase = notification.data?.phase;
    if (phase === 2) router.push('/dashboard/reproduction?tab=partos');
    else if (phase === 3) router.push('/dashboard/reproduction?tab=gazapos');
    else router.push('/dashboard/reproduction?tab=montas');
    return;
  }
  
  switch (type) {
    case 'birth_warning': return router.push('/dashboard/reproduction?tab=partos');
    case 'weaning_alert': return router.push('/dashboard/reproduction?tab=gazapos');
    case 'cleaning_warning': return router.push('/dashboard/cleaning');
    case 'growth_summary': return router.push('/dashboard/conejos');
  }

  if (notification.data?.galponId && (notification.type === 'success' || notification.type === 'invitation')) {
    router.push('/dashboard/galpones');
  }
};
