import { useState, useRef, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MessageBubble } from './MessageBubble';
import './AgentChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AgentChatProps {
  sessionId: string;
  threadId: string | null;
  onThreadChange: (threadId: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function AgentChat({
  sessionId,
  threadId,
  onThreadChange,
  placeholder = 'Ask me anything...',
  maxLength = 4000,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useAction(api.chat.send);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (trimmedInput.length > maxLength) {
      setError(`Message too long. Maximum ${maxLength} characters.`);
      return;
    }

    setError(null);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await sendMessage({
        threadId: threadId ?? undefined,
        message: trimmedInput,
        sessionId,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.response) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (result.threadId && result.threadId !== threadId) {
          onThreadChange(result.threadId);
        }
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Send error:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('clawsync_thread_id');
    onThreadChange('');
  };

  return (
    <div className="agent-chat">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation with the agent.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))
        )}

        {isLoading && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <form className="input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="chat-input"
          disabled={isLoading}
          maxLength={maxLength}
        />
        <button
          type="submit"
          className="send-button btn btn-primary"
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {messages.length > 0 && (
        <button className="clear-button btn btn-ghost" onClick={handleClearChat}>
          Clear conversation
        </button>
      )}
    </div>
  );
}
