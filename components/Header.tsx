
import React from 'react';
import { InteractionMode } from '../types';

interface HeaderProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  hasDocument: boolean;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode, hasDocument }) => {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800">DocuVoice AI</h1>
      </div>

      <div className="flex items-center bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setMode(InteractionMode.TEXT)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === InteractionMode.TEXT 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Text Chat
        </button>
        <button
          onClick={() => setMode(InteractionMode.VOICE)}
          disabled={!hasDocument}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
            !hasDocument ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            mode === InteractionMode.VOICE 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Live Voice
        </button>
      </div>

      <div className="w-32 flex justify-end">
        {hasDocument && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Active Context
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
