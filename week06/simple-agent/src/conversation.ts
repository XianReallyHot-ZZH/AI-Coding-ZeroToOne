import { Message, UserMessage, AssistantMessage, MessagePart } from "./types.js";

// ============================================
// Conversation Manager
// ============================================

export class ConversationManager {
  private messages: Message[] = [];
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
  }

  addUserMessage(content: string): UserMessage {
    const message: UserMessage = {
      id: this.generateId(),
      role: "user",
      content,
    };
    this.messages.push(message);
    return message;
  }

  addAssistantMessage(parts: MessagePart[]): AssistantMessage {
    const message: AssistantMessage = {
      id: this.generateId(),
      role: "assistant",
      parts,
    };
    this.messages.push(message);
    return message;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getLastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  clear(): void {
    this.messages = [];
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
