'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import { getSocket, IMessage } from '@/lib/socket';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [messages, setMessages] = useState<{ [userId: string]: IMessage[] }>({});
  const [toastMessage, setToastMessage] = useState<{title: string, body: string} | null>(null);

  const usersRef = useRef(users);
  const activeUserRef = useRef(activeUser);

  useEffect(() => {
    usersRef.current = users;
    activeUserRef.current = activeUser;
  }, [users, activeUser]);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Combine all socket logic into one stable effect so it doesn't re-bind on every render or state change
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    
    // Fetch users only once when authenticated
    fetch('/api/users').then(res => res.json()).then(data => {
      setUsers(data);
      if (data.length > 0) handleSelectUser(data[0]);
    });

    const socket = getSocket();
    const myId = (session.user as any).id;

    const onConnect = () => {
      console.log('Socket connected, registering user:', myId);
      socket.emit('register_user', myId);
    };

    const onReceiveMessage = (msg: IMessage) => {
      console.log('Received message:', msg);
      const peerId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      
      // If we received a message from someone else, and they aren't our front-and-center active chat
      if (msg.senderId !== myId) {
        const currentActive = activeUserRef.current;
        if (!currentActive || currentActive._id !== msg.senderId) {
          const senderName = usersRef.current.find((u: any) => u._id === msg.senderId)?.name || 'Notification';
          setToastMessage({ title: `New message from ${senderName}`, body: msg.text });
          setTimeout(() => setToastMessage(null), 5000);
          
          // Play a tiny notification sound
          try {
            const audio = new Audio('/notification.mp3'); 
            audio.play().catch(() => {});
          } catch(e) {}
        }
      }

      setMessages((prev) => {
        const userMessages = prev[peerId] || [];
        // Prevent duplicate messages in UI by checking ID and content
        if (userMessages.some((m: any) => m._id === (msg as any)._id || (m.timestamp === msg.timestamp && m.text === msg.text))) {
          return prev;
        }
        
        return {
          ...prev,
          [peerId]: [...userMessages, msg]
        };
      });
    };

    // If socket is already connected when this runs, manually register
    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('receive_message', onReceiveMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('receive_message', onReceiveMessage);
    };
  }, [status, session]); // Only re-run if auth status changes

  const handleSelectUser = async (user: any) => {
    setActiveUser(user);
    if (!messages[user._id]) {
      // Fetch history
      const res = await fetch(`/api/messages/${user._id}`);
      const history = await res.json();
      setMessages(prev => ({ ...prev, [user._id]: history }));
    }
  };

  const handleSendMessage = (text: string) => {
    if (!activeUser || !session?.user) return;
    
    const newMsg = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: (session.user as any).id,
      receiverId: activeUser._id,
      text,
      timestamp: Date.now()
    };

    // Optimistically update
    setMessages((prev) => {
      const userMessages = prev[activeUser._id] || [];
      return {
        ...prev,
        [activeUser._id]: [...userMessages, newMsg as any]
      };
    });

    // Send to server
    getSocket().emit('send_message', newMsg);
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
      />
      {activeUser ? (
        <ChatWindow 
          peer={activeUser}
          messages={messages[activeUser._id] || []}
          currentUserId={(session.user as any).id}
          onSendMessage={handleSendMessage}
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
