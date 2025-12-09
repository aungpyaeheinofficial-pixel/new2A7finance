export enum Sender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system'
}

export enum ModelProvider {
  GROQ = 'Groq (Llama 3.3)',
  GEMINI = 'Gemini 2.5 Flash',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  provider?: ModelProvider; // To show which model answered
  isThinking?: boolean;
  image?: string; // Base64 string for image inputs
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  deepThinkMode: boolean; // The toggle state
}

export interface RagDocument {
  title: string;
  content: string;
  relevance: number;
}

export interface RouterRequest {
  message: string;
  history: Message[];
  useComplexModel: boolean;
  image?: string;
}

export interface RouterResponse {
  text: string;
  provider: ModelProvider;
}