'use client';
import React, { useState } from 'react';
import { Bell, MessageCircle, FileText, Calendar, Check } from 'lucide-react';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  
  const notifications = [
    { id: 1, type: 'message', title: 'New message from Coach', time: '10m ago', unread: true, icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { id: 2, type: 'plan', title: 'Diet plan updated', time: '2h ago', unread: true, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { id: 3, type: 'checkin', title: 'Weekly check-in due tomorrow', time: '1d ago', unread: false, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white">Notifications</h3>
            <button className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
              <Check size={14} /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {notifications.map((note) => (
              <div key={note.id} className={`p-4 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer ${note.unread ? 'bg-blue-500/5' : ''}`}>
                <div className={`p-2 rounded-xl h-fit ${note.bg} ${note.color}`}>
                  <note.icon size={16} />
                </div>
                <div>
                  <p className={`text-sm ${note.unread ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                    {note.title}
                  </p>
                  <p className="text-xs text-white/40 mt-1">{note.time}</p>
                </div>
                {note.unread && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-auto mt-2 shadow-[0_0_5px_rgba(37,99,235,0.8)]"></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}