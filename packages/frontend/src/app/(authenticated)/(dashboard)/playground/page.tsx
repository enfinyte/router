"use client";

import { ChatPlayground } from "@/components/playground/chat-playground";

export default function PlaygroundPage() {
  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
      <ChatPlayground />
    </div>
  );
}
