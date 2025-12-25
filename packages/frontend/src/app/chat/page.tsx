'use client';

import { useState, useEffect, useRef } from 'react';
import { chatApi } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sql_query?: string;
  query_result?: any[];
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions for empty state
  const suggestedQuestions = [
    '顯示所有進行中的 OKR',
    '本月有哪些 KPI 未達標？',
    '我有哪些待處理的任務？',
    '顯示最近的緊急事件',
    '查看所有高優先級的策略專案',
  ];

  useEffect(() => {
    loadConversations();
    loadModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await chatApi.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await chatApi.getModels();
      setModels(response.data.models);
      setSelectedModel(response.data.defaultModel);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await chatApi.getConversation(conversationId);
      setMessages(response.data);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('確定要刪除此對話嗎？')) {
      return;
    }

    try {
      await chatApi.deleteConversation(conversationId);
      setConversations(conversations.filter(c => c.id !== conversationId));

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('刪除對話失敗');
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();

    if (!textToSend) {
      return;
    }

    try {
      setLoading(true);

      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: 'temp-user',
        role: 'user',
        content: textToSend,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMessage]);
      setInputMessage('');

      // Send to API
      const response = await chatApi.sendMessage({
        message: textToSend,
        conversationId: currentConversationId,
        model: selectedModel,
      });

      // Update conversation ID if it's a new conversation
      if (!currentConversationId && response.data.conversationId) {
        setCurrentConversationId(response.data.conversationId);
        await loadConversations(); // Reload conversation list
      }

      // Remove temp message and add actual messages
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== 'temp-user');
        return [
          ...withoutTemp,
          tempUserMessage,
          {
            id: 'temp-assistant',
            role: 'assistant',
            content: response.data.response,
            sql_query: response.data.sqlQuery,
            query_result: response.data.queryResult,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || '發送訊息失敗';

      // Check for quota exceeded error
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
        // Show quota error as AI message instead of alert
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== 'temp-user');
          return [
            ...withoutTemp,
            { ...prev.find(m => m.id === 'temp-user')!, id: 'user-' + Date.now() },
            {
              id: 'error-' + Date.now(),
              role: 'assistant' as const,
              content: `⚠️ **API 配額超限通知**

目前 Google Gemini API 的免費配額已用完（每天 20 次請求限制）。

**解決方案：**

1. **等待配額重置** - 免費配額會在一段時間後自動重置
2. **稍後再試** - 建議等待約 30 秒後重試
3. **升級付費方案** - 前往 Google AI Studio 設定付費方案以獲得更高配額

如有問題，請聯繫系統管理員。`,
              created_at: new Date().toISOString(),
            },
          ];
        });
      } else {
        alert(errorMessage);
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
      }
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Conversation List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={startNewConversation}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + 新對話
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center text-gray-500">載入中...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">尚無對話記錄</div>
          ) : (
            <div className="p-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`mb-2 p-3 rounded-lg cursor-pointer transition-colors group ${
                    currentConversationId === conv.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {conv.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(conv.updated_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🤖 AI 小幫手</h1>
              <p className="text-sm text-gray-600 mt-1">
                詢問系統資料相關的問題，AI 會從資料庫中查找答案
              </p>
            </div>
            {models.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">AI 模型:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto mt-12">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">歡迎使用 AI 小幫手</h2>
                <p className="text-gray-600">
                  您可以用自然語言詢問系統資料，例如：
                </p>
              </div>

              <div className="grid gap-3">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    disabled={loading}
                    className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700">{question}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* Show SQL query if available */}
                    {message.sql_query && (
                      <details className="mt-3 pt-3 border-t border-gray-200">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                          查看 SQL 查詢
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                          <code>{message.sql_query}</code>
                        </pre>
                      </details>
                    )}

                    {/* Show query results if available */}
                    {message.query_result && message.query_result.length > 0 && (
                      <details className="mt-3 pt-3 border-t border-gray-200">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                          查看查詢結果 ({message.query_result.length} 筆)
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                {Object.keys(message.query_result[0]).map((key) => (
                                  <th key={key} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {message.query_result.slice(0, 10).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b">
                                  {Object.values(row).map((value: any, colIndex) => (
                                    <td key={colIndex} className="px-3 py-2 text-gray-600">
                                      {value !== null && value !== undefined
                                        ? typeof value === 'object'
                                          ? JSON.stringify(value)
                                          : String(value)
                                        : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {message.query_result.length > 10 && (
                            <div className="mt-2 text-xs text-gray-500 text-center">
                              顯示前 10 筆，共 {message.query_result.length} 筆資料
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="輸入您的問題..."
                disabled={loading}
                rows={3}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !inputMessage.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium h-[88px]"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  '發送'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
