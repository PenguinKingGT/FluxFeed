/** Internal seam shared by SDK production and deterministic test adapters. */
export interface AiCompletionClient {
  complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string>;
}

export interface AiMessage {
  role: 'system' | 'user';
  content: string;
}

export interface AiCompletionOptions {
  maxTokens?: number;
}
