import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Cpu, RefreshCw, Sparkles, BookOpen, AlertCircle, Trash2, HelpCircle, ShieldAlert, FileText
} from 'lucide-react';

const API_BASE = 'https://boligorla-rag.hf.space';

const SUGGESTED_PROMPTS = [
  {
    title: "Leave Policy",
    desc: "Check annual paid leaves and carry-forward rules.",
    query: "How many leaves are allowed annually and what is the carry forward limit?"
  },
  {
    title: "Remote Work Security",
    desc: "Understand VPN and password requirements.",
    query: "What are the security requirements for remote work?"
  },
  {
    title: "Insurance Claims",
    desc: "Find out how to submit health insurance claims.",
    query: "What is the process and timeline to file health insurance claims?"
  },
  {
    title: "Onboarding Checklist",
    desc: "List required documents for new employees.",
    query: "What documents must be submitted during onboarding and in how many days?"
  }
];

// Custom renderer to format bold highlights and ensure no citations/document names are displayed
const renderMessageText = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={lineIdx} style={{ height: '8px' }} />;
    
    // Safety check: remove any accidental markdown-style citation brackets (e.g. [Source: ...] or [Page 1])
    cleanLine = cleanLine.replace(/\[Source:\s*.*?\]/g, "");
    cleanLine = cleanLine.replace(/\[Page\s*\d+\]/g, "");
    
    const isBullet = cleanLine.startsWith('* ') || cleanLine.startsWith('- ');
    if (isBullet) {
      cleanLine = cleanLine.substring(2);
    }
    
    const parts = [];
    let currentIndex = 0;
    const regex = /\*\*(.*?)\*\*/g; // Parse bold tags
    let match;
    
    while ((match = regex.exec(cleanLine)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > currentIndex) {
        parts.push(cleanLine.substring(currentIndex, matchIndex));
      }
      parts.push(<strong key={matchIndex} style={{ color: '#4f46e5', fontWeight: '700' }}>{match[1]}</strong>);
      currentIndex = regex.lastIndex;
    }
    
    if (currentIndex < cleanLine.length) {
      parts.push(cleanLine.substring(currentIndex));
    }
    
    if (isBullet) {
      return (
        <li key={lineIdx} style={{ marginLeft: '16px', marginBottom: '8px', listStyleType: 'disc', color: 'var(--text-secondary)' }}>
          {parts}
        </li>
      );
    }
    return (
      <p key={lineIdx} style={{ marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
        {parts}
      </p>
    );
  });
};

function App() {
  const [status, setStatus] = useState({ is_indexed: false, status: 'unknown' });
  const [query, setQuery] = useState('');
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { 
      role: 'assistant', 
      text: "Hello! I am your ABC Technologies HR Assistant. How can I help you today? You can ask me questions about leaves, remote work rules, onboarding, or insurance claims." 
    }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loadingQuery]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Error fetching API status:", err);
    }
  };

  const handleQuery = async (queryText) => {
    if (!queryText.trim()) return;

    setChatHistory(prev => [...prev, { role: 'user', text: queryText }]);
    setLoadingQuery(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          k: 3 // Set retrieve limit K=3 privately
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          text: data.answer
        }]);
      } else {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          text: `Error: ${data.detail || "Unable to retrieve answers."}` 
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: "Error connecting to the backend. Is the server running?" 
      }]);
    } finally {
      setLoadingQuery(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || loadingQuery) return;
    const text = query;
    setQuery('');
    handleQuery(text);
  };

  const clearChat = () => {
    setChatHistory([
      { 
        role: 'assistant', 
        text: "Hello! I am your ABC Technologies HR Assistant. How can I help you today? You can ask me questions about leaves, remote work rules, onboarding, or insurance claims." 
      }
    ]);
  };

  const isInitialState = chatHistory.length === 1;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', backgroundColor: 'var(--bg-deep)' }}>
      
      {/* Background Glowing Orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header className="glass-panel" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 24px', 
        margin: '20px 20px 8px 20px', 
        borderRadius: '16px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            background: 'var(--primary-gradient)', 
            padding: '10px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' 
          }}>
            <Cpu size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>PolicyPilot</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldAlert size={12} color="#0d9488" /> Secure Enterprise HR Portal
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Status Indicator */}
          <div className="glass-card" style={{ 
            padding: '8px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            borderRadius: '10px', 
            fontSize: '13px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: status.is_indexed ? '#10b981' : '#f59e0b', 
              boxShadow: status.is_indexed ? '0 0 10px #10b981' : '0 0 10px #f59e0b' 
            }} className="pulsing"></div>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
              {status.is_indexed ? 'System Online' : 'Offline'}
            </span>
          </div>

          {/* Reset chat history button */}
          {!isInitialState && (
            <button 
              onClick={clearChat}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '8px 12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)' }}
            >
              <Trash2 size={13} /> Clear Chat
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Layout - Centered Chat Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '8px 20px 20px 20px', justifyContent: 'center' }}>
        
        {/* Chat Window Container (Centered Claude-Style Chat) */}
        <div className="glass-panel" style={{ 
          width: '100%', 
          maxWidth: '850px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          padding: '24px 28px',
          border: '1px solid var(--border-color)'
        }}>
          
          {/* Chat History View */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px', paddingRight: '6px', marginBottom: '16px' }}>
            
            {/* Initial Assistant Bubble */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                background: 'rgba(79, 70, 229, 0.08)',
                border: '1px solid rgba(79, 70, 229, 0.15)',
                padding: '8px',
                borderRadius: '8px',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                marginTop: '4px'
              }}>
                <Cpu size={16} />
              </div>
              <div style={{
                flex: 1,
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'rgba(0, 0, 0, 0.015)',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid #4f46e5',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {renderMessageText(chatHistory[0].text)}
              </div>
            </div>

            {/* Suggested Prompt Cards (Only visible when user hasn't asked anything yet) */}
            {isInitialState && (
              <div style={{ margin: '12px 0 12px 40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>
                  <HelpCircle size={14} color="#4f46e5" /> Suggested Inquiries:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '12px'
                }}>
                  {SUGGESTED_PROMPTS.map((card, idx) => (
                    <div 
                      key={idx} 
                      className="action-card"
                      onClick={() => handleQuery(card.query)}
                    >
                      <h3>
                        <BookOpen size={13} color="#4f46e5" />
                        {card.title}
                      </h3>
                      <p>{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User & Assistant conversation bubbles */}
            {chatHistory.slice(1).map((msg, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start'
              }}>
                {msg.role !== 'user' && (
                  <div style={{
                    background: 'rgba(79, 70, 229, 0.08)',
                    border: '1px solid rgba(79, 70, 229, 0.15)',
                    padding: '8px',
                    borderRadius: '8px',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: '4px'
                  }}>
                    <Cpu size={16} />
                  </div>
                )}
                
                <div style={{
                  maxWidth: '82%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  background: msg.role === 'user' ? 'var(--primary-gradient)' : 'rgba(0, 0, 0, 0.015)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  borderLeft: msg.role === 'user' ? 'none' : '4px solid #10b981',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  boxShadow: msg.role === 'user' ? '0 6px 16px rgba(79, 70, 229, 0.2)' : 'none',
                  transition: 'var(--transition-fast)'
                }}>
                  {msg.role === 'user' ? (
                    <p style={{ margin: 0, fontWeight: '500' }}>{msg.text}</p>
                  ) : (
                    renderMessageText(msg.text)
                  )}
                </div>
              </div>
            ))}

            {/* Generating response state */}
            {loadingQuery && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '40px' }}>
                <RefreshCw size={14} className="spinning-slow" color="#10b981" />
                <span>Securing policy search and synthesizing response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={onSubmit} style={{ display: 'flex', gap: '12px', position: 'relative', marginTop: '8px' }}>
            <input 
              type="text" 
              placeholder="Ask a question about HR, insurance, leaves or IT guidelines..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ 
                flex: 1, 
                background: 'var(--bg-card)',
                paddingRight: '120px',
                border: '1px solid var(--border-color)'
              }}
              disabled={loadingQuery}
            />
            <button 
              type="submit" 
              className="glow-btn"
              disabled={loadingQuery || !status.is_indexed || !query.trim()}
              style={{ 
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px 18px',
                height: 'calc(100% - 12px)',
                fontSize: '13px'
              }}
            >
              <Send size={14} /> Send
            </button>
          </form>
          
          {/* Footer warning details */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>
            <span>🔒 Confidential Internal Portal</span>
            <span>•</span>
            <span>⚡ Real-time Verification</span>
            <span>•</span>
            <span>🤖 Mistral-Nemotron Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
