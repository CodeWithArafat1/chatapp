'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  const [toastMessage, setToastMessage] = useState<{title: string, body: string} | null>(null);

  const usersRef = useRef(users);
  const activeUserRef = useRef(activeUser);
  const lastPollTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    usersRef.current = users;
    activeUserRef.current = activeUser;
  }, [users, activeUser]);
  
  useEffect(() => {
    // Request desktop notification permissions
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

  // ===== HEARTBEAT: Send heartbeat every 10 seconds to mark user as online =====
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Send initial heartbeat immediately
    fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});

    const heartbeatInterval = setInterval(() => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    }, 10000); // Every 10 seconds

    return () => clearInterval(heartbeatInterval);
  }, [status]);

  // ===== POLL ONLINE STATUS: Check who's online every 5 seconds =====
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchOnline = () => {
      fetch('/api/heartbeat')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setOnlineUsers(data);
          }
        })
        .catch(() => {});
    };

    fetchOnline(); // Initial fetch
    const onlineInterval = setInterval(fetchOnline, 5000); // Every 5 seconds

    return () => clearInterval(onlineInterval);
  }, [status]);

  // ===== POLL NEW MESSAGES: Check for new messages every 2 seconds =====
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const myId = (session.user as any).id;

    const pollMessages = () => {
      const since = lastPollTimeRef.current;
      fetch(`/api/messages/poll?since=${since}`)
        .then(res => res.json())
        .then((newMsgs: any[]) => {
          if (!Array.isArray(newMsgs) || newMsgs.length === 0) return;

          // Update the poll timestamp to the latest message's createdAt
          const latestTime = newMsgs.reduce((max, m) => {
            const t = new Date(m.createdAt || m.timestamp).getTime();
            return t > max ? t : max;
          }, since);
          lastPollTimeRef.current = latestTime;

          // Group new messages by peer
          newMsgs.forEach((msg) => {
            const peerId = msg.senderId === myId ? msg.receiverId : msg.senderId;

            // Show notification for messages from others
            if (msg.senderId !== myId) {
              const currentActive = activeUserRef.current;
              if (!currentActive || currentActive._id !== msg.senderId) {
                const senderName = usersRef.current.find((u: any) => u._id === msg.senderId)?.name || 'Someone';
                setToastMessage({ title: `New message from ${senderName}`, body: msg.text });
                setTimeout(() => setToastMessage(null), 5000);
                
                // Desktop notification
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(`New message from ${senderName}`, {
                    body: msg.text,
                    icon: '/favicon.ico'
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
              // Deduplicate by _id
              if (userMessages.some((m: any) => m._id === msg._id)) {
                return prev;
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

    const pollInterval = setInterval(pollMessages, 2000); // Every 2 seconds

    return () => clearInterval(pollInterval);
  }, [status, (session?.user as any)?.id]);

  const handleSelectUser = async (user: any) => {
    setActiveUser(user);
    // Always fetch latest history when selecting a user
    const res = await fetch(`/api/messages/${user._id}`);
    const history = await res.json();
    setMessages(prev => ({ ...prev, [user._id]: history }));
  };

  const handleSendMessage = (text: string) => {
    if (!activeUser || !session?.user) return;
    
    const myId = (session.user as any).id;
    const newMsg = {
      _id: 'temp-' + Math.random().toString(36).substring(2, 9),
      senderId: myId,
      receiverId: activeUser._id,
      text,
      timestamp: Date.now()
    };

    // Optimistically update UI
    setMessages((prev) => {
      const userMessages = prev[activeUser._id] || [];
      return {
        ...prev,
        [activeUser._id]: [...userMessages, newMsg as any]
      };
    });

    // Send to server via REST API
    fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: myId, receiverId: activeUser._id, text, timestamp: newMsg.timestamp })
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

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="toast-notification animate-slide-in">
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
