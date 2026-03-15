/**
 * Session Management
 */

import { v4 as uuidv4 } from "uuid"
import type { Session, Message, MessageContent, ModelConfig, Tool, SessionStatus } from "../types/index.js"

export interface SessionOptions {
  id?: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
  initialMessages?: Message[]
}

export class SessionManager {
  /**
   * Create a new session
   */
  static create(options: SessionOptions = {}): Session {
    const modelConfig: ModelConfig = {
      model: options.model ?? "gpt-4o",
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    }

    return {
      id: options.id ?? uuidv4(),
      messages: options.initialMessages ?? [],
      systemPrompt: options.systemPrompt,
      model: modelConfig,
      tools: options.tools ?? [],
      status: "idle",
    }
  }

  /**
   * Add a user message to the session
   */
  static addUserMessage(session: Session, content: string): Message {
    const message: Message = {
      id: uuidv4(),
      role: "user",
      content: [{ type: "text", text: content }],
      createdAt: new Date(),
    }
    session.messages.push(message)
    return message
  }

  /**
   * Add an assistant message to the session
   */
  static addAssistantMessage(session: Session, content: MessageContent[]): Message {
    const message: Message = {
      id: uuidv4(),
      role: "assistant",
      content,
      createdAt: new Date(),
    }
    session.messages.push(message)
    return message
  }

  /**
   * Add a tool result message to the session
   */
  static addToolMessage(session: Session, content: MessageContent[]): Message {
    const message: Message = {
      id: uuidv4(),
      role: "tool",
      content,
      createdAt: new Date(),
    }
    session.messages.push(message)
    return message
  }

  /**
   * Update session status
   */
  static setStatus(session: Session, status: SessionStatus): void {
    session.status = status
  }

  /**
   * Get the last message from the session
   */
  static getLastMessage(session: Session): Message | undefined {
    return session.messages[session.messages.length - 1]
  }

  /**
   * Clear all messages from the session
   */
  static clearMessages(session: Session): void {
    session.messages = []
  }

  /**
   * Get messages in a format suitable for LLM context
   */
  static getContextMessages(session: Session): Message[] {
    return [...session.messages]
  }

  /**
   * Calculate total token usage estimate (rough estimate based on message count)
   */
  static getMessageCount(session: Session): number {
    return session.messages.length
  }
}
