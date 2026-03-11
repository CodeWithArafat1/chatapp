'use client';

import React, { useEffect, useRef } from 'react';
import MessageInput from './MessageInput';
import './ChatWindow.css';
import { IMessage } from '../lib/socket';

interface ChatWindowProps {
  peer: any;
  messages: IMessage[];
  currentUserId: string;
  onSendMessage: (msg: string) => void;
}

export default function ChatWindow({ peer, messages, currentUserId, onSendMessage }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="chat-window">
      <header className="chat-header glass-panel">
        <div className="chat-header-info">
          {peer.image ? (
            <img src={peer.image} alt={peer.name} className="room-avatar" style={{ border: 'none', width: 40, height: 40 }} />
          ) : (
            <div className="room-avatar" style={{ width: 40, height: 40 }}>
              <span>{peer.name?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          
          <div className="chat-header-text">
            <h2>{peer.name}</h2>
            <span className="status">Available</span>
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
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
