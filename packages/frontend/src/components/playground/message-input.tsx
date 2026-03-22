"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isStreaming) return;
        handleSubmit();
      }
    },
    [handleSubmit, isStreaming],
  );

  return (
    <div className="border-t border-border bg-background px-3 sm:px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-2.5",
            "focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20 transition-all",
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground",
              "min-h-[1.5rem] max-h-[200px]",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          />

          {isStreaming ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8 shrink-0 rounded-full cursor-pointer"
              onClick={onStop}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full cursor-pointer"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
