import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import ragEngine from './rag-engine';
import deepseekClient from './deepseek-api';

function App() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(true);

    const chatContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [inputValue]);

    const handleApiKeySubmit = () => {
        if (apiKey.trim()) {
            deepseekClient.setApiKey(apiKey.trim());
            setShowApiKeyInput(false);
            addSystemMessage('تم تعيين مفتاح API بنجاح! يمكنك الآن رفع ملفات PDF والبدء في المحادثة.');
        }
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        const pdfFiles = files.filter(file => file.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            addSystemMessage('⚠️ الرجاء رفع ملفات PDF فقط.');
            return;
        }

        setIsProcessing(true);
        addSystemMessage(`⏳ جاري معالجة ${pdfFiles.length} ملف PDF...`);

        try {
            // Initialize RAG engine if not already initialized
            await ragEngine.initialize();

            for (const file of pdfFiles) {
                const result = await ragEngine.addDocument(file);
                setUploadedFiles(prev => [...prev, {
                    name: file.name,
                    chunksCount: result.chunksAdded,
                    uploadDate: new Date()
                }]);
            }

            addSystemMessage(
                `✅ تمت معالجة ${pdfFiles.length} ملف بنجاح! تم إنشاء ${uploadedFiles.length > 0 ? 'المزيد من' : ''} قاعدة المعرفة.`
            );
        } catch (error) {
            console.error('Error processing files:', error);
            addSystemMessage(`❌ خطأ في معالجة الملفات: ${error.message}`);
        } finally {
            setIsProcessing(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const addSystemMessage = (content) => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            content,
            timestamp: new Date()
        }]);
    };

    const addMessage = (type, content) => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            type,
            content,
            timestamp: new Date()
        }]);
    };

    const handleSendMessage = async () => {
        const message = inputValue.trim();
        if (!message || isLoading) return;

        // Check if API key is set
        if (!deepseekClient.apiKey) {
            addSystemMessage('⚠️ الرجاء إدخال مفتاح DeepSeek API أولاً.');
            return;
        }

        // Add user message
        addMessage('user', message);
        setInputValue('');
        setIsLoading(true);

        try {
            // Search for relevant context using RAG
            let context = [];
            if (ragEngine.getDocumentCount() > 0) {
                context = await ragEngine.search(message, 3);
            }

            // Get response from DeepSeek
            const response = await deepseekClient.chat(message, context);

            // Add assistant message
            addMessage('assistant', response);
        } catch (error) {
            console.error('Error getting response:', error);
            addMessage('assistant', `❌ عذراً، حدث خطأ: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const renderWelcomeScreen = () => (
        <div className="welcome-screen">
            <div className="welcome-icon">⚖️</div>
            <div>
                <h1 className="welcome-title">مساعد القوانين العمانية</h1>
                <p className="welcome-subtitle">
                    مساعد ذكي متخصص في القوانين العمانية باستخدام تقنية RAG المتقدمة
                </p>
            </div>

            <div className="welcome-features">
                <div className="feature-card">
                    <div className="feature-icon">📄</div>
                    <div className="feature-title">رفع المستندات</div>
                    <div className="feature-description">
                        ارفع ملفات PDF الخاصة بالقوانين العمانية
                    </div>
                </div>

                <div className="feature-card">
                    <div className="feature-icon">🔍</div>
                    <div className="feature-title">البحث الذكي</div>
                    <div className="feature-description">
                        نظام بحث متقدم يفهم سياق أسئلتك
                    </div>
                </div>

                <div className="feature-card">
                    <div className="feature-icon">💬</div>
                    <div className="feature-title">إجابات دقيقة</div>
                    <div className="feature-description">
                        إجابات مفصلة بناءً على المستندات المرفوعة
                    </div>
                </div>
            </div>

            {showApiKeyInput && (
                <div className="api-key-input-container" style={{
                    marginTop: '2rem',
                    maxWidth: '500px',
                    width: '100%',
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center'
                }}>
                    <input
                        type="password"
                        placeholder="أدخل مفتاح DeepSeek API"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-arabic)',
                            fontSize: '0.9375rem'
                        }}
                    />
                    <button
                        onClick={handleApiKeySubmit}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--accent-primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontFamily: 'var(--font-arabic)',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        حفظ
                    </button>
                </div>
            )}
        </div>
    );

    const renderMessage = (msg) => {
        if (msg.type === 'system') {
            return (
                <div key={msg.id} className="processing-indicator">
                    {msg.content}
                </div>
            );
        }

        return (
            <div key={msg.id} className={`message ${msg.type}`}>
                <div className="message-header">
                    <div className="message-avatar">
                        {msg.type === 'user' ? '👤' : '🤖'}
                    </div>
                    <span>{msg.type === 'user' ? 'أنت' : 'المساعد القانوني'}</span>
                </div>
                <div className="message-content">
                    {msg.content}
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <h1 className="header-title">مساعد القوانين العمانية</h1>

                <div className="file-upload-section">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        disabled={isProcessing}
                    />
                    <button
                        className="file-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                    >
                        <span>📁</span>
                        <span>{isProcessing ? 'جاري المعالجة...' : 'رفع ملفات PDF'}</span>
                    </button>
                    {uploadedFiles.length > 0 && (
                        <span className="file-count">
                            {uploadedFiles.length} {uploadedFiles.length === 1 ? 'ملف' : 'ملفات'}
                        </span>
                    )}
                </div>
            </header>

            {/* Chat Container */}
            <div className="chat-container" ref={chatContainerRef}>
                {messages.length === 0 ? renderWelcomeScreen() : messages.map(renderMessage)}

                {isLoading && (
                    <div className="message assistant">
                        <div className="message-header">
                            <div className="message-avatar">🤖</div>
                            <span>المساعد القانوني</span>
                        </div>
                        <div className="loading-dots">
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="input-container">
                <div className="input-wrapper">
                    <textarea
                        ref={textareaRef}
                        className="message-input"
                        placeholder="اكتب سؤالك عن القوانين العمانية..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputValue.trim()}
                    >
                        <span>إرسال</span>
                        <span>➤</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
