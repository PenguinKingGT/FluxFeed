import { browser } from 'wxt/browser';
import type { BackgroundMessage, Message, MessageResponse } from '@/lib/types';

export type StoreMessage = Message | BackgroundMessage;

export interface RuntimeMessenger {
  sendMessage(message: StoreMessage): Promise<MessageResponse>;
}

export interface StoreMessageClient {
  send<T = unknown>(message: StoreMessage): Promise<MessageResponse<T>>;
}

export function createRuntimeMessageClient(runtime: RuntimeMessenger): StoreMessageClient {
  return {
    async send<T = unknown>(message: StoreMessage) {
      try {
        return await runtime.sendMessage(message) as MessageResponse<T>;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

const defaultRuntime = browser?.runtime ?? {
  async sendMessage() {
    return { success: false, error: 'Browser runtime is unavailable' };
  },
};

export const messageClient = createRuntimeMessageClient(defaultRuntime as RuntimeMessenger);
