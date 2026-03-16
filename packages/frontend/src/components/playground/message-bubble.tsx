"use client";

import { memo, useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { PlaygroundMessage } from "@/lib/api/playground";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function CodeBlock({
  language,
  children,
}: {
  language: string | undefined;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [children]);

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-1.5 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">
          {language ?? "text"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language ?? "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8125rem",
          lineHeight: "1.5",
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

const MarkdownContent = memo(function MarkdownContent({
  content,
}: {
  content: string;
}) {
  const components = useMemo(
    () => ({
      code: ({
        className,
        children,
        ...props
      }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
        const match = /language-(\w+)/.exec(className ?? "");
        const codeString = String(children).replace(/\n$/, "");

        if (match) {
          return <CodeBlock language={match[1]} children={codeString} />;
        }

        return (
          <code
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]"
            {...props}
          >
            {children}
          </code>
        );
      },
      pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
      p: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="mb-2 last:mb-0 leading-relaxed" {...props}>
          {children}
        </p>
      ),
      ul: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="mb-2 ml-4 list-disc space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({
        children,
        ...props
      }: React.OlHTMLAttributes<HTMLOListElement>) => (
        <ol className="mb-2 ml-4 list-decimal space-y-1" {...props}>
          {children}
        </ol>
      ),
      li: ({
        children,
        ...props
      }: React.LiHTMLAttributes<HTMLLIElement>) => (
        <li className="leading-relaxed" {...props}>
          {children}
        </li>
      ),
      h1: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 className="text-xl font-semibold mb-2 mt-4 first:mt-0" {...props}>
          {children}
        </h1>
      ),
      h2: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0" {...props}>
          {children}
        </h2>
      ),
      h3: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3
          className="text-base font-semibold mb-2 mt-3 first:mt-0"
          {...props}
        >
          {children}
        </h3>
      ),
      blockquote: ({
        children,
        ...props
      }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
        <blockquote
          className="border-l-2 border-border pl-4 italic text-muted-foreground mb-2"
          {...props}
        >
          {children}
        </blockquote>
      ),
      table: ({
        children,
        ...props
      }: React.TableHTMLAttributes<HTMLTableElement>) => (
        <div className="my-2 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm" {...props}>
            {children}
          </table>
        </div>
      ),
      th: ({
        children,
        ...props
      }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
        <th
          className="border-b border-border bg-muted/50 px-3 py-2 text-left font-medium"
          {...props}
        >
          {children}
        </th>
      ),
      td: ({
        children,
        ...props
      }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
        <td className="border-b border-border px-3 py-2" {...props}>
          {children}
        </td>
      ),
      a: ({
        children,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          className="text-primary underline underline-offset-2 hover:text-primary/80"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      ),
      hr: () => <hr className="my-4 border-border" />,
    }),
    [],
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
});

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="p-1.5 rounded-md transition-colors cursor-pointer text-muted-foreground/60 hover:text-foreground hover:bg-muted"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

interface MessageBubbleProps {
  message: PlaygroundMessage;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [message.content]);

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 px-4 py-4">
        <div className="flex flex-col items-end gap-1 max-w-[85%] min-w-0">
          <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="text-sm text-foreground leading-relaxed">
        <MarkdownContent content={message.content} />
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>

      {!message.isStreaming && message.content && (
        <div className="flex items-center gap-0.5 mt-3">
          <ActionButton
            icon={Copy}
            label="Copy"
            onClick={handleCopyMessage}
          />
          {onRegenerate && (
            <ActionButton
              icon={RefreshCw}
              label="Regenerate"
              onClick={onRegenerate}
            />
          )}

          {message.model && (
            <div className="flex items-center gap-2 ml-2 text-[10px] text-muted-foreground/60">
              <span className="font-mono">{message.model}</span>
              {message.usage && (
                <>
                  <span>·</span>
                  <span>
                    {message.usage.input_tokens + message.usage.output_tokens}{" "}
                    tokens
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
