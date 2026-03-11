'use client';

import React, { useEffect, useRef } from 'react';
import MessageInput from './MessageInput';
import './ChatWindow.css';
import { IMessage } from '../models/Message';

interface ChatWindowProps {
  peer: any;
  messages: IMessage[];
  currentUserId: string;
  onSendMessage: (msg: string) => void;
  isOnline: boolean;
}

export default function ChatWindow({ peer, messages, currentUserId, onSendMessage, isOnline }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="chat-window">
      <header className="chat-header glass-panel">
        <div className="chat-header-info">
          <div className="chat-avatar-wrapper">
            {peer.image ? (
              <img src={peer.image} alt={peer.name} className="room-avatar" style={{ border: 'none', width: 42, height: 42 }} />
            ) : (
              <div className="room-avatar" style={{ width: 42, height: 42 }}>
                <span>{peer.name?.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className={`header-online-dot ${isOnline ? 'online' : ''}`}></span>
          </div>
          
          <div className="chat-header-text">
            <h2>{peer.name}</h2>
            <span className={`status-label ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <div className="messages-container">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={(msg as any)._id || idx} className={`message-wrapper ${isMe ? 'sent' : 'received'} animate-slide-in`}>
              <div className="message-bubble">
                <p className="message-text">{msg.text}</p>
                <div className="message-meta">
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {/* WhatsApp-style seen ticks - only on sent messages */}
                  {isMe && (
                    <span className={`message-ticks ${(msg as any).seen ? 'seen' : ''}`}>
                      {/* Double check mark SVG */}
                      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                        <path d="M11.071 0.929L4.5 7.5L1.929 4.929" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.071 0.929L7.5 7.5L6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSendMessage={onSendMessage} />
    </main>
  );
}
