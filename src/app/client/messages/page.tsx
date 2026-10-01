'use client';
import React, { useState } from 'react';
import { Send, Paperclip, CheckCircle2 } from 'lucide-react';

export default function MessagesPage() {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'coach', text: 'Great job hitting your macro targets yesterday! How did the core warmups feel?', time: '09:41 AM' },
    { id: 2, sender: 'client', text: 'Thanks! The McGill Big 3 felt much better today. Glute bridges are definitely getting easier.', time: '10:15 AM' },
    { id: 3, sender: 'coach', text: 'Perfect. Keep the eccentric portion slow on the machine presses today.', time: '10:20 AM' },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setMessages([...messages, {
      id: Date.now(),
      sender: 'client',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen max-w-3xl mx-auto border-x border-white/5 relative">
      
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/10 p-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(37,99,235,0.5)]">
            C
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black"></div>
        </div>
        <div>
          <h2 className="font-bold text-white drop-shadow-sm">Coach Prudhvi</h2>
          <p className="text-xs text-emerald-400 font-medium">Online</p>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
              msg.sender === 'client' 
                ? 'bg-blue-600 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(37,99,235,0.3)]' 
                : 'bg-white/10 text-white backdrop-blur-md border border-white/5 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
            <div className="flex items-center gap-1 mt-1 px-1">
              <span className="text-[10px] text-white/40">{msg.time}</span>
              {msg.sender === 'client' && <CheckCircle2 size={12} className="text-blue-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area (Frosted Glass) */}
      <div className="p-4 bg-black/50 backdrop-blur-xl border-t border-white/10 pb-safe">
        <form onSubmit={handleSend} className="flex items-center gap-3 relative">
          <button type="button" className="text-white/50 hover:text-white transition-colors p-2">
            <Paperclip size={20} />
          </button>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message your coach..." 
            className="flex-1 bg-white/5 border border-white/10 text-white rounded-full px-5 py-3 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/30"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}