/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

// automation-execution.service.ts - Enhanced with Conditions Support
import { db } from "../db";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { sql } from "drizzle-orm";
import {
  automations,
  automationNodes,
  automationExecutions,
  automationExecutionLogs,
  automationEdges,
  contacts,
  messages,
  templates,
  channels,
  groups,
  aiSettings,
  sites,
  users,
  voiceProfiles,
} from "@shared/schema";
import OpenAI from "openai";
import { searchTrainingData } from "./training.service";
import { VoiceManager } from "./voice";
import { eq, and } from "drizzle-orm";
import { sendBusinessMessage } from "../services/messageService";
import { WhatsAppApiService } from "./whatsapp-api";
import { storage } from "server/storage";
import { BaileysManager } from "./baileys-manager";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import * as mysql from "mysql2/promise";

interface ExecutionContext {
  executionId: string;
  automationId: string;
  contactId?: string;
  conversationId?: string;
  variables: Record<string, any>;
  triggerData: any;
  lastUserMessage?: string; // Add this to track user input for conditions
}

interface PendingExecution {
  executionId: string;
  automationId: string;
  nodeId: string;
  nodeType?: string;
  conversationId: string;
  contactId?: string;
  context: ExecutionContext;
  saveAs?: string;
  timestamp: Date;
  status: 'waiting_for_response';
  expectedButtons?: any[];
}

export class AutomationExecutionService {
  private pendingExecutions = new Map<string, PendingExecution>();

  /**
   * Start automation execution (called from your controller)
   */
  async executeAutomation(executionId: string) {
    console.log(`Starting execution: ${executionId}`);
    
    try {
      // Get execution record
      const execution = await db.query.automationExecutions.findFirst({
        where: eq(automationExecutions.id, executionId),
      });

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Get automation with nodes and edges
      const automation = await this.getAutomationWithFlow(execution.automationId);
      if (!automation) {
        throw new Error(`Automation ${execution.automationId} not found`);
      }

      // Update execution count
      await db.update(automations)
        .set({ 
          executionCount: automation.executionCount !== null ? automation.executionCount + 1 : null,
          lastExecutedAt: new Date()
        })
        .where(eq(automations.id, execution.automationId));

      // Create execution context
      const triggerData = execution.triggerData ?? {};

      let contactVars: Record<string, any> = {};
      if (execution.contactId) {
        try {
          const contactRow = await db.query.contacts.findFirst({
            where: eq(contacts.id, execution.contactId),
          });
          if (contactRow) {
            contactVars = {
              name: contactRow.name,
              phone: contactRow.phone,
              email: contactRow.email || "",
              incoming_name: contactRow.name,
              incoming_phone: contactRow.phone,
              incoming_email: contactRow.email || "",
              contact_name: contactRow.name,
              contact_phone: contactRow.phone,
              contact_email: contactRow.email || "",
              ...(contactRow.variables && typeof contactRow.variables === "object" ? contactRow.variables : {})
            };
          }
        } catch (cErr) {
          console.warn(`[Automation ${execution.automationId}] Failed to fetch trigger contact for variables:`, cErr);
        }
      }

      const context: ExecutionContext = {
        executionId: execution.id,
        automationId: execution.automationId,
        contactId: execution.contactId ?? undefined,
        conversationId: execution.conversationId ?? undefined,
        variables: {
          contactId: execution.contactId ?? undefined,
          conversationId: execution.conversationId ?? undefined,
          ...contactVars,
          ...(triggerData as any)
        },
        triggerData,
        lastUserMessage:
          (execution.triggerData as { message?: { content?: string; text?: string } }).message
            ?.content ||
          (execution.triggerData as { message?: { content?: string; text?: string } }).message
            ?.text ||
          "",
    };

      // Get first node: find the target of the edge coming from the virtual 'start' node.
      const startEdge = automation.edges.find((e: any) => e.sourceNodeId === 'start');
      let firstNode = null;
      if (startEdge) {
        firstNode = automation.nodes.find((n: any) => n.nodeId === startEdge.targetNodeId);
      }

      // Fallback to original logic if start edge is missing
      if (!firstNode) {
        const nodeIdSet = new Set(automation.nodes.map((n: any) => n.nodeId));
        const realEdges = automation.edges.filter(
          (e: any) => nodeIdSet.has(e.sourceNodeId) && nodeIdSet.has(e.targetNodeId)
        );
        firstNode = automation.nodes.find(
          (n: any) => !realEdges.some((e: any) => e.targetNodeId === n.nodeId)
        );
      }

      if (firstNode) {
        await this.executeNode(firstNode, automation, context);
      } else {
        await this.completeExecution(executionId, 'completed', 'No start node found');
      }

    } catch (error) {
      console.error(`Error executing automation ${executionId}:`, error);
      await this.completeExecution(executionId, 'failed',  (error as Error).message);
      throw error;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: any, automation: any, context: ExecutionContext) {
    const startTime = new Date();
    console.log(`Executing node ${node.nodeId} (${node.type})`);

    try {
      // Log node start
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        'running',
        node.data,
        null,
        null
      );

      let result: any = null;

      // Execute based on node type
      switch (node.type) {
        case 'custom_reply':
          result = await this.executeCustomReply(node, context);
          break;
          
        case 'user_reply':
          result = await this.executeUserReply(node, context);
          break;

        case 'wait_reply':
          result = await this.executeWaitReply(node, context);
          break;
          
        case 'time_gap':
          result = await this.executeTimeGap(node, context);
          return; // Time gap handles its own continuation
          
        case 'send_template':
          result = await this.executeSendTemplate(node, context);
          break;
          
        case 'assign_user':
          result = await this.executeAssignUser(node, context);
          break;

        case 'conditions':
          result = await this.executeConditions(node, automation, context);
          return; // Conditions handle their own routing

        case 'add_to_group':
          result = await this.executeAddToGroup(node, context);
          break;

        case 'update_contact':
          result = await this.executeUpdateContact(node, context);
          break;

        case 'set_variable':
          result = await this.executeSetVariable(node, context);
          break;

        case 'send_location':
          result = await this.executeSendLocation(node, context);
          break;

        case 'send_list_message':
          result = await this.executeSendListMessage(node, context);
          break;

        case 'send_media':
          result = await this.executeSendMedia(node, context);
          break;

        case 'mark_as_read':
          result = await this.executeMarkAsRead(node, context);
          break;

        case 'webhook':
          result = await this.executeWebhook(node, context);
          break;

        case 'mysql':
          result = await this.executeMySQL(node, context);
          break;

        case 'ai_answer':
          result = await this.executeAIAnswer(node, context);
          break;

        case 'ai_agent':
          result = await this.executeAIAgent(node, context);
          break;

        case 'send_contact_message':
          result = await this.executeSendContactMessage(node, context);
          break;

        case 'end':
          result = { action: 'flow_ended' };
          break;
          
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Log success
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        'completed',
        node.data,
        result,
        null
      );

      // Save execution variables to the database
      await db.update(automationExecutions)
        .set({ variables: context.variables })
        .where(eq(automationExecutions.id, context.executionId));

      if (result?.action === 'execution_paused') {
        console.log(`⏸️  Node ${node.nodeId} paused execution, not continuing to next node`);
        return;
      }

      // Continue to next node
      await this.continueToNextNode(node, automation, context);

    } catch (error) {
      console.error(`Error executing node ${node.nodeId}:`, error);
      
      // Log error
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        'failed',
        node.data,
        null,
        (error as Error).message
      );

      // Fail the entire execution
      await this.completeExecution(context.executionId, 'failed', `Node ${node.nodeId} failed: ${ (error as Error).message}`);
      throw error;
    }
  }

  /**
   * Execute conditions node - NEW
   */

  // Normalize + basic stemming
private normalizeText(text: string = ""): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")   // Unicode-safe: remove punctuation, symbols & emojis but keep letters/numbers from any language
    .replace(/\s+/g, " ")
    .trim();
}

private stemWord(word: string = ""): string {
  return word
    .replace(/ing$|ed$|s$/g, "")   // interest vs interested
    .trim();
}


  private async executeConditions(node: any, automation: any, context: ExecutionContext) {
    const conditionData = node.data;
    const conditionType = conditionData.conditionType || 'keyword';
    const matchType = conditionData.matchType || 'any';
    const keywords = conditionData.keywords || [];

    console.log(`🔍 Evaluating condition: ${conditionType}, match: ${matchType}, keywords: ${keywords.join(', ')}`);

    let conditionMet = false;
    let matchedKeyword = null;
    let userInput = context.lastUserMessage || '';



    // ✅ NORMALIZED INPUT
  const lowerInput = this.normalizeText(userInput);
  const lowerKeywords = keywords.map((k: string) =>
    this.normalizeText(k)
  );

    switch (conditionType) {

 case "keyword":
    if (matchType === "any") {
      conditionMet = lowerKeywords.some((k: string) =>
        lowerInput.includes(k)
      );
    } 
    else if (matchType === "all") {
      conditionMet = lowerKeywords.every((k: string) =>
        lowerInput.includes(k)
      );
    }
    else if (matchType === "exact") {
      conditionMet = lowerKeywords.includes(lowerInput);
    }
    break;

  // -------------------------
  // EQUALS (fuzzy safe)
  // -------------------------
  case "equals":
    conditionMet = lowerKeywords.some((k: string) =>
      lowerInput === k ||
      this.stemWord(lowerInput) === this.stemWord(k)
    );

    matchedKeyword = conditionMet ? lowerInput : null;
    break;

  // -------------------------
  // STARTS WITH (fuzzy safe)
  // -------------------------
  case "starts_with":
    conditionMet = lowerKeywords.some((k: string) =>
      lowerInput.startsWith(k) ||
      this.stemWord(lowerInput).startsWith(this.stemWord(k))
    );

    matchedKeyword = conditionMet
      ? lowerKeywords.find((k: string) =>
          lowerInput.startsWith(k) ||
          this.stemWord(lowerInput).startsWith(this.stemWord(k))
        )
      : null;

    break;

  // -------------------------
  // CONTAINS (fuzzy safe)
  // -------------------------
  case "contains":
    conditionMet = lowerKeywords.some((k: string) =>
      lowerInput.includes(k) ||
      this.stemWord(lowerInput).includes(this.stemWord(k))
    );

    matchedKeyword = conditionMet
      ? lowerKeywords.find((k: string) =>
          lowerInput.includes(k) ||
          this.stemWord(lowerInput).includes(this.stemWord(k))
        )
      : null;

    break;

  // -------------------------
  // REGEX
  // -------------------------
  case "regex":
    try {
      const pattern = new RegExp(keywords[0] || "", "i");
      conditionMet = pattern.test(userInput);
      matchedKeyword = conditionMet ? keywords[0] : null;
    } catch {
      console.error("Invalid regex pattern:", keywords[0]);
    }
    break;

  // -------------------------
  // VARIABLE
  // -------------------------
  case "variable":
    const variableCondition = keywords[0] || "";
    conditionMet = this.evaluateVariableCondition(
      variableCondition,
      context.variables
    );
    matchedKeyword = conditionMet ? variableCondition : null;
    break;

  default:
    console.warn(`Unknown condition type: ${conditionType}`);
}


    // Update context with condition result
    context.variables.lastConditionResult = conditionMet;
    context.variables.matchedKeyword = matchedKeyword;

    const result = {
      conditionMet,
      matchedKeyword,
      userInput,
      conditionType,
      matchType,
      keywords
    };

    // Log condition evaluation
    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'completed',
      conditionData,
      result,
      null
    );

    console.log(`🎯 Condition ${conditionMet ? 'MET' : 'NOT MET'}: "${matchedKeyword || 'none'}"`);

    // Route based on condition result
    await this.routeFromCondition(node, automation, context, conditionMet);

    return result;
  }

  /**
   * Route execution based on condition result
   */
  private async routeFromCondition(
    conditionNode: any, 
    automation: any, 
    context: ExecutionContext, 
    conditionMet: boolean
  ) {
    const outgoingEdges = automation.edges.filter(
      (e: any) => e.sourceNodeId === conditionNode.nodeId
    );

    if (outgoingEdges.length === 0) {
      console.log(`⚠️  No outgoing edges from condition node ${conditionNode.nodeId}`);
      await this.completeExecution(context.executionId, 'completed', 'Condition evaluated but no next steps defined');
      return;
    }

    const branchHandle = conditionMet ? 'condition-true' : 'condition-false';
    const branchLabel = conditionMet ? 'TRUE' : 'FALSE';

    let selectedEdge: any = null;

    selectedEdge = outgoingEdges.find((e: any) => e.sourceHandle === branchHandle);

    if (!selectedEdge) {
      const oppositeHandle = conditionMet ? 'condition-false' : 'condition-true';
      const labeledOpposite = outgoingEdges.find((e: any) => e.sourceHandle === oppositeHandle);
      const remaining = outgoingEdges.filter((e: any) => e !== labeledOpposite);

      if (remaining.length === 1) {
        selectedEdge = remaining[0];
      } else if (remaining.length > 1) {
        selectedEdge = conditionMet ? remaining[0] : remaining[1];
      } else {
        const unlabeled = outgoingEdges.filter((e: any) => !e.sourceHandle);
        selectedEdge = conditionMet ? unlabeled[0] : (unlabeled.length > 1 ? unlabeled[1] : null);
      }
    }

    if (!selectedEdge) {
      console.log(`🛑 Condition ${branchLabel}: No ${branchLabel} path defined, ending execution`);
      await this.completeExecution(context.executionId, 'completed', `Condition ${branchLabel} and no ${branchLabel} path`);
      return;
    }

    const nextNode = automation.nodes.find((n: any) => n.nodeId === selectedEdge.targetNodeId);

    if (nextNode) {
      console.log(`➡️  Condition ${branchLabel}: Following path to ${nextNode.type} node`);
      await this.executeNode(nextNode, automation, context);
    } else {
      console.warn(`Node ${selectedEdge.targetNodeId} not found for ${branchLabel} path`);
      await this.completeExecution(context.executionId, 'completed', `${branchLabel} path node not found`);
    }
  }

  /**
   * Evaluate variable-based conditions
   */
  private evaluateVariableCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Replace variables in condition string
      const resolvedCondition = this.replaceVariables(condition, variables);
      
      // Simple evaluation for common patterns
      // Example: "{{contactName}} === 'John'" becomes "John === 'John'"
      // This is a basic implementation - you might want to use a proper expression evaluator
      
      if (resolvedCondition.includes('===')) {
        const [left, right] = resolvedCondition.split('===').map(s => s.trim().replace(/['"]/g, ''));
        return left === right;
      }
      
      if (resolvedCondition.includes('!==')) {
        const [left, right] = resolvedCondition.split('!==').map(s => s.trim().replace(/['"]/g, ''));
        return left !== right;
      }
      
      if (resolvedCondition.includes('contains')) {
        const [left, right] = resolvedCondition.split('contains').map(s => s.trim().replace(/['"]/g, ''));
        return left.toLowerCase().includes(right.toLowerCase());
      }
      
      // Default: check if resolved condition is truthy
      return Boolean(resolvedCondition);
      
    } catch (error) {
      console.error('Error evaluating variable condition:', error);
      return false;
    }
  }

  /**
   * Continue to next node(s) using edges
   */
  private async continueToNextNode(
    currentNode: any,
    automation: any,
    context: ExecutionContext,
    selectedButtonId?: string | null
  ) {
    // Get outgoing edges
    const outgoingEdges = automation.edges.filter(
      (e: any) => e.sourceNodeId === currentNode.nodeId
    );

    if (outgoingEdges.length === 0) {
      // No more nodes → execution complete
      await this.completeExecution(context.executionId, 'completed', 'All nodes executed successfully');
      return;
    }

    const hasButtons = currentNode.data?.buttons && currentNode.data.buttons.length > 0;
    const hasTools = currentNode.data?.aiTools && currentNode.data.aiTools.length > 0;
    let edgesToFollow = outgoingEdges;

    if (hasButtons) {
      if (selectedButtonId) {
        // Find edge for the specific clicked button
        const matchedEdge = outgoingEdges.find((e: any) => e.sourceHandle === selectedButtonId);
        if (matchedEdge) {
          edgesToFollow = [matchedEdge];
        } else {
          // If no specific edge for this button, fallback to default or unlabeled edges
          const fallbackEdges = outgoingEdges.filter((e: any) => e.sourceHandle === 'default' || !e.sourceHandle);
          edgesToFollow = fallbackEdges;
        }
      } else {
        // If no selectedButtonId, try to find default or unlabeled fallback edges
        const fallbackEdges = outgoingEdges.filter((e: any) => e.sourceHandle === 'default' || !e.sourceHandle);
        edgesToFollow = fallbackEdges.length > 0 ? fallbackEdges : outgoingEdges;
      }
    } else if (hasTools) {
      if (selectedButtonId) {
        // Find edge matching the triggered function/tool name
        const matchedEdge = outgoingEdges.find((e: any) => e.sourceHandle === selectedButtonId);
        if (matchedEdge) {
          edgesToFollow = [matchedEdge];
        } else {
          const fallbackEdges = outgoingEdges.filter((e: any) => e.sourceHandle === 'default' || !e.sourceHandle);
          edgesToFollow = fallbackEdges;
        }
      } else {
        const fallbackEdges = outgoingEdges.filter((e: any) => e.sourceHandle === 'default' || !e.sourceHandle);
        edgesToFollow = fallbackEdges.length > 0 ? fallbackEdges : outgoingEdges;
      }
    }

    // Follow each edge
    for (const edge of edgesToFollow) {
      const nextNode = automation.nodes.find((n: any) => n.nodeId === edge.targetNodeId);
      if (nextNode) {
        await this.executeNode(nextNode, automation, context);
      }
    }
  }

  /**
   * Execute custom reply node
   */
  // private async executeCustomReply(node: any, context: ExecutionContext) {
  //   const message = this.replaceVariables(node.data.message || '', context.variables);
  //   console.log(`Sending message to conversation ${context.conversationId}: "${message}"`);

  //   const getContact = await db.query.contacts.findFirst({
  //     where: eq(contacts?.id, context.contactId),
  //   });

  //   if (getContact?.phone) {
  //     await sendBusinessMessage({
  //       to: getContact?.phone,
  //       message,
  //       channelId: getContact?.channelId,
  //     });
  //   }
    
  //   console.log(`✅ Message sent: ${message}`);
    
  //   return {
  //     action: 'message_sent',
  //     message,
  //     conversationId: context.conversationId
  //   };
  // }

  /**
   * Enhanced handleUserResponse to update context with user message for conditions
   */
  async handleUserResponse(conversationId: string, userResponse: string, interactiveData?: any) {
    console.log(`📨 Received user response for conversation ${conversationId}: "${userResponse}"`);
    
    // Find pending execution for this conversation
    const pendingExecution = this.findPendingExecutionByConversation(conversationId);
    if (!pendingExecution) {
      console.warn(`No pending execution found for conversation ${conversationId}`);
      return null;
    }

    try {
      // Remove from pending
      this.pendingExecutions.delete(pendingExecution.pendingId);
      
      // Process the response
      let processedResponse = userResponse;
      let selectedButtonId = null;
      
      // If this was a button click response
      if (interactiveData && interactiveData.type === 'button_reply') {
        selectedButtonId = interactiveData.button_reply.id;
        processedResponse = interactiveData.button_reply.title;
        console.log(`🔘 Button clicked: ${selectedButtonId} - "${processedResponse}"`);
      } else if (pendingExecution.expectedButtons && pendingExecution.expectedButtons.length > 0) {
        // Try to match text response to button options
        const matchedButton = this.matchTextToButton(userResponse, pendingExecution.expectedButtons);
        if (matchedButton) {
          selectedButtonId = matchedButton.id;
          processedResponse = matchedButton.text;
          console.log(`🎯 Matched text "${userResponse}" to button: ${selectedButtonId} - "${processedResponse}"`);
        }
      }
      
      // Update context with user response
      const context = pendingExecution.context;
      context.lastUserMessage = processedResponse; // ✅ Update for conditions
      
      if (pendingExecution.saveAs) {
        context.variables[pendingExecution.saveAs] = processedResponse;
        
        // Also save button ID if available
        if (selectedButtonId) {
          context.variables[`${pendingExecution.saveAs}_button_id`] = selectedButtonId;
        }
        
        console.log(`💾 Saved user response to variable: ${pendingExecution.saveAs} = "${processedResponse}"`);
      }

      // Log the response received
      await this.logNodeExecution(
        context.executionId,
        pendingExecution.nodeId,
        pendingExecution.nodeType || 'user_reply',
        'completed',
        { question: 'User response received', interactiveData },
        { 
          userResponse: processedResponse, 
          selectedButtonId,
          savedAs: pendingExecution.saveAs 
        },
        null
      );

      delete context.variables._userReply_waiting;
      delete context.variables._userReply_nodeId;
      delete context.variables._userReply_saveAs;
      delete context.variables._userReply_expectedButtons;

      await db.update(automationExecutions)
        .set({
          status: 'running',
          result: null,
          variables: context.variables,
        })
        .where(eq(automationExecutions.id, context.executionId));

      console.log(`▶️  Resuming execution ${context.executionId} with user response`);

      // Get fresh automation data and continue
      const automation = await this.getAutomationWithFlow(context.automationId);
      if (!automation) {
        throw new Error(`Automation ${context.automationId} not found during resume`);
      }

      const currentNode = automation.nodes.find((n: any) => n.nodeId === pendingExecution.nodeId);
      if (currentNode) {
        if (pendingExecution.nodeType === 'ai_agent') {
          await this.executeNode(currentNode, automation, context);
        } else {
          await this.continueToNextNode(currentNode, automation, context, selectedButtonId);
        }
      } else {
        throw new Error(`Node ${pendingExecution.nodeId} not found during resume`);
      }

      return {
        success: true,
        executionId: context.executionId,
        userResponse: processedResponse,
        selectedButtonId,
        savedVariable: pendingExecution.saveAs,
        resumedAt: new Date()
      };

    } catch (error) {
      console.error(`Error resuming execution for conversation ${conversationId}:`, error);
      
      await this.completeExecution(
        pendingExecution.executionId, 
        'failed', 
        `Failed to resume after user response: ${ (error as Error).message}`
      );
      
      throw error;
    }
  }


private async executeCustomReply(node: any, context: ExecutionContext) {
  const message = this.replaceVariables(node.data.message || '', context.variables);
  const nodeData = node.data;

  if (!context.contactId) {
    throw new Error('contactId is required for automation execution');
  }

  console.log(`Sending message to conversation ${context.conversationId}: "${message}"`);

  const getContact = await db.query.contacts.findFirst({
    where: eq(contacts.id, context.contactId),
  });

  if (!getContact?.phone) {
    throw new Error('Contact phone number not found');
  }

  let effectiveChannelId = getContact.channelId;
  if (!effectiveChannelId) {
    const [automationRow] = await db
      .select({ channelId: automations.channelId })
      .from(automations)
      .where(eq(automations.id, context.automationId))
      .limit(1);
    effectiveChannelId = automationRow?.channelId ?? null;
  }

  if (!effectiveChannelId) {
    throw new Error('No channelId found on contact or automation — cannot send message');
  }

  const hasMedia = nodeData.imageFile?.path || nodeData.imageFile?.cloudUrl ||
                   nodeData.videoFile?.path || nodeData.videoFile?.cloudUrl ||
                   nodeData.audioFile?.path || nodeData.audioFile?.cloudUrl ||
                   nodeData.documentFile?.path || nodeData.documentFile?.cloudUrl;
  let buttons = nodeData.buttons || [];

  const channel = await storage.getChannel(effectiveChannelId);
  const isQr = channel?.connectionMethod === "qr_code";
  if (isQr) {
    buttons = [];
  }

  if (hasMedia && buttons.length > 0) {
    await this.sendMediaWithButtons(getContact, nodeData, message, buttons, context, effectiveChannelId);
  } else if (hasMedia && buttons.length === 0) {
    try {
      await this.sendMediaMessage(getContact, nodeData, message, context, effectiveChannelId);
    } catch (error) {
      console.error('Error sending media message, falling back to text:', error);
      await sendBusinessMessage({
        to: getContact.phone,
        message: `${message}\n\n[Media file: ${this.getMediaFileName(nodeData)}]`,
        channelId: effectiveChannelId,
      });
    }
  } else if (!hasMedia && buttons.length > 0) {
    await this.sendInteractiveMessage(
      getContact.phone,
      message,
      buttons,
      effectiveChannelId,
      context.conversationId
    );
  }

  if (buttons.length > 0) {
    const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;

    if (!context.conversationId) {
      throw new Error('conversationId is required to wait for user response');
    }

    const pendingExecution: PendingExecution = {
      executionId: context.executionId,
      automationId: context.automationId,
      nodeId: node.nodeId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      context: { ...context },
      saveAs: node.data.saveAs,
      timestamp: new Date(),
      status: 'waiting_for_response',
      expectedButtons: buttons
    };

    this.pendingExecutions.set(pendingId, pendingExecution);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _userReply_waiting: true,
          _userReply_nodeId: node.nodeId,
          _userReply_saveAs: node.data.saveAs || null,
          _userReply_expectedButtons: buttons,
        },
        result: `Waiting for button response to: "${message}"`
      })
      .where(eq(automationExecutions.id, context.executionId));

    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'waiting_for_response',
      { ...node.data, message, buttons },
      { pendingId, action: 'interactive_message_sent_waiting' },
      null
    );

    console.log(`✅ Interactive message sent: ${message} with ${buttons.length} buttons`);
    console.log(`⏸️  Execution paused. Waiting for button response (pending ID: ${pendingId})`);

    return {
      action: 'execution_paused',
      message,
      buttons,
      hasMedia,
      conversationId: context.conversationId,
      pendingId,
      saveAs: node.data.saveAs
    };
  } else if (!hasMedia) {
    await sendBusinessMessage({
      to: getContact.phone,
      message,
      channelId: effectiveChannelId,
    });
  }
  
  console.log(`✅ Message sent: ${message}`);
  
  return {
    action: 'message_sent',
    message,
    conversationId: context.conversationId,
    hasMedia
  };
}

private async executeSendContactMessage(node: any, context: ExecutionContext) {
  const rawMessage = node.data.message || '';
  const message = this.replaceVariables(rawMessage, context.variables);
  const targetContactIds = node.data.targetContactIds || [];

  if (targetContactIds.length === 0) {
    console.log(`[send_contact_message] No contacts selected to send message`);
    return { action: 'no_contacts_selected' };
  }

  // Resolve which channel to send from: explicit node-configured sendContactChannelId or automation default
  let effectiveChannelId = node.data.sendContactChannelId;

  if (!effectiveChannelId) {
    const [automationRow] = await db
      .select({ channelId: automations.channelId })
      .from(automations)
      .where(eq(automations.id, context.automationId))
      .limit(1);
    effectiveChannelId = automationRow?.channelId;
  }

  if (!effectiveChannelId) {
    throw new Error('No channelId found on automation — cannot send custom message');
  }

  console.log(`[send_contact_message] Sending customized message to ${targetContactIds.length} contact(s)`);

  const results: any[] = [];
  for (const contactId of targetContactIds) {
    const contactRow = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });

    if (!contactRow?.phone) {
      console.log(`[send_contact_message] Contact ${contactId} has no phone number, skipping`);
      continue;
    }

    try {
      // Interpolate contact-specific variables merged with flow execution context variables
      const mergedVariables = {
        ...context.variables,
        name: contactRow.name,
        phone: contactRow.phone,
      };
      const customizedMessage = this.replaceVariables(rawMessage, mergedVariables);

      await sendBusinessMessage({
        to: contactRow.phone,
        message: customizedMessage,
        channelId: effectiveChannelId,
      });

      results.push({ contactId, phone: contactRow.phone, status: 'success' });
      console.log(`[send_contact_message] Sent message to contact ${contactRow.phone}`);
    } catch (err: any) {
      console.error(`[send_contact_message] Failed to send message to ${contactRow.phone}:`, err);
      results.push({ contactId, phone: contactRow.phone, status: 'failed', error: err.message });
    }
  }

  return {
    action: 'message_sent_to_contacts',
    results
  };
}

private async sendMediaWithButtons(
  contact: any,
  nodeData: any,
  message: string,
  buttons: any[],
  context: ExecutionContext,
  channelId: string
) {
  const channel = await storage.getChannel(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);

  const whatsappApi = new WhatsAppApiService(channel);
  const formattedPhone = this.formatPhoneNumber(contact.phone);

  let mediaId: string | null = null;
  let mediaType: string | null = null;
  try {
    const uploaded = await this.uploadNodeMedia(nodeData, whatsappApi);
    if (uploaded) {
      mediaId = uploaded.mediaId;
      mediaType = uploaded.mediaType;
    }
  } catch (err) {
    console.error('⚠️ Media upload failed, sending buttons without media header:', err);
  }

  if (mediaId && mediaType === 'audio') {
    try {
      const audioPayload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "audio",
        audio: { id: mediaId },
      };
      const audioResp = await fetch(
        `https://graph.facebook.com/v24.0/${channel.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${channel.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(audioPayload)
        }
      );
      if (!audioResp.ok) {
        const audioErr = await audioResp.json();
        console.error('⚠️ Audio send API error:', audioErr);
      } else {
        console.log(`📤 Audio sent before buttons to ${contact.phone}`);
      }
    } catch (err) {
      console.error('⚠️ Audio send failed, continuing with buttons:', err);
    }
  }

  const actionButtons = buttons.slice(0, 3).map((btn: any, index: number) => ({
    type: "reply",
    reply: {
      id: btn.id || `btn_${index}`,
      title: btn.text?.substring(0, 20) || `Option ${index + 1}`
    }
  }));

  const interactive: any = {
    type: "button",
    body: { text: message || "Please choose an option:" },
    action: { buttons: actionButtons },
  };

  if (mediaId && mediaType && mediaType !== 'audio') {
    interactive.header = {
      type: mediaType,
      [mediaType]: { id: mediaId },
    };
  }

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "interactive",
    interactive,
  };

  const result = await this.sendInteractiveMessageDirect(whatsappApi, payload);

  const messageContent = `${message}\n\nOptions:\n${buttons.map((btn: any, i: number) => `${i + 1}. ${btn.text}`).join('\n')}`;
  if (context.conversationId) {
    const conversation = await storage.getConversation(context.conversationId);
    if (conversation) {
      const createdMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: messageContent,
        status: "sent",
        whatsappMessageId: result.messages?.[0]?.id,
        messageType: "interactive",
        metadata: JSON.stringify({
          buttons,
          interactiveType: "button",
          mediaType: mediaType || undefined,
          mediaId: mediaId || undefined,
        })
      });

      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageText: message,
      });

      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation.id, {
          type: "new-message",
          message: createdMessage,
        });
      }
    }
  }

  console.log(`✅ Interactive message with ${mediaType || 'no'} media sent to ${contact.phone}`);
  return result;
}

private getMediaFileInfo(nodeData: any): { file: any; mediaType: string } | null {
  if (nodeData.imageFile?.path || nodeData.imageFile?.cloudUrl) return { file: nodeData.imageFile, mediaType: 'image' };
  if (nodeData.videoFile?.path || nodeData.videoFile?.cloudUrl) return { file: nodeData.videoFile, mediaType: 'video' };
  if (nodeData.audioFile?.path || nodeData.audioFile?.cloudUrl) return { file: nodeData.audioFile, mediaType: 'audio' };
  if (nodeData.documentFile?.path || nodeData.documentFile?.cloudUrl) return { file: nodeData.documentFile, mediaType: 'document' };
  return null;
}

private async readMediaBuffer(filePath: string): Promise<Buffer> {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const resp = await fetch(filePath);
    if (!resp.ok) throw new Error(`Failed to fetch media from ${filePath}: ${resp.status}`);
    return Buffer.from(await resp.arrayBuffer());
  }

  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  const resolved = path.resolve(process.cwd(), cleanPath);

  if (fs.existsSync(resolved)) {
    return fs.readFileSync(resolved);
  }

  // Check common subdirectories
  const fallbackPaths = [
    path.resolve(process.cwd(), 'uploads', path.basename(filePath)),
    path.resolve(process.cwd(), 'public', 'uploads', path.basename(filePath))
  ];
  for (const fallback of fallbackPaths) {
    if (fs.existsSync(fallback)) {
      return fs.readFileSync(fallback);
    }
  }

  throw new Error(`Media file not found on disk: ${resolved}`);
}

private async uploadNodeMedia(
  nodeData: any,
  whatsappApi: WhatsAppApiService
): Promise<{ mediaId: string; mediaType: string; file: any } | null> {
  const info = this.getMediaFileInfo(nodeData);
  if (!info) return null;

  const buffer = await this.readMediaBuffer(info.file.cloudUrl || info.file.path);
  const mediaId = await whatsappApi.uploadMediaBuffer(
    buffer,
    info.file.mimetype,
    info.file.filename || 'media'
  );
  console.log(`📤 Uploaded ${info.mediaType} to Meta: mediaId=${mediaId}`);
  return { mediaId, mediaType: info.mediaType, file: info.file };
}

private async sendMediaMessage(contact: any, nodeData: any, caption: string, context: ExecutionContext, channelId?: string | null) {
  const resolvedChannelId = channelId || contact.channelId;
  const channel = await storage.getChannel(resolvedChannelId);
  if (!channel) {
    throw new Error(`Channel ${resolvedChannelId} not found`);
  }

  const formattedPhone = this.formatPhoneNumber(contact.phone);

  if (channel.connectionMethod === "qr_code") {
    const info = this.getMediaFileInfo(nodeData);
    if (!info) {
      throw new Error('No media file found in node data');
    }
    const buffer = await this.readMediaBuffer(info.file.cloudUrl || info.file.path);
    const mediaPayload = {
      buffer,
      mimeType: info.file.mimetype,
      filename: info.file.filename || 'media',
    };
    const result = await BaileysManager.sendMediaMessage(
      channel.id,
      formattedPhone,
      mediaPayload,
      caption || undefined
    );
    await this.saveMediaMessage(contact, nodeData, caption, context, result);
    console.log(`✅ Media message sent successfully via Baileys to ${contact.phone}`);
    return result;
  }

  const whatsappApi = new WhatsAppApiService(channel);

  const uploaded = await this.uploadNodeMedia(nodeData, whatsappApi);
  if (!uploaded) {
    throw new Error('No media file found in node data');
  }

  const { mediaId, mediaType } = uploaded;
  let mediaPayload: any = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: mediaType,
  };

  if (mediaType === 'image') {
    mediaPayload.image = { id: mediaId, caption: caption || undefined };
  } else if (mediaType === 'video') {
    mediaPayload.video = { id: mediaId, caption: caption || undefined };
  } else if (mediaType === 'audio') {
    mediaPayload.audio = { id: mediaId };
    if (caption) {
      await this.sendTextMessage(whatsappApi, formattedPhone, caption);
    }
  } else if (mediaType === 'document') {
    mediaPayload.document = {
      id: mediaId,
      filename: nodeData.documentFile?.filename,
      caption: caption || undefined,
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${channel.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channel.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mediaPayload)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('WhatsApp Media API Error:', error);
    throw new Error(error.error?.message || 'Failed to send media message');
  }

  const result = await response.json();
  await this.saveMediaMessage(contact, nodeData, caption, context, result);
  console.log(`✅ Media message sent successfully to ${contact.phone}`);
  return result;
}

/**
 * Enhanced executeUserReply with media support
 */
private async executeUserReply(node: any, context: ExecutionContext) {
  const question = this.replaceVariables(node.data.question || '', context.variables);
  let buttons = node.data.buttons || [];
  const nodeData = node.data;
  
  console.log(`Asking question to conversation ${context.conversationId}: "${question}"`);
  console.log('Question buttons:', buttons);
  
  // Get contact information
  const getContact = await db.query.contacts.findFirst({
    where: eq(contacts?.id!, context.contactId!),
  });

  if (!getContact?.phone) {
    throw new Error('Contact phone number not found');
  }

  const hasMedia = nodeData.imageFile?.path || nodeData.videoFile?.path || nodeData.audioFile?.path || nodeData.documentFile?.path;

  if (!getContact?.channelId) {
    throw new Error('channelId not found');
  }

  const channel = await storage.getChannel(getContact.channelId);
  const isQr = channel?.connectionMethod === "qr_code";
  if (isQr) {
    buttons = [];
  }

  if (hasMedia && buttons.length > 0) {
    await this.sendMediaWithButtons(getContact, nodeData, question, buttons, context, getContact.channelId);
  } else if (hasMedia) {
    try {
      await this.sendMediaMessage(getContact, nodeData, question, context, getContact.channelId);
    } catch (error) {
      console.error('Error sending media in user_reply, falling back to text:', error);
      await sendBusinessMessage({
        to: getContact.phone,
        message: `${question}\n\n[Media file: ${this.getMediaFileName(nodeData)}]`,
        channelId: getContact.channelId,
        conversationId: context.conversationId,
      });
    }
  }

  if (buttons.length > 0 && !hasMedia) {
    await this.sendInteractiveMessage(
      getContact.phone,
      question,
      buttons,
      getContact.channelId,
      context.conversationId
    );
  } else if (!hasMedia && buttons.length === 0) {
    await sendBusinessMessage({
      to: getContact.phone,
      message: question,
      channelId: getContact.channelId,
      conversationId: context.conversationId,
    });
  }
  
  // Create a unique pending execution ID
  const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;
  
  if (!context.conversationId) {
    throw new Error('conversationId is required to wait for user response');
  }
  // Store the execution state for resumption
  const pendingExecution: PendingExecution = {
    executionId: context.executionId,
    automationId: context.automationId,
    nodeId: node.nodeId,
    nodeType: 'user_reply',
    conversationId: context.conversationId,
    contactId: context.contactId,
    context: { ...context },
    saveAs: node.data.saveAs,
    timestamp: new Date(),
    status: 'waiting_for_response',
    expectedButtons: buttons
  };
  
  this.pendingExecutions.set(pendingId, pendingExecution);
  
  await db.update(automationExecutions)
    .set({
      status: 'paused',
      currentNodeId: node.nodeId,
      variables: {
        ...context.variables,
        _userReply_waiting: true,
        _userReply_nodeId: node.nodeId,
        _userReply_nodeType: 'user_reply',
        _userReply_saveAs: node.data.saveAs || null,
        _userReply_expectedButtons: buttons,
      },
      result: `Waiting for user response to: "${question}"`
    })
    .where(eq(automationExecutions.id, context.executionId));
  
  // Log that we're waiting
  await this.logNodeExecution(
    context.executionId,
    node.nodeId,
    node.type,
    'waiting_for_response',
    { ...node.data, question, buttons, hasMedia },
    { pendingId, action: 'interactive_question_sent' },
    null
  );
  
  console.log(`✅ Interactive question sent: ${question} with ${buttons.length} buttons and media: ${hasMedia}`);
  console.log(`⏸️  Execution paused. Waiting for user response (pending ID: ${pendingId})`);
  
  return {
    action: 'execution_paused',
    question,
    buttons,
    hasMedia,
    conversationId: context.conversationId,
    pendingId,
    saveAs: node.data.saveAs
  };
}

  private async executeWaitReply(node: any, context: ExecutionContext) {
    const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;
    
    if (!context.conversationId) {
      throw new Error('conversationId is required to wait for user response');
    }

    // Store the execution state for resumption
    const pendingExecution: PendingExecution = {
      executionId: context.executionId,
      automationId: context.automationId,
      nodeId: node.nodeId,
      nodeType: 'wait_reply',
      conversationId: context.conversationId,
      contactId: context.contactId,
      context: { ...context },
      saveAs: node.data?.saveAs,
      timestamp: new Date(),
      status: 'waiting_for_response',
      expectedButtons: []
    };
    
    this.pendingExecutions.set(pendingId, pendingExecution);
    
    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _userReply_waiting: true,
          _userReply_nodeId: node.nodeId,
          _userReply_nodeType: 'wait_reply',
          _userReply_saveAs: node.data?.saveAs || null,
          _userReply_expectedButtons: [],
        },
        result: `Waiting for user reply`
      })
      .where(eq(automationExecutions.id, context.executionId));
    
    // Log that we're waiting
    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'waiting_for_response',
      { ...node.data },
      { pendingId, action: 'wait_reply_activated' },
      null
    );
    
    console.log(`⏸️  Execution paused. Waiting for user reply (pending ID: ${pendingId})`);
    
    return {
      action: 'execution_paused',
      conversationId: context.conversationId,
      pendingId,
      saveAs: node.data?.saveAs
    };
  }

/**
 * Helper method to send text message
 */
private async sendTextMessage(whatsappApi: any, to: string, message: string) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message }
  };

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${whatsappApi.channel.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApi.channel.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send text message');
  }

  return await response.json();
}

/**
 * Convert relative media path to public URL.
 * NOTE: No longer used for outbound WhatsApp media delivery (see uploadNodeMedia).
 * Retained only for persisting display URLs in message records (saveMediaMessage).
 */
private async getPublicMediaUrl(relativePath: string): Promise<string> {
  const baseUrl = process.env.APP_URL || 'https://whatsway.diploy.in';
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Save media message to database
 */
private async saveMediaMessage(
  contact: any, 
  nodeData: any, 
  caption: string, 
  context: ExecutionContext, 
  whatsappResult: any
) {
  try {
    // Determine message type and content
    let messageType = 'text';
    let messageContent = caption;
    let metadata: any = {};

    if (nodeData.imageFile) {
      messageType = 'image';
      metadata = {
        mediaType: 'image',
        mediaPath: nodeData.imageFile.path,
        fileName: nodeData.imageFile.filename,
        fileSize: nodeData.imageFile.size,
        mimeType: nodeData.imageFile.mimetype
      };
    } else if (nodeData.videoFile) {
      messageType = 'video';
      metadata = {
        mediaType: 'video',
        mediaPath: nodeData.videoFile.path,
        fileName: nodeData.videoFile.filename,
        fileSize: nodeData.videoFile.size,
        mimeType: nodeData.videoFile.mimetype
      };
    } else if (nodeData.audioFile) {
      messageType = 'audio';
      metadata = {
        mediaType: 'audio',
        mediaPath: nodeData.audioFile.path,
        fileName: nodeData.audioFile.filename,
        fileSize: nodeData.audioFile.size,
        mimeType: nodeData.audioFile.mimetype
      };
    } else if (nodeData.documentFile) {
      messageType = 'document';
      metadata = {
        mediaType: 'document',
        mediaPath: nodeData.documentFile.path,
        fileName: nodeData.documentFile.filename,
        fileSize: nodeData.documentFile.size,
        mimeType: nodeData.documentFile.mimetype
      };
    }

    // Find conversation
    if (!context.conversationId) {
      console.warn('No conversationId in context, cannot save media message');
      return;
    }
    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) {
      console.warn('Conversation not found for media message');
      return;
    }

    console.log(`Saving ${messageType} message to conversation ${conversation.id}`);

    // Create message record
    const createdMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: messageContent,
      status: "sent",
      whatsappMessageId: whatsappResult.messages?.[0]?.id,
      messageType,
      metadata: JSON.stringify(metadata),
      mediaUrl: await this.getPublicMediaUrl(metadata.mediaPath || ''),
    });

    // Update conversation
    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      lastMessageText: messageContent || `[${messageType}]`,
    });

    // Broadcast to websocket
    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversation.id, {
        type: "new-message",
        message: createdMessage,
      });
    }

  } catch (error) {
    console.error('Error saving media message to database:', error);
  }
}

/**
 * Get media file name for fallback messages
 */
private getMediaFileName(nodeData: any): string {
  if (nodeData.imageFile) return nodeData.imageFile.filename;
  if (nodeData.videoFile) return nodeData.videoFile.filename;
  if (nodeData.audioFile) return nodeData.audioFile.filename;
  if (nodeData.documentFile) return nodeData.documentFile.filename;
  return 'media file';
}

/**
 * Enhanced sendInteractiveMessage to handle media better
 */
private async sendInteractiveMessage(
  to: string, 
  question: string, 
  buttons: any[], 
  channelId: string, 
  conversationId?: string
) {
  try {
    // Get channel information
    const channel = await storage.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Create WhatsApp interactive message payload
    const interactivePayload = {
      messaging_product: "whatsapp",
      to: this.formatPhoneNumber(to),
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: question
        },
        action: {
          buttons: buttons.slice(0, 3).map((btn, index) => ({
            type: "reply",
            reply: {
              id: btn.id || `btn_${index}`,
              title: btn.text?.substring(0, 20) || `Option ${index + 1}`
            }
          }))
        }
      }
    };

    // Send via WhatsApp API
    const whatsappApi = new WhatsAppApiService(channel);
    const result = await this.sendInteractiveMessageDirect(whatsappApi, interactivePayload);

    // Save the message to database
    const messageContent = `${question}\n\nOptions:\n${buttons.map((btn, i) => `${i + 1}. ${btn.text}`).join('\n')}`;
    
    // Find conversation
    const conversation = conversationId
      ? await storage.getConversation(conversationId)
      : await storage.getConversationByPhone(to);

    if (conversation) {
      // Save message
      const createdMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: messageContent,
        status: "sent",
        whatsappMessageId: result.messages?.[0]?.id,
        messageType: "interactive",
        metadata: JSON.stringify({ buttons, interactiveType: "button" })
      });

      // Update conversation
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageText: question,
      });

      // Broadcast to websocket
      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation.id, {
          type: "new-message",
          message: createdMessage,
        });
      }
    }

    console.log(`✅ Interactive message sent successfully to ${to}`);
    return result;

  } catch (error) {
    console.error('Error sending interactive message:', error);
    
    // Fallback to regular text message with numbered options
    console.log('📱 Falling back to text message with options...');
    const fallbackMessage = `${question}\n\nReply with:\n${buttons.map((btn, i) => `${i + 1}. ${btn.text}`).join('\n')}`;
    
    return await sendBusinessMessage({
      to,
      message: fallbackMessage,
      channelId,
      conversationId
    });
  }
}

  private async sendInteractiveMessageDirect(whatsappApi: any, payload: any) {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${whatsappApi.channel.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappApi.channel.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API Error:', error);
      throw new Error(error.error?.message || 'Failed to send interactive message');
    }

    return await response.json();
  }

  private matchTextToButton(text: string, buttons: any[]) {
    const lowerText = text.toLowerCase().trim();
    
    // Direct text match
    let match = buttons.find(btn => btn.text.toLowerCase() === lowerText);
    if (match) return match;
    
    // Check if it's a number (1, 2, 3...)
    const numberMatch = lowerText.match(/^(\d+)$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < buttons.length) {
        return buttons[index];
      }
    }
    
    // Partial text match
    match = buttons.find(btn => 
      btn.text.toLowerCase().includes(lowerText) || 
      lowerText.includes(btn.text.toLowerCase())
    );
    
    return match;
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned;
  }

  private findPendingExecutionByConversation(conversationId: string) {
    for (const [pendingId, execution] of this.pendingExecutions.entries()) {
      if (execution.conversationId === conversationId) {
        return { pendingId, ...execution };
      }
    }
    
    return null;
  }

  async findPendingExecutionByConversationFromDb(conversationId: string) {
    const exec = await db.query.automationExecutions.findFirst({
      where: and(
        eq(automationExecutions.status, 'paused'),
        eq(automationExecutions.conversationId, conversationId),
      ),
    });

    if (!exec) return null;
    const vars = (exec.variables as Record<string, any>) || {};
    if (!vars._userReply_waiting) return null;

    const nodeId = vars._userReply_nodeId as string;
    if (!nodeId) return null;

    const nodeType = (vars._userReply_nodeType as string) || 'user_reply';

    const cleanVars = { ...vars };
    delete cleanVars._userReply_waiting;
    delete cleanVars._userReply_nodeId;
    delete cleanVars._userReply_nodeType;
    delete cleanVars._userReply_saveAs;
    delete cleanVars._userReply_expectedButtons;

    const context: ExecutionContext = {
      executionId: exec.id,
      automationId: exec.automationId,
      contactId: exec.contactId ?? undefined,
      conversationId: exec.conversationId ?? undefined,
      variables: cleanVars,
      triggerData: exec.triggerData,
      lastUserMessage: (cleanVars._lastUserMessage as string) || '',
    };

    const pendingId = `${exec.id}_${nodeId}_db_recovery`;
    const pendingExecution: PendingExecution = {
      executionId: exec.id,
      automationId: exec.automationId,
      nodeId,
      nodeType,
      conversationId,
      contactId: exec.contactId ?? undefined,
      context,
      saveAs: vars._userReply_saveAs || undefined,
      timestamp: exec.startedAt ?? new Date(),
      status: 'waiting_for_response',
      expectedButtons: vars._userReply_expectedButtons || [],
    };

    this.pendingExecutions.set(pendingId, pendingExecution);
    console.log(`[user_reply DB fallback] Re-registered execution ${exec.id} for conversation ${conversationId}`);
    return { pendingId, ...pendingExecution };
  }

  private async executeTimeGap(node: any, context: ExecutionContext, automation?: any) {
    const delay = node.data?.delay || 60;
    const resumeAt = new Date(Date.now() + delay * 1000);

    console.log(`⏳ Delaying execution by ${delay} seconds (until ${resumeAt.toISOString()})`);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _timeGap_waitingUntil: resumeAt.toISOString(),
          _timeGap_waitingNodeId: node.nodeId,
        },
        result: `time_gap: waiting ${delay}s until ${resumeAt.toISOString()}`,
      })
      .where(eq(automationExecutions.id, context.executionId));

    const continueAfterDelay = async () => {
      try {
        console.log(`⏰ Delay completed for execution ${context.executionId}, continuing`);

        // Run continuation first — markers remain in DB until after success.
        // If the server crashes before this returns, status='paused' + markers
        // are still present, so startup recovery will re-schedule correctly.
        const freshAutomation = await this.getAutomationWithFlow(context.automationId);
        await this.continueToNextNode(node, freshAutomation, context);

        // Continuation succeeded — clean up time_gap markers from DB variables.
        // context.variables has no markers (they were only stored in the DB copy).
        await db.update(automationExecutions)
          .set({ variables: context.variables })
          .where(eq(automationExecutions.id, context.executionId));
      } catch (error) {
        console.error('Error continuing after delay:', error);
        await this.completeExecution(context.executionId, 'failed', `Delay continuation failed: ${(error as Error).message}`);
      }
    };

    setTimeout(continueAfterDelay, delay * 1000);

    return {
      action: 'delay_started',
      delay,
      scheduledFor: resumeAt,
    };
  }

  async recoverTimeGapExecutions() {
    try {
      const pausedExecs = await db.query.automationExecutions.findMany({
        where: eq(automationExecutions.status, 'paused'),
      });

      const timeGapExecs = pausedExecs.filter((exec) => {
        const vars = (exec.variables as Record<string, any>) || {};
        return !!vars._timeGap_waitingUntil;
      });

      if (timeGapExecs.length === 0) return;

      console.log(`[time_gap recovery] Found ${timeGapExecs.length} paused time_gap execution(s) — scheduling resumption`);

      for (const exec of timeGapExecs) {
        const vars = (exec.variables as Record<string, any>) || {};
        const waitingUntil = vars._timeGap_waitingUntil as string;
        const waitingNodeId = vars._timeGap_waitingNodeId as string;

        if (!waitingUntil || !waitingNodeId) continue;

        const resumeAt = new Date(waitingUntil);
        const remainingMs = Math.max(0, resumeAt.getTime() - Date.now());

        const cleanVars = { ...vars };
        delete cleanVars._timeGap_waitingUntil;
        delete cleanVars._timeGap_waitingNodeId;

        const context: ExecutionContext = {
          executionId: exec.id,
          automationId: exec.automationId,
          contactId: exec.contactId ?? undefined,
          conversationId: exec.conversationId ?? undefined,
          variables: cleanVars,
          triggerData: exec.triggerData,
          lastUserMessage: (cleanVars._lastUserMessage as string) || '',
        };

        const resume = async () => {
          try {
            console.log(`⏰ [time_gap recovery] Resuming execution ${exec.id}`);

            const automation = await this.getAutomationWithFlow(exec.automationId);
            if (!automation) {
              await this.completeExecution(exec.id, 'failed', 'Automation not found during time_gap recovery');
              return;
            }

            const currentNode = automation.nodes.find((n: any) => n.nodeId === waitingNodeId);
            if (!currentNode) {
              await this.completeExecution(exec.id, 'failed', `Node ${waitingNodeId} not found during time_gap recovery`);
              return;
            }

            // Run continuation first — markers stay in DB until success.
            // If server crashes here, next boot recovery re-schedules safely.
            await this.continueToNextNode(currentNode, automation, context);

            // Continuation succeeded — remove time_gap markers from DB variables.
            await db.update(automationExecutions)
              .set({ variables: cleanVars })
              .where(eq(automationExecutions.id, exec.id));
          } catch (err) {
            console.error(`[time_gap recovery] Failed to resume execution ${exec.id}:`, err);
            await this.completeExecution(exec.id, 'failed', `time_gap recovery failed: ${(err as Error).message}`).catch(() => {});
          }
        };

        if (remainingMs === 0) {
          console.log(`[time_gap recovery] Execution ${exec.id} is past-due — resuming immediately`);
          void resume();
        } else {
          console.log(`[time_gap recovery] Execution ${exec.id} resumes in ${Math.round(remainingMs / 1000)}s`);
          setTimeout(resume, remainingMs);
        }
      }
    } catch (err) {
      console.error('[time_gap recovery] Error during startup recovery:', err);
    }
  }

  async recoverUserReplyExecutions() {
    try {
      const pausedExecs = await db.query.automationExecutions.findMany({
        where: eq(automationExecutions.status, 'paused'),
      });

      const userReplyExecs = pausedExecs.filter((exec) => {
        const vars = (exec.variables as Record<string, any>) || {};
        return !!vars._userReply_waiting;
      });

      if (userReplyExecs.length === 0) return;

      console.log(`[user_reply recovery] Found ${userReplyExecs.length} paused user_reply execution(s) — re-registering`);

      for (const exec of userReplyExecs) {
        const vars = (exec.variables as Record<string, any>) || {};
        const nodeId = vars._userReply_nodeId as string;

        if (!nodeId || !exec.conversationId) continue;

        const cleanVars = { ...vars };
        delete cleanVars._userReply_waiting;
        delete cleanVars._userReply_nodeId;
        delete cleanVars._userReply_saveAs;
        delete cleanVars._userReply_expectedButtons;

        const context: ExecutionContext = {
          executionId: exec.id,
          automationId: exec.automationId,
          contactId: exec.contactId ?? undefined,
          conversationId: exec.conversationId ?? undefined,
          variables: cleanVars,
          triggerData: exec.triggerData,
          lastUserMessage: (cleanVars._lastUserMessage as string) || '',
        };

        const pendingId = `${exec.id}_${nodeId}_recovered`;
        const pendingExecution: PendingExecution = {
          executionId: exec.id,
          automationId: exec.automationId,
          nodeId,
          nodeType: vars._userReply_nodeType || 'user_reply',
          conversationId: exec.conversationId,
          contactId: exec.contactId ?? undefined,
          context,
          saveAs: vars._userReply_saveAs || undefined,
          timestamp: exec.startedAt ?? new Date(),
          status: 'waiting_for_response',
          expectedButtons: vars._userReply_expectedButtons || [],
        };

        this.pendingExecutions.set(pendingId, pendingExecution);
        console.log(`[user_reply recovery] Re-registered execution ${exec.id} for conversation ${exec.conversationId}`);
      }
    } catch (err) {
      console.error('[user_reply recovery] Error during startup recovery:', err);
    }
  }

private getBodyParamCount(body: string): number {
  if (!body) return 0;
  const matches = body.match(/\{\{\d+\}\}/g);
  return matches ? matches.length : 0;
}


private async executeSendTemplate(node: any, context: ExecutionContext) {
  const templateId = node.data?.templateId;
  const headerImageId = node.data?.headerImageId || null;
  const variableMapping = node.data?.variableMapping || {};

  if (!templateId) throw new Error("No template ID provided");
  if (!context.contactId) throw new Error("No contactId in context");

  // 🧩 Fetch contact
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, context.contactId),
  });

  if (!contact?.phone) throw new Error("Contact phone not found");
  if (!contact.channelId) throw new Error("Contact channelId missing");

  // 🧩 Split contact name into first/last
  const [firstName = "", lastName = ""] = (contact.name || "").split(" ");

  // 🧩 Fetch WhatsApp template
  const template = await db.query.templates.findFirst({
    where: and(
      eq(templates.id, templateId),
      eq(templates.channelId, contact.channelId)
    ),
  });

  if (!template) throw new Error("Template not found");

  console.log(`📄 Sending template ${template.name} to ${contact.phone}`);

  /* ───── BUILD TEMPLATE VARIABLES ───── */
  const bodyParamCount = this.getBodyParamCount(template.body);
  const parameters: string[] = [];

  for (let i = 1; i <= bodyParamCount; i++) {
    const mapping = variableMapping[i] || {};
    let value = "";

    switch (mapping.type) {
      case "firstName":
        value = firstName;
        break;
      case "lastName":
        value = lastName;
        break;
      case "fullName":
        value = contact.name || "";
        break;
      case "phone":
        value = contact.phone || "";
        break;
      case "custom":
        value = mapping.value || "";
        break;
      default:
        value = "";
    }

    parameters.push(value);
  }

  console.log(`📦 Prepared variables for template:`, parameters);

  // 🟢 Send message through WhatsApp API
  await sendBusinessMessage({
    to: contact.phone,
    channelId: contact.channelId,
    templateName: template.name,
    parameters, // ✅ Body variables
    mediaId: headerImageId || template.mediaUrl || null, // ✅ Header image
  });

  console.log(`✅ Template sent successfully: ${template.name}`);

  return {
    action: "template_sent",
    templateId,
    parameters,
  };
}



  private async executeAssignUser(node: any, context: ExecutionContext) {
    const assigneeId = node.data?.assigneeId;
    
    if (!assigneeId) {
      throw new Error('No assignee ID provided');
    }
    
    console.log(`👤 Assigning conversation ${context.conversationId} to user ${assigneeId}`);

    if (!context.conversationId) {
  throw new Error("No conversationId provided in context");
}

    const conversation = await storage.updateConversation(context.conversationId, {assignedTo: assigneeId, status:"assigned"});
    
    if (!conversation) {
      throw new Error('Conversation not found for assignment');
    }
    console.log(`✅ Conversation assigned to: ${assigneeId}`);
    
    return {
      action: 'user_assigned',
      assigneeId,
      conversationId: context.conversationId
    };
  }

  private async executeAddToGroup(node: any, context: ExecutionContext) {
    const groupId = node.data?.groupId;
    if (!groupId) throw new Error('No group ID provided');
    if (!context.contactId) throw new Error('No contact ID in context');

    console.log(`👥 Adding contact ${context.contactId} to group ${groupId}`);

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, context.contactId),
    });
    if (!contact) throw new Error('Contact not found');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    const groupName = group?.name || groupId;

    const existingGroups: string[] = contact.groups || [];
    if (!existingGroups.includes(groupName)) {
      existingGroups.push(groupName);
      await db.update(contacts)
        .set({ groups: existingGroups })
        .where(eq(contacts.id, context.contactId));
    }

    return { action: 'added_to_group', groupId, groupName, contactId: context.contactId };
  }

  private async executeUpdateContact(node: any, context: ExecutionContext) {
    const field = node.data?.contactField;
    let value = node.data?.contactFieldValue || '';
    if (!field) throw new Error('No contact field specified');
    if (!context.contactId) throw new Error('No contact ID in context');

    value = this.replaceVariables(value, context.variables);

    console.log(`📝 Updating contact ${context.contactId} field "${field}" to "${value}"`);

    const updateData: Record<string, any> = {};
    if (field === 'name') updateData.name = value;
    else if (field === 'email') updateData.email = value;
    else if (field === 'notes') updateData.notes = value;
    else if (field === 'tags') {
      const tagList = value.split(',').map((t: string) => t.trim()).filter(Boolean);
      updateData.tags = tagList;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(contacts).set(updateData).where(eq(contacts.id, context.contactId));
    }

    return { action: 'contact_updated', field, value, contactId: context.contactId };
  }

  private async executeSetVariable(node: any, context: ExecutionContext) {
    const varName = node.data?.variableName;
    const source = node.data?.variableSource || 'static';
    let varValue = node.data?.variableValue || '';

    if (!varName) throw new Error('No variable name specified');

    console.log(`🔧 Setting variable "${varName}" (source: ${source})`);

    if (source === 'static') {
      varValue = this.replaceVariables(varValue, context.variables);
    } else if (source === 'from_message') {
      varValue = context.lastUserMessage || '';
    } else if (source === 'from_webhook') {
      const path = varValue;
      const webhookData = context.variables['_lastWebhookResponse'] || {};
      varValue = this.getNestedValue(webhookData, path) || '';
    }

    context.variables[varName] = varValue;

    return { action: 'variable_set', name: varName, value: varValue };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  private async executeSendLocation(node: any, context: ExecutionContext) {
    const { latitude, longitude, locationName, locationAddress } = node.data || {};
    if (!latitude || !longitude) throw new Error('Latitude and longitude are required');
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`📍 Sending location: ${locationName || ''} (${latitude}, ${longitude})`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const payload = {
      messaging_product: "whatsapp",
      to: conversation.contactPhone,
      type: "location",
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: locationName || undefined,
        address: locationAddress || undefined,
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result.error)}`);

    const locationText = `📍 ${locationName || 'Location'}: ${latitude}, ${longitude}`;
    await storage.createMessage({
      conversationId: context.conversationId,
      content: locationText,
      status: 'sent',
      messageType: 'location',
      whatsappMessageId: result?.messages?.[0]?.id,
    });

    return { action: 'location_sent', latitude, longitude, locationName };
  }

  private async executeSendListMessage(node: any, context: ExecutionContext) {
    const { message, listButtonText, listSections } = node.data || {};
    if (!message) throw new Error('List message body text is required');
    if (!listSections || listSections.length === 0) throw new Error('At least one section is required');
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`📋 Sending list message with ${listSections.length} sections`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const bodyText = this.replaceVariables(message, context.variables);

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contactPhone,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: listButtonText || "View Options",
          sections: listSections.map((section: any) => ({
            title: section.title,
            rows: section.rows.map((row: any) => ({
              id: row.id || `row_${Math.random().toString(36).slice(2, 8)}`,
              title: row.title,
              ...(row.description ? { description: row.description } : {}),
            })),
          })),
        },
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result.error)}`);

    await storage.createMessage({
      conversationId: context.conversationId,
      content: bodyText,
      status: 'sent',
      messageType: 'interactive',
      whatsappMessageId: result?.messages?.[0]?.id,
      metadata: JSON.stringify({ listSections, interactiveType: "list" }),
    });

    const allRows = listSections.flatMap((s: any) => s.rows || []);
    const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;

    const pendingExecution: PendingExecution = {
      executionId: context.executionId,
      automationId: context.automationId,
      nodeId: node.nodeId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      context: { ...context },
      saveAs: node.data.saveAs,
      timestamp: new Date(),
      status: 'waiting_for_response',
      expectedButtons: allRows.map((r: any) => ({ id: r.id, text: r.title })),
    };

    this.pendingExecutions.set(pendingId, pendingExecution);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _userReply_waiting: true,
          _userReply_nodeId: node.nodeId,
          _userReply_saveAs: node.data.saveAs || null,
          _userReply_expectedButtons: allRows.map((r: any) => ({ id: r.id, text: r.title })),
        },
        result: `Waiting for list selection: "${bodyText}"`,
      })
      .where(eq(automationExecutions.id, context.executionId));

    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'waiting_for_response',
      { ...node.data, message: bodyText, listSections },
      { pendingId, action: 'list_message_sent_waiting' },
      null,
    );

    console.log(`📋 List message sent, pausing for user selection (pending ID: ${pendingId})`);

    return {
      action: 'execution_paused',
      message: bodyText,
      listSections,
      conversationId: context.conversationId,
      pendingId,
      saveAs: node.data.saveAs,
    };
  }

  private async executeSendMedia(node: any, context: ExecutionContext) {
    const { mediaType, mediaUrl, mediaId, mediaSourceType, mediaCaption, mediaFileName } = node.data || {};
    const useUpload = mediaSourceType === "upload" || (!mediaSourceType && !!mediaId && !mediaUrl);
    const hasMedia = useUpload ? !!mediaId : !!mediaUrl;
    if (!mediaType || !hasMedia) throw new Error('Media type and media source (URL or uploaded file) are required');
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`📎 Sending ${mediaType}: ${useUpload ? `mediaId:${mediaId}` : mediaUrl}`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const caption = mediaCaption ? this.replaceVariables(mediaCaption, context.variables) : undefined;

    const mediaPayload: any = useUpload
      ? {
          id: mediaId,
          ...(mediaType === 'document' && mediaFileName ? { filename: mediaFileName } : {}),
          ...(caption && mediaType !== 'audio' ? { caption } : {}),
        }
      : {
          link: mediaUrl,
          ...(mediaType === 'document' && mediaFileName ? { filename: mediaFileName } : {}),
          ...(caption && mediaType !== 'audio' ? { caption } : {}),
        };

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contactPhone,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result.error)}`);

    await storage.createMessage({
      conversationId: context.conversationId,
      content: caption || `[${mediaType}]`,
      status: 'sent',
      messageType: mediaType,
      whatsappMessageId: result?.messages?.[0]?.id,
    });

    return { action: 'media_sent', mediaType, mediaUrl };
  }

  private async executeMarkAsRead(node: any, context: ExecutionContext) {
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`✅ Marking conversation ${context.conversationId} as read`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const lastMsgId = context.triggerData?.messageId;
    if (lastMsgId) {
      await fetch(
        `https://graph.facebook.com/v24.0/${channel.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${channel.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: lastMsgId,
          }),
        }
      );
    }

    await storage.updateConversation(context.conversationId, { unreadCount: 0 });

    return { action: 'marked_as_read', conversationId: context.conversationId };
  }

  private async executeWebhook(node: any, context: ExecutionContext) {
    const url = this.replaceVariables(node.data?.webhookUrl || '', context.variables);
    const method = (node.data?.webhookMethod || 'POST').toUpperCase();
    const customHeaders = node.data?.webhookHeaders || {};
    const customBody = node.data?.webhookBody || '';

    if (!url) throw new Error('No webhook URL provided');

    console.log(`🌐 Executing webhook: ${method} ${url}`);

    const contact = context.contactId
      ? await db.query.contacts.findFirst({ where: eq(contacts.id, context.contactId) })
      : null;

    const conversation = context.conversationId
      ? await storage.getConversation(context.conversationId)
      : null;

    let channelData: any = null;
    if (conversation?.channelId) {
      channelData = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId),
      });
    }

    const automationPayload = {
      event: 'automation_webhook',
      timestamp: new Date().toISOString(),
      automation: {
        id: context.automationId,
        executionId: context.executionId,
        nodeId: node.nodeId,
      },
      contact: contact ? {
        id: contact.id,
        name: contact.name || '',
        phone: contact.phone || '',
        email: (contact as any).email || '',
        groups: contact.groups || [],
        tags: (contact as any).tags || [],
        source: contact.source || '',
        createdAt: contact.createdAt,
      } : null,
      conversation: conversation ? {
        id: conversation.id,
        status: conversation.status,
        lastMessageText: conversation.lastMessageText || '',
        unreadCount: conversation.unreadCount || 0,
      } : null,
      channel: channelData ? {
        id: channelData.id,
        name: channelData.name || '',
        phoneNumber: channelData.phoneNumber || '',
      } : null,
      lastUserMessage: context.lastUserMessage || '',
      variables: { ...context.variables },
    };

    delete automationPayload.variables['_lastWebhookResponse'];

    let body: string | undefined;
    const headers: Record<string, string> = {
      'User-Agent': 'WhatsApp-Marketing-Platform/1.0',
      ...customHeaders,
    };

    const templateVars = {
      ...context.variables,
      contact_name: contact?.name || '',
      contact_phone: contact?.phone || '',
      contact_email: (contact as any)?.email || '',
      contact_groups: JSON.stringify(contact?.groups || []),
      last_message: context.lastUserMessage || '',
      conversation_id: context.conversationId || '',
      channel_name: channelData?.name || '',
      channel_phone: channelData?.phoneNumber || '',
    };

    let finalUrl = url;

    if (method === 'POST' || method === 'PUT') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      if (customBody.trim()) {
        body = this.replaceVariables(customBody, templateVars);
      } else {
        body = JSON.stringify(automationPayload);
      }
    } else if (method === 'GET') {
      const flatParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(templateVars)) {
        if (k.startsWith('_')) continue;
        flatParams[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      }
      const queryParams = new URLSearchParams(flatParams);
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}${queryParams.toString()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const fetchOptions: any = { method, headers, signal: controller.signal };
      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = body;
      }

      const response = await fetch(finalUrl, fetchOptions);
      clearTimeout(timeout);

      const responseStatus = response.status;
      let responseData: any = null;
      const responseText = await response.text();

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { text: responseText };
      }

      context.variables['_lastWebhookResponse'] = responseData;
      context.variables['_lastWebhookStatus'] = responseStatus;

      console.log(`✅ Webhook response: ${responseStatus} - ${responseText.substring(0, 200)}`);

      if (!response.ok) {
        console.warn(`⚠️ Webhook returned non-OK status: ${responseStatus}`);
      }

      return {
        action: 'webhook_executed',
        url: finalUrl,
        method,
        status: responseStatus,
        response: responseData,
      };
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error(`⏱️ Webhook timed out after 30s: ${finalUrl}`);
        context.variables['_lastWebhookResponse'] = { error: 'timeout' };
        context.variables['_lastWebhookStatus'] = 408;
        return {
          action: 'webhook_timeout',
          url: finalUrl,
          method,
          error: 'Request timed out after 30 seconds',
        };
      }
      throw error;
    }
  }

  private async executeMySQL(node: any, context: ExecutionContext) {
    const contact = context.contactId
      ? await db.query.contacts.findFirst({ where: eq(contacts.id, context.contactId) })
      : null;

    const conversation = context.conversationId
      ? await storage.getConversation(context.conversationId)
      : null;

    let channelData: any = null;
    if (conversation?.channelId) {
      channelData = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId),
      });
    }

    const templateVars = {
      ...context.variables,
      contact_name: contact?.name || '',
      contact_phone: contact?.phone || '',
      contact_email: (contact as any)?.email || '',
      contact_groups: JSON.stringify(contact?.groups || []),
      last_message: context.lastUserMessage || '',
      conversation_id: context.conversationId || '',
      channel_name: channelData?.name || '',
      channel_phone: channelData?.phoneNumber || '',
    };

    const host = this.replaceVariables(node.data?.mysqlHost || '', templateVars) || process.env.MYSQL_HOST || 'localhost';
    const portStr = this.replaceVariables(node.data?.mysqlPort || '', templateVars) || process.env.MYSQL_PORT || '3306';
    const port = parseInt(portStr, 10) || 3306;
    const user = this.replaceVariables(node.data?.mysqlUsername || '', templateVars) || process.env.MYSQL_USER || '';
    const password = this.replaceVariables(node.data?.mysqlPassword || '', templateVars) || process.env.MYSQL_PASSWORD || '';
    const database = this.replaceVariables(node.data?.mysqlDatabase || '', templateVars) || process.env.MYSQL_DATABASE || '';
    const query = this.replaceVariables(node.data?.mysqlQuery || '', templateVars);

    if (!host || !query) {
      throw new Error('Missing MySQL host or query');
    }

    console.log(`🛢️ Executing MySQL query: ${query} on ${host}:${port}/${database}`);

    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
    });

    try {
      const [results] = await connection.query(query);

      // Store results in output variable if configured
      if (node.data?.mysqlOutputVariable) {
        context.variables[node.data.mysqlOutputVariable] = results;
      }

      // Store default results so subsequent nodes can check it (similar to _lastWebhookResponse)
      context.variables['_lastMysqlResponse'] = results;
      context.variables['_lastMysqlStatus'] = 'success';

      return {
        action: 'mysql_executed',
        status: 'success',
        results: results,
      };
    } catch (error: any) {
      console.error(`❌ MySQL execution error:`, error);
      context.variables['_lastMysqlResponse'] = { error: error.message };
      context.variables['_lastMysqlStatus'] = 'error';
      throw error;
    } finally {
      await connection.end();
    }
  }

  private async executeAIAnswer(node: any, context: ExecutionContext) {
    const nodeData = node.data || {};
    const aiConfigUseSettings = nodeData.aiConfigUseSettings !== false;
    const aiApiKey = nodeData.aiApiKey || "";
    const aiModel = nodeData.aiModel || "gpt-4o";
    const aiSystemPrompt = nodeData.aiSystemPrompt || "You are a helpful AI assistant.";
    const aiUseTrainingData = nodeData.aiUseTrainingData !== false;
    const aiOutputVariable = nodeData.aiOutputVariable || "ai_response";

    if (!context.contactId) {
      throw new Error('contactId is required for automation execution');
    }

    const getContact = await db.query.contacts.findFirst({
      where: eq(contacts.id, context.contactId),
    });

    if (!getContact) {
      throw new Error('Contact not found');
    }

    context.variables.contactName = getContact.name;
    context.variables.contactPhone = getContact.phone;
    context.variables.last_message = context.lastUserMessage || "";

    let effectiveChannelId = getContact.channelId;
    if (!effectiveChannelId) {
      const [automationRow] = await db
        .select({ channelId: automations.channelId })
        .from(automations)
        .where(eq(automations.id, context.automationId))
        .limit(1);
      effectiveChannelId = automationRow?.channelId ?? null;
    }

    let finalApiKey = aiApiKey;
    let finalBaseURL = "https://api.openai.com/v1";
    let finalModel = aiModel;

    if (aiConfigUseSettings && effectiveChannelId) {
      const aiSetting = await db
        .select()
        .from(aiSettings)
        .where(and(eq(aiSettings.channelId, effectiveChannelId), eq(aiSettings.isActive, true)))
        .limit(1);

      const activeAI = aiSetting?.[0];
      if (activeAI && activeAI.apiKey) {
        finalApiKey = activeAI.apiKey;
        finalBaseURL = activeAI.endpoint || "https://api.openai.com/v1";
        finalModel = activeAI.model || aiModel;
      }
    }

    if (!finalApiKey) {
      finalApiKey = process.env.OPENAI_API_KEY || "";
      finalBaseURL = "https://api.openai.com/v1";
    }

    if (!finalApiKey) {
      throw new Error('No API key configured for AI agent node');
    }

    let systemPrompt = this.replaceVariables(aiSystemPrompt, context.variables);

    if (aiUseTrainingData && effectiveChannelId) {
      try {
        const channelSites = await db
          .select()
          .from(sites)
          .where(eq(sites.channelId, effectiveChannelId))
          .limit(1);

        const site = channelSites[0];
        if (site) {
          const queryText = context.lastUserMessage || "Hi";
          const trainingResults = await searchTrainingData(site.id, effectiveChannelId, queryText);
          
          let trainingContext = "";
          if (trainingResults.chunks.length > 0) {
            trainingContext += "\n\n--- RELEVANT KNOWLEDGE BASE & TRAINING DATA ---\n";
            trainingContext += trainingResults.chunks.join("\n\n");
          }
          if (trainingResults.qaPairs.length > 0) {
            trainingContext += "\n\n--- RELEVANT FAQ PAIRS ---\n";
            for (const qa of trainingResults.qaPairs) {
              trainingContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
            }
          }
          if (trainingContext) {
            systemPrompt += trainingContext;
          }
        }
      } catch (err) {
        console.warn("[AI Node] Training data search failed:", err);
      }
    }

    const aiClient = new OpenAI({
      apiKey: finalApiKey,
      baseURL: finalBaseURL,
    });

    const messageContent = context.lastUserMessage || "Hi";

    console.log(`[AI Node] Sending completion request using model ${finalModel}...`);
    const completion = await aiClient.chat.completions.create({
      model: finalModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    console.log(`[AI Node] Received response from AI: "${responseText.substring(0, 100)}..."`);

    context.variables[aiOutputVariable] = responseText;

    return { success: true, response: responseText };
  }

  private async executeAIAgent(node: any, context: ExecutionContext, automation?: any) {
    const nodeData = node.data || {};
    const aiConfigUseSettings = nodeData.aiConfigUseSettings !== false;
    const aiApiKey = nodeData.aiApiKey || "";
    const aiModel = nodeData.aiModel || "gpt-4o";
    const aiSystemPrompt = nodeData.aiSystemPrompt || "You are a conversational AI Agent taking over this chat. Answer user questions and call custom functions/tools when needed.";
    const aiUseTrainingData = nodeData.aiUseTrainingData !== false;

    if (!context.contactId || !context.conversationId) {
      throw new Error('contactId and conversationId are required for conversational takeover');
    }

    const getContact = await db.query.contacts.findFirst({
      where: eq(contacts.id, context.contactId),
    });

    if (!getContact) {
      throw new Error('Contact not found');
    }

    context.variables.contactName = getContact.name;
    context.variables.contactPhone = getContact.phone;
    context.variables.last_message = context.lastUserMessage || "";

    let effectiveChannelId = getContact.channelId;
    if (!effectiveChannelId) {
      const [automationRow] = await db
        .select({ channelId: automations.channelId })
        .from(automations)
        .where(eq(automations.id, context.automationId))
        .limit(1);
      effectiveChannelId = automationRow?.channelId ?? null;
    }

    let finalApiKey = aiApiKey;
    let finalBaseURL = "https://api.openai.com/v1";
    let finalModel = aiModel;

    if (aiConfigUseSettings && effectiveChannelId) {
      const aiSetting = await db
        .select()
        .from(aiSettings)
        .where(and(eq(aiSettings.channelId, effectiveChannelId), eq(aiSettings.isActive, true)))
        .limit(1);

      const activeAI = aiSetting?.[0];
      if (activeAI && activeAI.apiKey) {
        finalApiKey = activeAI.apiKey;
        finalBaseURL = activeAI.endpoint || "https://api.openai.com/v1";
        finalModel = activeAI.model || aiModel;
      }
    }

    if (!finalApiKey) {
      finalApiKey = process.env.OPENAI_API_KEY || "";
      finalBaseURL = "https://api.openai.com/v1";
    }

    if (!finalApiKey) {
      throw new Error('No API key configured for AI Agent takeover');
    }

    // Fetch site for training data & fallback system prompt
    let site: any = null;
    if (effectiveChannelId) {
      try {
        const channelSites = await db
          .select()
          .from(sites)
          .where(eq(sites.channelId, effectiveChannelId))
          .limit(1);
        site = channelSites[0];
      } catch (err) {
        console.warn("[AI Agent] Failed to fetch channel site:", err);
      }
    }

    // Resolve system prompt: if it's the default or empty, try to fallback to main AI agent system prompt
    let resolvedSystemPrompt = aiSystemPrompt;
    if ((!resolvedSystemPrompt || resolvedSystemPrompt.trim() === "" || resolvedSystemPrompt === "You are a conversational AI Agent taking over this chat. Answer user questions and call custom functions/tools when needed.") && site?.widgetConfig?.systemPrompt) {
      resolvedSystemPrompt = site.widgetConfig.systemPrompt;
      console.log(`[AI Agent] Referencing main AI chatbot system prompt: "${resolvedSystemPrompt.substring(0, 100)}..."`);
    }

    // 1. Interpolate variables in System Prompt
    let systemPrompt = this.replaceVariables(resolvedSystemPrompt, context.variables);

    // 2. Fetch Knowledge Base / Training data if requested
    if (aiUseTrainingData && site) {
      try {
        const queryText = context.lastUserMessage || "Hi";
        const trainingResults = await searchTrainingData(site.id, effectiveChannelId, queryText);
        
        let trainingContext = "";
        if (trainingResults.chunks.length > 0) {
          trainingContext += "\n\n--- RELEVANT KNOWLEDGE BASE & TRAINING DATA ---\n";
          trainingContext += trainingResults.chunks.join("\n\n");
        }
        if (trainingResults.qaPairs.length > 0) {
          trainingContext += "\n\n--- RELEVANT FAQ PAIRS ---\n";
          for (const qa of trainingResults.qaPairs) {
            trainingContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
          }
        }
        if (trainingContext) {
          systemPrompt += trainingContext;
        }
      } catch (err) {
        console.warn("[AI Agent] Training data search failed:", err);
      }
    }

    // 3. Load conversation history
    const chatHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, context.conversationId))
      .orderBy(sql`${messages.timestamp} asc`)
      .limit(30);

    const openAiMessages = chatHistory.map(msg => ({
      role: msg.fromUser ? "user" as const : "assistant" as const,
      content: msg.content || ""
    }));

    // Ensure the triggering message is appended exactly once (if not already at the end of chatHistory)
    const cleanLastMsg = (context.lastUserMessage || "").trim();
    const lastMsgInHistory = openAiMessages[openAiMessages.length - 1];
    if (cleanLastMsg && (!lastMsgInHistory || lastMsgInHistory.role !== "user" || lastMsgInHistory.content.trim() !== cleanLastMsg)) {
      openAiMessages.push({
        role: "user",
        content: cleanLastMsg
      });
    }

    const messagesToSend = [
      { role: "system" as const, content: systemPrompt },
      ...openAiMessages
    ];

    // 4. Construct tools (custom functions) list
    const toolsList = (nodeData.aiTools || []).map((t: any) => {
      let parameters = { type: "object", properties: {} };
      try {
        if (t.parametersJson) {
          parameters = JSON.parse(t.parametersJson);
        }
      } catch (err) {
        console.warn(`[AI Agent] Failed to parse parameters JSON for tool ${t.name}:`, err);
      }
      return {
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters,
        }
      };
    });

    const aiClient = new OpenAI({
      apiKey: finalApiKey,
      baseURL: finalBaseURL,
    });

    console.log(`[AI Agent] Running conversational takeover completion using model ${finalModel}...`);
    const completion = await aiClient.chat.completions.create({
      model: finalModel,
      messages: messagesToSend,
      temperature: 0.7,
      max_tokens: 800,
      tools: toolsList.length > 0 ? toolsList : undefined,
    });

    const responseMessage = completion.choices[0]?.message;
    const responseText = responseMessage?.content || "";
    const toolCalls = responseMessage?.tool_calls;

    // Check if tool/function is called by LLM
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const functionName = toolCall.function.name;
      let functionArgs = {};
      try {
        functionArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch (err) {
        console.warn(`[AI Agent] Failed to parse arguments for tool ${functionName}:`, err);
      }

      console.log(`[AI Agent] Function call matched: ${functionName}`, functionArgs);

      // Save arguments to context variables
      context.variables._lastFunctionName = functionName;
      context.variables._lastFunctionArgs = functionArgs;
      if (typeof functionArgs === 'object') {
        for (const [k, v] of Object.entries(functionArgs)) {
          context.variables[`${functionName}_${k}`] = v;
        }
      }

      // If text response was included, send it
      if (responseText) {
        await this.sendOutgoingResponse(responseText, nodeData, getContact, effectiveChannelId, context, automation);
      }

      // Transition execution out of takeover and down the matched connection path!
      const freshAutomation = automation || await this.getAutomationWithFlow(context.automationId);
      await this.continueToNextNode(node, freshAutomation, context, functionName);
      return { action: 'execution_paused', toolCall: functionName };
    }

    // No tool called. Send the response message text to the user and pause to stay in takeover state.
    if (responseText) {
      await this.sendOutgoingResponse(responseText, nodeData, getContact, effectiveChannelId, context, automation);
    }

    const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;
    const pendingExecution: PendingExecution = {
      executionId: context.executionId,
      automationId: context.automationId,
      nodeId: node.nodeId,
      nodeType: 'ai_agent',
      conversationId: context.conversationId,
      contactId: context.contactId,
      context: { ...context },
      timestamp: new Date(),
      status: 'waiting_for_response',
      expectedButtons: []
    };

    this.pendingExecutions.set(pendingId, pendingExecution);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _userReply_waiting: true,
          _userReply_nodeId: node.nodeId,
          _userReply_nodeType: 'ai_agent',
          _userReply_saveAs: null,
          _userReply_expectedButtons: [],
        },
        result: `AI Agent Takeover active. Waiting for user response.`
      })
      .where(eq(automationExecutions.id, context.executionId));

    console.log(`[AI Agent] Paused execution ${context.executionId} on node ${node.nodeId} (takeover)`);
    return { action: 'execution_paused', response: responseText };
  }

  private async sendOutgoingResponse(
    responseText: string,
    nodeData: any,
    getContact: any,
    effectiveChannelId: string | null,
    context: ExecutionContext,
    automation: any
  ) {
    if (!responseText) return;

    const aiVoiceEnabled = nodeData.aiVoiceEnabled === true;
    const voiceProfileId = nodeData.voiceProfileId;

    let voiceProfile: any = null;
    if (aiVoiceEnabled && voiceProfileId) {
      voiceProfile = await db.query.voiceProfiles.findFirst({
        where: eq(voiceProfiles.id, voiceProfileId),
      });
    }

    if (aiVoiceEnabled && voiceProfile) {
      try {
        const freshAutomation = automation || await this.getAutomationWithFlow(context.automationId);
        let sarvamApiKey = "";
        if (freshAutomation?.createdBy) {
          const ownerUser = await db.query.users.findFirst({
            where: eq(users.id, freshAutomation.createdBy),
          });
          sarvamApiKey = ownerUser?.sarvamApiKey || "";
        }
        if (!sarvamApiKey) {
          const [defaultUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, "awadnajilp@gmail.com"))
            .limit(1);
          sarvamApiKey = defaultUser?.sarvamApiKey || "";
        }

        if (sarvamApiKey) {
          console.log(`[AI Agent Voice] Synthesizing speech via ${voiceProfile.provider} for voice ${voiceProfile.name}...`);
          const provider = VoiceManager.getProvider(voiceProfile.provider);
          const audioBuffer = await provider.synthesize(
            responseText,
            voiceProfile.voiceId,
            nodeData.voiceLanguage || voiceProfile.languageCode || "en-IN",
            { apiKey: sarvamApiKey }
          );

          // Save buffer to a local temporary file to upload
          const tempFilename = `tts_${Date.now()}_${randomUUID().substring(0, 8)}.mp3`;
          const tempPath = path.join("uploads", "media", tempFilename);
          const dir = path.dirname(tempPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(tempPath, audioBuffer);

          const getChannel = await db.query.channels.findFirst({
            where: eq(channels.id, effectiveChannelId || ""),
          });

          let messageId = "";
          if (getChannel) {
            const waApi = new WhatsAppApiService(getChannel);
            if (getChannel.connectionMethod === "qr_code") {
              const res = await BaileysManager.sendMediaMessage(
                getChannel.id,
                getContact.phone,
                { buffer: audioBuffer, mimeType: "audio/mp4" },
                ""
              );
              messageId = res?.messages?.[0]?.id || `voice_${randomUUID()}`;
            } else {
              const mediaId = await waApi.uploadMedia(tempPath, "audio/mpeg");
              const res = await waApi.sendMediaMessagee(getContact.phone, mediaId, "audio");
              messageId = res?.messages?.[0]?.id || mediaId;
            }
          }

          // Write text message to inbox/database so agents can read it
          const createdMessage = await storage.createMessage({
            conversationId: context.conversationId,
            content: responseText,
            status: "sent",
            fromUser: false,
            whatsappMessageId: messageId || `voice_${randomUUID()}`,
          });

          await storage.updateConversation(context.conversationId, {
            lastMessageAt: new Date(),
            lastMessageText: responseText,
          });

          if ((global as any).broadcastToConversation) {
            (global as any).broadcastToConversation(context.conversationId, {
              type: "new-message",
              message: createdMessage,
            });
          }
          return;
        }
      } catch (voiceErr) {
        console.error("[AI Agent Voice] TTS synthesis or transmission failed, falling back to text:", voiceErr);
      }
    }

    // Fallback: normal text message send
    await sendBusinessMessage({
      to: getContact.phone,
      message: responseText,
      channelId: effectiveChannelId || undefined,
      conversationId: context.conversationId,
    });
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmed = varName.trim();
      const val = this.resolveVariable(trimmed, variables);
      return val !== undefined ? String(val) : match;
    });
  }

  private resolveVariable(path: string, variables: Record<string, any>): any {
    if (variables[path] !== undefined) return variables[path];

    const parts = path.split('.');
    let current: any = variables;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  }

  getPendingExecutions() {
    return Array.from(this.pendingExecutions.entries()).map(([pendingId, execution]) => ({
      pendingId,
      executionId: execution.executionId,
      conversationId: execution.conversationId,
      nodeId: execution.nodeId,
      contactId: execution.contactId,
      saveAs: execution.saveAs,
      timestamp: execution.timestamp,
      waitingTime: Date.now() - execution.timestamp.getTime()
    }));
  }

  hasPendingExecution(conversationId: string): boolean {
    return this.findPendingExecutionByConversation(conversationId) !== null;
  }

  async hasPendingExecutionAsync(conversationId: string): Promise<boolean> {
    if (this.findPendingExecutionByConversation(conversationId)) return true;
    const dbResult = await this.findPendingExecutionByConversationFromDb(conversationId);
    return dbResult !== null;
  }

  async cleanupExpiredExecutions(timeoutMs: number = 30 * 60 * 1000) { // 30 minutes default
    const now = Date.now();
    const expired: { pendingId: string; execution: PendingExecution }[] = [];

    for (const [pendingId, execution] of this.pendingExecutions.entries()) {
      if (now - execution.timestamp.getTime() > timeoutMs) {
        expired.push({ pendingId, execution });
      }
    }
    
    for (const { pendingId, execution } of expired) {
      this.pendingExecutions.delete(pendingId);
      
      // Mark execution as failed due to timeout
      await this.completeExecution(
        execution.executionId,
        'failed',
        'Execution timed out waiting for user response'
      );
      
      console.warn(`⚠️  Cleaned up expired execution: ${pendingId} (conversation: ${execution.conversationId})`);
    }
    
    return expired.length;
  }

  async cancelExecution(conversationId: string): Promise<boolean> {
    const pending = this.findPendingExecutionByConversation(conversationId);
    if (pending) {
      this.pendingExecutions.delete(pending.pendingId);
      await this.completeExecution(pending.executionId, 'failed', 'Execution cancelled by user');
      console.log(`❌ Cancelled execution for conversation: ${conversationId}`);
      return true;
    }
    return false;
  }

  private async completeExecution(executionId: string, status: 'completed' | 'failed', result: string) {
    await db.update(automationExecutions)
      .set({
        status,
        completedAt: new Date(),
        result
      })
      .where(eq(automationExecutions.id, executionId));

    console.log(`🏁 Execution ${executionId} ${status}: ${result}`);
  }

  private async logNodeExecution(
    executionId: string,
    nodeId: string,
    nodeType: string,
    status: string,
    input: any,
    output: any,
    error: string | null
  ) {
    await db.insert(automationExecutionLogs).values({
      executionId,
      nodeId,
      nodeType,
      status,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      error
    });
  }

  private async getAutomationWithFlow(automationId: string) {
    // Get automation
    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, automationId),
      with: {
        nodes: true,
        edges: true,
      },
    });
  
    return automation;
  }
}

// Trigger Manager - handles when automations should start
export class AutomationTriggerService {
  private executionService: AutomationExecutionService;

  constructor() {
    this.executionService = new AutomationExecutionService();
  }

  /**
   * Handle new conversation trigger
   */
  async handleNewConversation(conversationId: string, channelId: string, contactId?: string): Promise<boolean> {
    console.log(`🎯 New conversation trigger: ${conversationId}`);
    
    // Find active automations with "new_conversation" trigger
    const activeAutomations = await db.select()
      .from(automations)
      .where(and(
        eq(automations.channelId, channelId),
        eq(automations.trigger, 'new_conversation'),
        eq(automations.status, 'active')
      ));

    console.log(`Found ${activeAutomations.length} active automation(s)`);

    if (activeAutomations.length === 0) {
      return false;
    }

    // Start execution for each automation
    for (const automation of activeAutomations) {
      try {
        const [execution] = await db.insert(automationExecutions).values({
          automationId: automation.id,
          contactId,
          conversationId,
          triggerData: {
            trigger: 'new_conversation',
            channelId,
            timestamp: new Date()
          },
          status: 'running'
        }).returning();

        await this.executionService.executeAutomation(execution.id);

      } catch (error) {
        console.error(`Failed to execute automation ${automation.id}:`, error);
      }
    }

    return true;
  }

  /**
   * Handle message received trigger - ENHANCED for conditions
   */
  // async handleMessageReceived(conversationId: string, message: any, channelId: string, contactId?: string) {
  //   console.log(`💬 Message received trigger: ${conversationId}`);
    
  //   // First, check if this is a response to a pending user_reply node
  //   if (this.executionService.hasPendingExecution(conversationId)) {
  //     console.log(`📨 Processing as user response to pending execution`);
  //     try {
  //       await this.executionService.handleUserResponse(conversationId, message.content || message.text || message, message.interactive);
  //       return; // Don't trigger new automations if this was a response
  //     } catch (error) {
  //       console.error(`Error handling user response:`, error);
  //       // Continue to trigger new automations as fallback
  //     }
  //   }
    
  //   // Normal message-based automation triggers
  //   const activeAutomations = await db.select()
  //     .from(automations)
  //     .where(and(
  //       eq(automations.channelId, channelId),
  //       eq(automations.trigger, 'message_received'),
  //       eq(automations.status, 'active')
  //     ));

  //   for (const automation of activeAutomations) {
  //     try {
  //       const [execution] = await db.insert(automationExecutions).values({
  //         automationId: automation.id,
  //         contactId,
  //         conversationId,
  //         triggerData: {
  //           trigger: 'message_received',
  //           message,
  //           channelId,
  //           timestamp: new Date()
  //         },
  //         status: 'running'
  //       }).returning();

  //       await this.executionService.executeAutomation(execution.id);
  //     } catch (error) {
  //       console.error(`Failed to execute automation ${automation.id}:`, error);
  //     }
  //   }
  // }

  async handleMessageReceived(conversationId: string, message: any, channelId: string, contactId?: string): Promise<boolean> {
    console.log(`💬 Message received trigger: ${conversationId}`);
    console.log(`🔍 Channel ID: ${channelId}, Contact ID: ${contactId}`);
    console.log(`📝 Message: "${message.content || message.text || message}"`);
    
    // First, check if this is a response to a pending user_reply node
    if (this.executionService.hasPendingExecution(conversationId)) {
      console.log(`📨 Processing as user response to pending execution`);
      try {
        await this.executionService.handleUserResponse(conversationId, message.content || message.text || message, message.interactive);
        return true; // Pending execution handled this message
      } catch (error) {
        console.error(`Error handling user response:`, error);
        // Fall through to try new automation triggers
      }
    }
    
    // Find active automations with 'message_received' trigger only
    const activeAutomations = await db.select()
      .from(automations)
      .where(and(
        eq(automations.channelId, channelId),
        eq(automations.trigger, 'message_received'),
        eq(automations.status, 'active')
      ));
  
    console.log(`🎯 Found ${activeAutomations.length} active message_received automation(s)`);
    
    if (activeAutomations.length === 0) {
      return false;
    }

    // Resolve the incoming WhatsApp message ID for deduplication
    const whatsappMessageId: string | null =
      message.whatsappMessageId ?? message.id ?? null;

    for (const automation of activeAutomations) {
      console.log(`🚀 Starting automation: ${automation.id} - "${automation.name}"`);
      
      try {
        // Check if automation has nodes
        const nodeCount = await db.select({ count: sql`count(*)` })
          .from(automationNodes)
          .where(eq(automationNodes.automationId, automation.id));
          
        if (!nodeCount[0]?.count || nodeCount[0].count === 0) {
          console.warn(`⚠️ Automation ${automation.id} has no nodes, skipping`);
          continue;
        }

        // Atomic idempotency: the unique index on (automationId, conversationId, triggerMessageId)
        // prevents concurrent duplicates at the DB level. onConflictDoNothing() turns a unique
        // violation into a no-op so Meta webhook retries are silently dropped.
        const inserted = await db.insert(automationExecutions).values({
          automationId: automation.id,
          contactId,
          conversationId,
          triggerMessageId: whatsappMessageId,
          triggerData: {
            trigger: 'message_received',
            whatsappMessageId,
            message,
            channelId,
            timestamp: new Date()
          },
          status: 'running'
        }).onConflictDoNothing().returning();

        if (!inserted || inserted.length === 0) {
          console.log(`⏭️ Skipping duplicate execution for automation ${automation.id} (message ${whatsappMessageId} already processed)`);
          continue;
        }

        const execution = inserted[0];
        console.log(`✅ Created execution record: ${execution.id}`);
        
        await this.executionService.executeAutomation(execution.id);
        
        console.log(`🎉 Automation ${automation.id} execution completed`);
        
      } catch (error) {
        console.error(`❌ Failed to execute automation ${automation.id}:`, error);
        console.error(`Stack trace:`,  (error as Error).stack);
      }
    }

    return true;
  }

  /**
   * Get execution service for external access
   */
  getExecutionService() {
    return this.executionService;
  }
}

// Export singleton instances
export const executionService = new AutomationExecutionService();
export const triggerService = new AutomationTriggerService();

// Periodic cleanup (run this somewhere in your app)
setInterval(() => {
  executionService.cleanupExpiredExecutions();
}, 5 * 60 * 1000); // Every 5 minutes