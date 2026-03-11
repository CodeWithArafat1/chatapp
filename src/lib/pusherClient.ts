import PusherClient from 'pusher-js';

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    authEndpoint: '/api/pusher/auth',
    authTransport: 'ajax',
    auth: {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  }
);
