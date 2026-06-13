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
        <li key={lineIdx} className="message-text-li">
          {parts}
        </li>
      );
    }
    return (
      <p key={lineIdx} className="message-text-p">
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
    <div className="app-container">
      
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb" />

      {/* Header */}
      <header className="glass-panel app-header">
        <div className="header-logo-container">
          <div className="header-logo-icon">
            <Cpu size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-gradient header-title">PolicyPilot</h1>
            <p className="header-subtitle">
              <ShieldAlert size={12} color="#0d9488" /> Secure Enterprise HR Portal
            </p>
          </div>
        </div>
        
        <div className="header-actions">
          {/* Status Indicator */}
          <div className="status-badge">
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: status.is_indexed ? '#10b981' : '#f59e0b', 
              boxShadow: status.is_indexed ? '0 0 10px #10b981' : '0 0 10px #f59e0b' 
            }} className="pulsing"></div>
            <span className="status-text">
              {status.is_indexed ? 'System Online' : 'Offline'}
            </span>
          </div>

          {/* Reset chat history button */}
          {!isInitialState && (
            <button 
              onClick={clearChat}
              className="clear-chat-btn"
            >
              <Trash2 size={13} /> <span>Clear Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Layout - Centered Chat Container */}
      <div className="main-layout">
        
        {/* Chat Window Container (Centered Claude-Style Chat) */}
        <div className="glass-panel chat-container">
          
          {/* Chat History View */}
          <div className="chat-history">
            
            {/* Initial Assistant Bubble */}
            <div className="chat-row assistant-row">
              <div className="avatar-container">
                <Cpu size={16} />
              </div>
              <div className="message-bubble assistant-bubble first-bubble">
                {renderMessageText(chatHistory[0].text)}
              </div>
            </div>

            {/* Suggested Prompt Cards (Only visible when user hasn't asked anything yet) */}
            {isInitialState && (
              <div className="suggested-container">
                <div className="suggested-title">
                  <HelpCircle size={14} color="#4f46e5" /> Suggested Inquiries:
                </div>
                <div className="suggested-grid">
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
              <div key={index} className={`chat-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}>
                {msg.role !== 'user' && (
                  <div className="avatar-container">
                    <Cpu size={16} />
                  </div>
                )}
                
                <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble reply-bubble'}`}>
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
              <div className="status-loading">
                <RefreshCw size={14} className="spinning-slow" color="#10b981" />
                <span>Securing search & synthesizing response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={onSubmit} className="chat-form">
            <input 
              type="text" 
              placeholder="Ask about leaves, remote work, insurance..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="chat-input"
              disabled={loadingQuery}
            />
            <button 
              type="submit" 
              className="glow-btn chat-submit-btn"
              disabled={loadingQuery || !status.is_indexed || !query.trim()}
            >
              <Send size={14} /> <span className="send-text">Send</span>
            </button>
          </form>
          
          {/* Footer warning details */}
          <div className="chat-footer">
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
