'use client';

type StoredSubscription = PushSubscription;

let subscription: StoredSubscription | null = null;

export async function subscribeUser(sub: StoredSubscription) {
  subscription = sub;
  return { success: true };
}

export async function unsubscribeUser() {
  subscription = null;
  return { success: true };
}

export async function sendNotification(message: string) {
  if (!subscription) {
    return { success: false, error: 'No subscription available' };
  }

  if (typeof window === 'undefined') {
    return { success: false, error: 'Notifications are unavailable' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Taskez PM', {
      body: message,
      icon: '/icon.png',
      tag: 'taskez-notification'
    });
    return { success: true };
  } catch (error) {
    console.error('Error showing notification', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to show notification'
    };
  }
}
