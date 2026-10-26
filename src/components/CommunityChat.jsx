import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { askAITutor } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, MessageSquare, Clock, AlertCircle, Bot, BookmarkPlus, Edit2, Trash2, X, Check, CheckCircle2 } from 'lucide-react';

export default function CommunityChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  
  // Custom Alert / Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // AI Mention Auto-Suggest State
  const [showMentionPopup, setShowMentionPopup] = useState(false);

  // Edit State
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Generate a mock user ID and name
  const [localUser] = useState(() => {
    const saved = localStorage.getItem('psc_user_profile');
    if (saved) return JSON.parse(saved);
    const newProfile = { id: Math.random().toString(36).substr(2, 9), name: `Aspirant_${Math.floor(Math.random() * 1000)}` };
    localStorage.setItem('psc_user_profile', JSON.stringify(newProfile));
    return newProfile;
  });

  // Listen to Firestore in Real-Time
  useEffect(() => {
    const q = query(collection(db, 'global_discussions'), orderBy('timestamp', 'asc'), limit(150));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- INPUT HANDLER FOR AUTO-SUGGEST ---
  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    
    // Check if the user is typing an @ mention
    const words = val.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord === '@' || lastWord.toLowerCase() === '@a' || lastWord.toLowerCase() === '@ae') {
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
    }
  };

  const insertMention = () => {
    const words = newMessage.split(' ');
    words.pop(); // Remove the incomplete "@" text
    const newText = words.join(' ') + (words.length > 0 ? ' ' : '') + '@AE Chettan ';
    setNewMessage(newText);
    setShowMentionPopup(false);
    textareaRef.current?.focus();
  };

  // --- SEND MESSAGE & TRIGGER AI ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setShowMentionPopup(false);
    setIsSending(true);

    try {
      await addDoc(collection(db, 'global_discussions'), {
        text: messageText,
        userId: localUser.id,
        userName: localUser.name,
        timestamp: serverTimestamp(),
        isEdited: false
      });
      scrollToBottom();

      if (messageText.toLowerCase().includes('@ae chettan')) {
        setIsAITyping(true);
        scrollToBottom();
        
        const context = "You are AE Chettan, an expert Kerala PSC Civil Engineering tutor in a live community chat room. Answer the student's doubt accurately and concisely. Use formatting (bullet points, bold text) for readability.";
        const aiResponse = await askAITutor(messageText, context);
        
        await addDoc(collection(db, 'global_discussions'), {
          text: aiResponse,
          userId: 'AE_CHETTAN_BOT',
          userName: 'AE Chettan',
          isAI: true,
          timestamp: serverTimestamp(),
        });
        setIsAITyping(false);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Chat Error: ", error);
      setIsAITyping(false);
      triggerToast("Error sending message", "error");
    } finally {
      setIsSending(false);
    }
  };

  // --- EDIT MESSAGE ---
  const initiateEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.text);
  };

  const handleUpdateMessage = async (id) => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'global_discussions', id), {
        text: editContent.trim(),
        isEdited: true
      });
      setEditingMsgId(null);
      setEditContent('');
      triggerToast("Message updated");
    } catch (error) {
      triggerToast("Failed to edit", "error");
    }
  };

  // --- DELETE MESSAGE ---
  const handleDeleteMessage = async (id) => {
    if (window.confirm("Delete this message permanently?")) {
      try {
        await deleteDoc(doc(db, 'global_discussions', id));
        triggerToast("Message deleted");
      } catch (error) {
        triggerToast("Failed to delete", "error");
      }
    }
  };

  // --- SAVE TO GLOBAL VAULT (Integrates with existing Favorites) ---
  const handleSaveToVault = (text, author) => {
    const vaultKey = 'psc_fav_memorized'; // Syncs with your actual Favorites page
    const savedVault = JSON.parse(localStorage.getItem(vaultKey) || '[]');
    
    // Check for duplicates
    if (!savedVault.find(item => item.content === text)) {
      const newNote = { 
        id: Date.now().toString(), 
        heading: `Community Insight from ${author}`, 
        content: text 
      };
      localStorage.setItem(vaultKey, JSON.stringify([newNote, ...savedVault]));
      triggerToast("Insight saved to your Vault!");
    } else {
      triggerToast("Already saved in your Vault.", "error");
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto bg-civil-card border border-civil-border rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in duration-300 relative">
      
      {/* 🚀 CUSTOM ALERT / TOAST */}
      {toast.show && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl border ${
            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/90 border-rose-500/50 text-rose-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold text-sm tracking-wide text-white">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between z-10 shadow-sm shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-500/20 text-brand-400 rounded-xl flex items-center justify-center border border-brand-500/30 shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Global Doubt Clearance</h2>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Discussion Room
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 shrink-0">
          <Bot size={14} className="text-brand-400" /> Type <span className="text-brand-400 px-1 bg-brand-500/10 rounded">@AE Chettan</span> to ask the AI Tutor
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-900/30 custom-scrollbar relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <MessageSquare size={48} className="opacity-20" />
            <p className="font-semibold text-center">No discussions yet. Ask a question and tag @AE Chettan!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === localUser.id;
            const isAI = msg.isAI;
            const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

            return (
              <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                  <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${isMe ? 'text-brand-400' : isAI ? 'text-amber-400' : 'text-sky-400'}`}>
                      {isAI && <Bot size={12} />} {isMe ? 'You' : msg.userName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock size={10} /> {formatTime(msg.timestamp)} {msg.isEdited && '(Edited)'}
                    </span>
                  </div>
                )}
                
                <div className={`relative flex items-center gap-2 max-w-[90%] md:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* The Message Bubble */}
                  <div className={`p-4 rounded-2xl text-sm md:text-base leading-relaxed ${
                    isMe 
                      ? 'bg-brand-600 text-slate-950 font-medium rounded-tr-sm shadow-[0_5px_15px_rgba(245,158,11,0.2)]' 
                      : isAI
                      ? 'bg-slate-950 border border-brand-500/30 text-slate-200 rounded-tl-sm shadow-lg'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm shadow-md'
                  }`}>
                    {editingMsgId === msg.id ? (
                      <div className="flex flex-col gap-2 min-w-[250px]">
                        <textarea 
                          value={editContent} 
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-sm resize-none focus:outline-none focus:border-brand-500"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingMsgId(null)} className="p-1.5 bg-rose-500/20 text-rose-500 rounded hover:bg-rose-500 hover:text-white transition"><X size={14}/></button>
                          <button onClick={() => handleUpdateMessage(msg.id)} className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500 hover:text-white transition"><Check size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className={`prose prose-sm max-w-none ${isMe ? 'prose-p:text-slate-950 prose-strong:text-slate-900' : 'prose-invert'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Hover Actions Menu */}
                  {!editingMsgId && (
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <button onClick={() => handleSaveToVault(msg.text, msg.userName)} title="Save to Vault" className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 rounded-full shadow-sm transition"><BookmarkPlus size={14} /></button>
                      {isMe && (
                        <>
                          <button onClick={() => initiateEdit(msg)} title="Edit Message" className="p-2 text-slate-400 hover:text-sky-400 bg-slate-900 border border-slate-800 rounded-full shadow-sm transition"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteMessage(msg.id)} title="Delete Message" className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-full shadow-sm transition"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
        
        {/* AI Typing Indicator */}
        {isAITyping && (
          <div className="flex flex-col items-start animate-in slide-in-from-bottom-2">
             <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1 text-amber-400">
                  <Bot size={12} /> AE Chettan
                </span>
              </div>
             <div className="bg-slate-950 border border-brand-500/30 p-4 rounded-2xl rounded-tl-sm shadow-lg flex gap-2 items-center">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 md:p-4 shrink-0 relative">
        
        {/* 🚀 NEW: @AE Chettan Mention Popup */}
        {showMentionPopup && (
          <div className="absolute bottom-[calc(100%+10px)] left-4 bg-slate-800 border border-brand-500/40 p-2 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 z-50">
            <button 
              onClick={insertMention}
              className="flex items-center gap-3 w-full p-2 hover:bg-slate-700 rounded-lg text-left transition"
            >
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none mb-1">AE Chettan</p>
                <p className="text-xs text-slate-400 leading-none">Ask the AI Tutor a question</p>
              </div>
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 relative items-end">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Ask a doubt... Type @ for AI"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 md:px-5 md:py-4 text-white focus:border-brand-500 outline-none transition shadow-inner placeholder:text-slate-500 resize-none min-h-[50px] max-h-[150px] custom-scrollbar"
            disabled={isSending}
            rows={Math.min(4, newMessage.split('\n').length || 1)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="h-full min-h-[50px] md:min-h-[56px] bg-brand-500 hover:bg-brand-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 px-5 md:px-6 rounded-xl font-black transition active:scale-95 flex items-center justify-center shadow-lg shrink-0"
          >
            {isSending ? <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div> : <Send size={20} />}
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-500 font-medium tracking-wide">Press Shift + Enter for a new line</span>
        </div>
      </div>
    </div>
  );
}