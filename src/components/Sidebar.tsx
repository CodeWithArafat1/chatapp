'use client';

import React from 'react';
import './Sidebar.css';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  users: any[];
  activeUser: any;
  onSelectUser: (user: any) => void;
  currentUser: any;
}

export default function Sidebar({ users, activeUser, onSelectUser, currentUser }: SidebarProps) {
  return (
    <aside className="sidebar glass-panel">
      <header className="sidebar-header">
        <div className="user-profile">
          {currentUser?.image ? (
            <img src={currentUser.image} alt={currentUser.name} className="avatar" />
          ) : (
            <div className="avatar">{currentUser?.name?.charAt(0).toUpperCase() || 'U'}</div>
          )}
          <span className="username">{currentUser?.name}</span>
        </div>
        <button onClick={() => signOut()} className="icon-btn btn-reset" title="Sign Out">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
             <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>
      
      <div className="sidebar-search">
        <div className="search-bar">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" className="input-reset" placeholder="Search contacts" />
        </div>
      </div>

      <div className="room-list">
        {users.map((user) => (
          <div 
            key={user._id} 
            className={`room-item ${activeUser?._id === user._id ? 'active' : ''}`}
            onClick={() => onSelectUser(user)}
          >
            {user.image ? (
              <img src={user.image} alt={user.name} className="room-avatar" style={{ border: 'none' }} />
            ) : (
              <div className="room-avatar">
                 <span>{user.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            
            <div className="room-info">
              <h4 className="room-name">{user.name}</h4>
              <p className="room-last-message">{user.email}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
