"use client";

import { useRef, useEffect, useMemo } from "react";
import type { PlaygroundMessage } from "@/lib/api/playground";
import { MessageBubble } from "./message-bubble";
import { Bot } from "lucide-react";

interface MessageListProps {
  messages: PlaygroundMessage[];
  onRegenerate?: (messageId: string) => void;
}

export function MessageList({ messages, onRegenerate }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isStreaming = useMemo(
    () => messages.some((m) => m.isStreaming),
    [messages],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isStreaming, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Start a conversation</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Select a model and API key, then type a message below to begin chatting.
        </p>
      </div>
    );
  }

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && !m.isStreaming)?.id;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRegenerate={
              message.id === lastAssistantId && onRegenerate
                ? () => onRegenerate(message.id)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
