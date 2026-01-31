
import React, { useState, useCallback } from 'react';
import { InteractionMode, PDFFile } from './types';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import VoiceInterface from './components/VoiceInterface';
import Header from './components/Header';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [currentPdf, setCurrentPdf] = useState<PDFFile | null>(null);
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.TEXT);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      const pdfData: PDFFile = {
        name: file.name,
        base64,
        size: file.size,
        type: file.type
      };
      
      setCurrentPdf(pdfData);
      
      // Generate initial summary to ground the voice/chat context
      setIsSummarizing(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              parts: [
                { inlineData: { data: base64, mimeType: file.type } },
                { text: "Please provide a comprehensive summary of this document. Focus on the main topics, key facts, and overall structure. Format your response using clean Markdown (with bullet points and bold headers) for a dashboard view." }
              ]
            }
          ]
        });
        
        if (response.text) {
          setCurrentPdf(prev => prev ? { ...prev, summary: response.text } : null);
        }
      } catch (error) {
        console.error("Failed to generate summary:", error);
      } finally {
        setIsSummarizing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        onUpload={handleFileUpload} 
        currentFile={currentPdf} 
        isProcessing={isSummarizing}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header mode={mode} setMode={setMode} hasDocument={!!currentPdf} />
        
        <main className="flex-1 overflow-hidden relative">
          {!currentPdf ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Ready to bring your documents to life?</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Upload a PDF file to start a conversation. You can chat via text or use your voice for real-time interaction.
              </p>
            </div>
          ) : isSummarizing ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-600 font-medium">Analyzing document contents...</p>
            </div>
          ) : mode === InteractionMode.TEXT ? (
            <ChatInterface pdf={currentPdf} />
          ) : (
            <VoiceInterface pdf={currentPdf} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
