'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import { IMessage } from '@/models/Message';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ [userId: string]: IMessage[] }>({});
  const [toastMessage, setToastMessage] = useState<{title: string, body: string, image?: string} | null>(null);

  const usersRef = useRef(users);
  const activeUserRef = useRef(activeUser);
  const lastPollTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    usersRef.current = users;
    activeUserRef.current = activeUser;
  }, [users, activeUser]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch users once when authenticated
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    
    fetch('/api/users').then(res => res.json()).then(data => {
      setUsers(data);
      if (data.length > 0) handleSelectUser(data[0]);
    });
  }, [status, (session?.user as any)?.id]);

  // ===== HEARTBEAT: Send heartbeat every 10 seconds =====
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    const heartbeatInterval = setInterval(() => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    }, 10000);
    return () => clearInterval(heartbeatInterval);
  }, [status]);

  // ===== POLL ONLINE STATUS: Every 5 seconds =====
  useEffect(() => {
    if (status !== 'authenticated') return;
    const fetchOnline = () => {
      fetch('/api/heartbeat')
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setOnlineUsers(data); })
        .catch(() => {});
    };
    fetchOnline();
    const onlineInterval = setInterval(fetchOnline, 5000);
    return () => clearInterval(onlineInterval);
  }, [status]);

  // ===== POLL NEW MESSAGES: Every 2 seconds =====
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    const myId = (session.user as any).id;

    const pollMessages = () => {
      const since = lastPollTimeRef.current;
      fetch(`/api/messages/poll?since=${since}`)
        .then(res => res.json())
        .then((newMsgs: any[]) => {
          if (!Array.isArray(newMsgs) || newMsgs.length === 0) return;

          const latestTime = newMsgs.reduce((max, m) => {
            const t = new Date(m.createdAt || m.timestamp).getTime();
            return t > max ? t : max;
          }, since);
          lastPollTimeRef.current = latestTime;

          newMsgs.forEach((msg) => {
            const peerId = msg.senderId === myId ? msg.receiverId : msg.senderId;

            if (msg.senderId !== myId) {
              const currentActive = activeUserRef.current;
              if (!currentActive || currentActive._id !== msg.senderId) {
                const sender = usersRef.current.find((u: any) => u._id === msg.senderId);
                const senderName = sender?.name || 'Someone';
                const senderImage = sender?.image || '';
                setToastMessage({ title: senderName, body: msg.text, image: senderImage });
                setTimeout(() => setToastMessage(null), 5000);
                
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(senderName, {
                    body: msg.text,
                    icon: senderImage || '/favicon.ico'
                  });
                }
                
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.play().catch(() => {});
                } catch(e) {}
              }
            }

            setMessages((prev) => {
              const userMessages = prev[peerId] || [];
              // Fix: Deduplicate by checking BOTH real _id AND matching temp messages
              const isDuplicate = userMessages.some((m: any) => {
                // If both have real IDs, compare them
                if (m._id && msg._id && !String(m._id).startsWith('temp-') && !String(msg._id).startsWith('temp-')) {
                  return String(m._id) === String(msg._id);
                }
                // If one is a temp message, match by content + sender + receiver + close timestamp
                return m.text === msg.text 
                  && m.senderId === msg.senderId 
                  && m.receiverId === msg.receiverId
                  && Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 5000;
              });

              if (isDuplicate) {
                // Replace temp message with real one (so we get the real _id and seen status)
                return {
                  ...prev,
                  [peerId]: userMessages.map((m: any) => {
                    if (String(m._id).startsWith('temp-') && m.text === msg.text && m.senderId === msg.senderId) {
                      return msg; // Replace temp with real
                    }
                    // Also update seen status for existing messages
                    if (String(m._id) === String(msg._id) && msg.seen !== m.seen) {
                      return msg;
                    }
                    return m;
                  })
                };
              }

              return {
                ...prev,
                [peerId]: [...userMessages, msg]
              };
            });
          });
        })
        .catch(() => {});
    };

    const pollInterval = setInterval(pollMessages, 2000);
    return () => clearInterval(pollInterval);
  }, [status, (session?.user as any)?.id]);

  const handleSelectUser = async (user: any) => {
    setActiveUser(user);
    // Always fetch latest history
    const res = await fetch(`/api/messages/${user._id}`);
    const history = await res.json();
    setMessages(prev => ({ ...prev, [user._id]: history }));

    // Mark messages from this user as seen
    const myId = (session?.user as any)?.id;
    if (myId) {
      fetch(`/api/messages/seen/${user._id}`, { method: 'POST' }).catch(() => {});
    }
  };

  // Also mark messages as seen when we are actively viewing a chat and new messages come in
  useEffect(() => {
    if (!activeUser || !session?.user) return;
    const myId = (session.user as any).id;
    const peerMessages = messages[activeUser._id] || [];
    const hasUnseenFromPeer = peerMessages.some((m: any) => m.senderId === activeUser._id && !m.seen && !String(m._id).startsWith('temp-'));
    if (hasUnseenFromPeer) {
      fetch(`/api/messages/seen/${activeUser._id}`, { method: 'POST' }).catch(() => {});
    }
  }, [messages, activeUser?._id]);

  const handleSendMessage = (text: string) => {
    if (!activeUser || !session?.user) return;
    
    const myId = (session.user as any).id;
    const now = Date.now();
    const newMsg = {
      _id: 'temp-' + Math.random().toString(36).substring(2, 9),
      senderId: myId,
      receiverId: activeUser._id,
      text,
      timestamp: now,
      seen: false,
    };

    setMessages((prev) => {
      const userMessages = prev[activeUser._id] || [];
      return {
        ...prev,
        [activeUser._id]: [...userMessages, newMsg as any]
      };
    });

    fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: myId, receiverId: activeUser._id, text, timestamp: now })
    }).catch(err => console.error("Failed to send message", err));
  };

  if (status === 'loading' || !session) {
    return (
      <div className="app-container" style={{ justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your chats...</p>
      </div>
    );
  }

  return (
    <div className="app-container relative">
      <Sidebar 
        users={users} 
        activeUser={activeUser} 
        onSelectUser={handleSelectUser}
        currentUser={session.user}
        onlineUsers={onlineUsers}
      />
      {activeUser ? (
        <ChatWindow 
          peer={activeUser}
          messages={messages[activeUser._id] || []}
          currentUserId={(session.user as any).id}
          onSendMessage={handleSendMessage}
          isOnline={onlineUsers.includes(activeUser._id)}
        />
      ) : (
        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>
          Select a user from your contacts to start chatting.
        </div>
      )}

      {/* Premium Toast Notification with Profile Picture */}
      {toastMessage && (
        <div className="toast-notification animate-slide-in">
          {toastMessage.image ? (
            <img src={toastMessage.image} alt="" className="toast-avatar" />
          ) : (
            <div className="toast-avatar-placeholder">
              {toastMessage.title?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="toast-content">
            <strong>{toastMessage.title}</strong>
            <p>{toastMessage.body}</p>
          </div>
          <button className="toast-close" onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}
    </div>
  );
}
