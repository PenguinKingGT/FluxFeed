import type { Message, MessageResponse } from '@/lib/types/message';

export function createMessageResponse<T>(data: T): MessageResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createUnsupportedActionResponse(message: Message): MessageResponse {
  return {
    success: false,
    error: `Unsupported action: ${message.action}`,
  };
}
