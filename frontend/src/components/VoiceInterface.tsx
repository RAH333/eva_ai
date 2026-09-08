import React, { useState, useRef } from 'react';

export default function VoiceInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('Standby');
  const [liveTranscript, setLiveTranscript] = useState('');
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const handleVoiceToggle = async () => {
    if (isRecording) {
      terminateStream();
    } else {
      await initializeStream();
    }
  };

  const initializeStream = async () => {
    try {
      setSessionStatus('Configuring secure channel...');
      
      // Points automatically to your deployed domain instance fallback
      const serverLocation = process.env.NEXT_PUBLIC_WS_URL || 
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/stream`;
      
      socketRef.current = new WebSocket(serverLocation);

      socketRef.current.onopen = async () => {
        setSessionStatus('System Live. Speak Now...');
        setIsRecording(true);
        await startAudioPipeline();
      };

      socketRef.current.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.transcript) {
          setLiveTranscript(prev => prev + '\n' + payload.transcript);
        }
      };

      socketRef.current.onclose = () => terminateStream();
    } catch (err) {
      console.error(err);
      setSessionStatus('Secure Mic Access Denied.');
    }
  };

  const startAudioPipeline = async () => {
    audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    const engineInput = audioCtxRef.current.createMediaStreamSource(audioStreamRef.current);
    processorRef.current = audioCtxRef.current.createScriptProcessor(4096, 1, 1);

    engineInput.connect(processorRef.current);
    processorRef.current.connect(audioCtxRef.current.destination);

    processorRef.current.onaudioprocess = (audioEvent) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      
      const channelSamples = audioEvent.inputBuffer.getChannelData(0);
      const pcm16Buffer = new Int16Array(channelSamples.length);
      
      // Formats float data streams into concrete PCM files expected by high-end LLM processing engines
      for (let i = 0; i < channelSamples.length; i++) {
        pcm16Buffer[i] = Math.min(1, Math.max(-1, channelSamples[i])) * 0x7FFF;
      }
      socketRef.current.send(pcm16Buffer.buffer);
    };
  };

  const terminateStream = () => {
    setIsRecording(false);
    setSessionStatus('Standby');
    if (processorRef.current) processorRef.current.disconnect();
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
    if (socketRef.current) socketRef.current.close();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl transition-all duration-500 hover:border-slate-700">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-1">
          EvaVoice Agent
        </h1>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-6">Hackathon Edition</p>
        
        <div className="flex items-center justify-center my-8">
          <button
            onClick={handleVoiceToggle}
            className={`w-36 h-36 rounded-full font-black text-lg tracking-wider border-4 shadow-xl transition-all duration-300 transform active:scale-95 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 border-red-400 animate-pulse scale-105 shadow-red-900/40' 
                : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-900/40'
            }`}
          >
            {isRecording ? 'DISCONNECT' : 'ENGAGE'}
          </button>
        </div>

        <div className="text-center py-2 px-4 rounded-full bg-slate-950/60 border border-slate-800 text-sm font-medium mb-6">
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isRecording ? 'bg-green-400 animate-ping' : 'bg-slate-600'}`} />
          {sessionStatus}
        </div>

        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-850 h-44 overflow-y-auto">
          <span className="text-xs text-indigo-400 font-mono block mb-1">$&gt; Engine Transcript:</span>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {liveTranscript || 'System initialization complete. Listening stream ready...'}
          </p>
        </div>
      </div>
    </div>
  );
}
