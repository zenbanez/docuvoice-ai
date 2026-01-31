
import React from 'react';
import { PDFFile } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SidebarProps {
  onUpload: (file: File) => void;
  currentFile: PDFFile | null;
  isProcessing: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onUpload, currentFile, isProcessing }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  return (
    <aside className="w-80 border-r bg-white flex flex-col shrink-0">
      <div className="p-6 border-b">
        <label className="block w-full">
          <span className="sr-only">Choose PDF</span>
          <div className={`
            flex flex-col items-center justify-center w-full h-32 
            border-2 border-dashed rounded-xl cursor-pointer 
            transition-all duration-200
            ${isProcessing ? 'bg-slate-50 border-slate-200' : 'hover:bg-blue-50 hover:border-blue-300 border-slate-300'}
          `}>
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-xs text-slate-500">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-slate-600">Click to upload PDF</p>
                <p className="text-xs text-slate-400 mt-1">Maximum 50MB</p>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileChange} 
              disabled={isProcessing}
            />
          </div>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {currentFile ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Document</h3>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="bg-red-100 text-red-600 p-2 rounded">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111.293 2.707l5 5a1 1 0 01.293.707V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate" title={currentFile.name}>
                    {currentFile.name}
                  </p>
                  <p className="text-xs text-slate-500">{(currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            </div>

            {currentFile.summary && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Document Summary</h3>
                <div className="text-sm text-slate-600 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100 prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentFile.summary}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm">No document active</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
          Powered by Gemini 3 & Live API
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
