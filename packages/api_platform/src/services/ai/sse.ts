export const encodeSSEEvent = (eventType: string, data: object): string =>
  `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

export const encodeSSEDone = (): string => "data: [DONE]\n\n";

export const encodeSSEToUint8Array = (sse: string): Uint8Array =>
  new TextEncoder().encode(sse);
