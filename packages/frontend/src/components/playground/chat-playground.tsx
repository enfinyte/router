"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ModelSelector } from "./model-selector";
import { ApiKeySelector } from "./api-key-selector";
import { SettingsPanel } from "./settings-panel";
import {
  sendStreamingMessage,
  type PlaygroundMessage,
  type PlaygroundSettings,
} from "@/lib/api/playground";
import { RotateCcw, PanelRightOpen, PanelRightClose } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ChatPlayground() {
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [model, setModel] = useState("auto/auto");
  const [apiKey, setApiKey] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<PlaygroundSettings>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastResponseIdRef = useRef<string | undefined>(undefined);

  const handleNewChat = useCallback(() => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
    lastResponseIdRef.current = undefined;
  }, [isStreaming]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!apiKey) {
        toast.error("Please set an API key first");
        return;
      }

      if (!model) {
        toast.error("Please select a model");
        return;
      }

      const userMessage: PlaygroundMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: PlaygroundMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = await sendStreamingMessage(
        {
          apiKey,
          model,
          input: content,
          previousResponseId: lastResponseIdRef.current,
          settings,
        },
        {
          onTextDelta: (delta) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + delta }
                  : msg,
              ),
            );
          },
          onComplete: (response) => {
            lastResponseIdRef.current = response.id;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content:
                        response.outputText.length >= msg.content.length
                          ? response.outputText
                          : msg.content,
                      isStreaming: false,
                      model: response.model,
                      responseId: response.id,
                      usage: response.usage,
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
          },
          onError: (error) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: msg.content || `Error: ${error}`,
                      isStreaming: false,
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
            toast.error("Error", { description: error });
          },
        },
      );

      abortControllerRef.current = controller;
    },
    [apiKey, model, settings],
  );

  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (isStreaming || !apiKey || !model) return;

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex < 0) return;

      const userMsg = messages
        .slice(0, msgIndex)
        .reverse()
        .find((m) => m.role === "user");
      if (!userMsg) return;

      const prevAssistant = messages
        .slice(0, msgIndex)
        .reverse()
        .find((m) => m.role === "assistant" && m.responseId);

      const trimmed = messages.slice(0, msgIndex);
      const newAssistantId = `assistant-${Date.now()}`;
      const newAssistant: PlaygroundMessage = {
        id: newAssistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages([...trimmed, newAssistant]);
      setIsStreaming(true);
      lastResponseIdRef.current = prevAssistant?.responseId;

      sendStreamingMessage(
        {
          apiKey,
          model,
          input: userMsg.content,
          previousResponseId: prevAssistant?.responseId,
          settings,
        },
        {
          onTextDelta: (delta) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === newAssistantId
                  ? { ...msg, content: msg.content + delta }
                  : msg,
              ),
            );
          },
          onComplete: (response) => {
            lastResponseIdRef.current = response.id;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === newAssistantId
                  ? {
                      ...msg,
                      content:
                        response.outputText.length >= msg.content.length
                          ? response.outputText
                          : msg.content,
                      isStreaming: false,
                      model: response.model,
                      responseId: response.id,
                      usage: response.usage,
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
          },
          onError: (error) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === newAssistantId
                  ? {
                      ...msg,
                      content: msg.content || `Error: ${error}`,
                      isStreaming: false,
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
            toast.error("Error", { description: error });
          },
        },
      ).then((controller) => {
        abortControllerRef.current = controller;
      });
    },
    [apiKey, model, settings, messages, isStreaming],
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg,
      ),
    );
    setIsStreaming(false);
  }, []);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-wrap">
          <ModelSelector value={model} onChange={setModel} />

          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

          <ApiKeySelector value={apiKey} onChange={setApiKey} />

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={handleNewChat}
              title="New chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 cursor-pointer", showSettings && "bg-accent")}
              onClick={() => setShowSettings(!showSettings)}
              title={showSettings ? "Hide settings" : "Show settings"}
            >
              {showSettings ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <MessageList messages={messages} onRegenerate={handleRegenerate} />

        <MessageInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={!apiKey}
        />
      </div>

      {showSettings && (
        <div className="w-[280px] shrink-0 hidden md:flex">
          <SettingsPanel settings={settings} onChange={setSettings} />
        </div>
      )}
    </div>
  );
}
