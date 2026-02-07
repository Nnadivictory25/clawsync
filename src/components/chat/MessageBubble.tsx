import ReactMarkdown from 'react-markdown';
import './MessageBubble.css';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-bubble ${role}`}>
      <div className="message-content">
        {role === 'assistant' ? (
          <ReactMarkdown
            components={{
              // Custom renderers for markdown elements
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="inline-code">{children}</code>
                ) : (
                  <pre className="code-block">
                    <code>{children}</code>
                  </pre>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
      </div>
      <span className="message-time">{formattedTime}</span>
    </div>
  );
}
