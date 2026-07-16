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

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { useTranslation } from "@/lib/i18n";
import { normalizeTime } from "./utils";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import { AISettingsDialog } from "./AISettingsDialog";
import type { Message, ConversationWithContact } from "./types";
import type { Conversation, Contact } from "@shared/schema";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  // AI Settings Dialog State
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [aiSettingsTarget, setAiSettingsTarget] = useState<"inbox" | "contact">("inbox");
  const [aiSettingsData, setAiSettingsData] = useState<any>({});
  const [currentConversationAiEnabled, setCurrentConversationAiEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();
  const { socket } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedConversationRef = useRef(selectedConversation);
  const activeChannelRef = useRef<any>(null);
  const templateRefetchTimersRef = useRef<NodeJS.Timeout[]>([]);

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`channels/active ${response.status}`);
      return await response.json();
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: 30 * 1000,
  });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Reset selected tag when active channel changes
  useEffect(() => {
    setSelectedTag(null);
  }, [activeChannel?.id]);

  const { data: channelTags = [], refetch: refetchTags } = useQuery({
    queryKey: ["/api/tags", activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await apiRequest("GET", `/api/tags?channelId=${activeChannel.id}`);
      if (!res.ok) throw new Error("Failed to load tags");
      return await res.json();
    },
    enabled: !!activeChannel?.id,
  });

  const tagsColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(channelTags)) {
      for (const tag of channelTags) {
        map[tag.name] = tag.color;
      }
    }
    return map;
  }, [channelTags]);

  const onCreateTag = async (name: string, color: string) => {
    if (!activeChannel?.id) return;
    const res = await apiRequest("POST", "/api/tags", {
      name,
      color,
      channelId: activeChannel.id,
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to create tag");
    }
    await refetchTags();
    toast({
      title: "Tag Created",
      description: `Tag "${name}" has been created successfully.`,
    });
  };

  const onUpdateConversationTags = async (tagsList: string[]) => {
    if (!selectedConversation?.id) return;
    const res = await apiRequest("POST", `/api/tags/conversations/${selectedConversation.id}/tags`, {
      tags: tagsList,
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to update tags");
    }
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    setSelectedConversation(prev => prev ? { ...prev, tags: tagsList } : null);
    toast({
      title: "Tags Updated",
      description: "Conversation tags updated successfully.",
    });
  };

  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery({
      queryKey: ["/api/conversations", activeChannel?.id, selectedTag],
      queryFn: async () => {
        const response = await api.getConversations(activeChannel?.id, selectedTag || undefined);
        if (!response.ok) {
          throw new Error(`Failed to load conversations: ${response.status}`);
        }
        return await response.json();
      },
      enabled: !!activeChannel,
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: 1,
      retryDelay: 2000,
      throwOnError: false,
    });

  const { data: messagesPage, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    queryFn: async () => {
      if (!selectedConversation?.id) return { messages: [] as Message[], hasMore: false };
      const response = await api.getMessages(selectedConversation.id);
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      const data: Message[] = await response.json();
      const hasMore = response.headers.get("x-has-more") === "true";
      return { messages: data, hasMore };
    },
    enabled: !!selectedConversation?.id,
    staleTime: 30000,
    retry: 1,
    retryDelay: 2000,
    throwOnError: false,
  });

  const freshMessages: Message[] = messagesPage?.messages ?? [];
  const messages: Message[] = (() => {
    const seen = new Set<string>();
    const merged: Message[] = [];
    for (const m of [...olderMessages, ...freshMessages]) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        merged.push(m);
      }
    }
    return merged;
  })();

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    (window as any).activeConversationId = selectedConversation?.id || null;
    if (selectedConversation) {
      setCurrentConversationAiEnabled((selectedConversation as any).aiEnabled || false);
      
      // Mark as read if there are unread messages
      if (selectedConversation.unreadCount && selectedConversation.unreadCount > 0) {
        queryClient.setQueryData(
          ["/api/conversations", activeChannel?.id, selectedTag],
          (old: any[]) => {
            if (!Array.isArray(old)) return [];
            return old.map((conv) =>
              conv.id === selectedConversation.id ? { ...conv, unreadCount: 0 } : conv
            );
          }
        );
        
        apiRequest("PUT", `/api/conversations/${selectedConversation.id}/read`).catch((err) => {
          console.error("❌ Failed to mark conversation as read:", err);
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
      }
    }
    return () => {
      (window as any).activeConversationId = null;
    };
  }, [selectedConversation, activeChannel?.id, selectedTag, queryClient]);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const handleOpenInboxAiSettings = async () => {
    if (!activeChannel) return;
    try {
      const res = await apiRequest("GET", `/api/channels/${activeChannel.id}/inbox-ai-settings`);
      const data = await res.json();
      setAiSettingsTarget("inbox");
      setAiSettingsData(data.inboxAiSettings || {});
      setIsAiSettingsOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch default inbox AI settings",
        variant: "destructive",
      });
    }
  };

  const handleOpenContactAiSettings = async () => {
    if (!selectedConversation) return;
    try {
      const res = await apiRequest("GET", `/api/conversations/${selectedConversation.id}/ai-settings`);
      const data = await res.json();
      setAiSettingsTarget("contact");
      setAiSettingsData(data.aiSettings || {});
      setCurrentConversationAiEnabled(data.aiEnabled || false);
      setIsAiSettingsOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch contact AI settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveAiSettings = async (settings: any, enabled?: boolean) => {
    try {
      if (aiSettingsTarget === "inbox") {
        if (!activeChannel) return;
        await apiRequest("POST", `/api/channels/${activeChannel.id}/inbox-ai-settings`, {
          inboxAiSettings: settings,
        });
        toast({
          title: "Success",
          description: "Default inbox AI settings updated",
        });
      } else {
        if (!selectedConversation) return;
        await apiRequest("POST", `/api/conversations/${selectedConversation.id}/ai-settings`, {
          aiEnabled: enabled !== undefined ? enabled : currentConversationAiEnabled,
          aiSettings: settings,
        });
        
        setSelectedConversation(prev => prev ? { 
          ...prev, 
          aiEnabled: enabled !== undefined ? enabled : currentConversationAiEnabled,
          aiSettings: settings
        } as any : null);
        
        if (enabled !== undefined) {
          setCurrentConversationAiEnabled(enabled);
        }

        toast({
          title: "Success",
          description: "Contact-wise AI settings updated",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save AI settings",
        variant: "destructive",
      });
    }
  };

  const handleToggleAi = async (enabled: boolean) => {
    if (!selectedConversation) return;
    try {
      const currentSettings = (selectedConversation as any).aiSettings || {};
      await apiRequest("POST", `/api/conversations/${selectedConversation.id}/ai-settings`, {
        aiEnabled: enabled,
        aiSettings: currentSettings,
      });

      setSelectedConversation(prev => prev ? { 
        ...prev, 
        aiEnabled: enabled 
      } as any : null);
      
      setCurrentConversationAiEnabled(enabled);

      toast({
        title: "Success",
        description: enabled ? "AI Agent takeover enabled" : "AI Agent takeover disabled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle AI status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setOlderMessages([]);
    setHasMoreMessages(false);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (messagesPage) {
      setHasMoreMessages(messagesPage.hasMore);
    }
  }, [messagesPage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadOlderMessages = async () => {
    if (!selectedConversation?.id || loadingOlderMessages) return;
    const oldestMessage = messages[0];
    if (!oldestMessage?.createdAt) return;
    setLoadingOlderMessages(true);
    try {
      const beforeTs = typeof oldestMessage.createdAt === "string"
        ? oldestMessage.createdAt
        : (oldestMessage.createdAt as Date).toISOString();
      const response = await api.getMessages(selectedConversation.id, `${beforeTs}__${oldestMessage.id}`);
      if (response.ok) {
        const olderData: Message[] = await response.json();
        const moreAvailable = response.headers.get("x-has-more") === "true";
        setOlderMessages(prev => {
          const seenIds = new Set(prev.map(m => m.id));
          const fresh = olderData.filter(m => !seenIds.has(m.id));
          return [...fresh, ...prev];
        });
        setHasMoreMessages(moreAvailable);
      }
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // ✅ 1. JOIN CHANNEL ROOM
  useEffect(() => {
    if (!socket || !activeChannel?.id || !user?.id) return;

    console.log("🔗 [Inbox] Joining channel room:", activeChannel.id);
    socket.emit("join_all_conversations", {
      channelId: activeChannel.id,
      userId: user.id,
    });
  }, [socket, activeChannel?.id, user?.id]);

  // ✅ 2. JOIN CONVERSATION ROOM
  useEffect(() => {
    if (!selectedConversation || !socket || !user?.id) return;

    const room = selectedConversation.id;
    console.log("🔗 [Inbox] Joining conversation room:", room);

    socket.emit("join_conversation", {
      conversationId: room,
      userId: user.id,
    });

    return () => {
      console.log("🚪 [Inbox] Leaving conversation room:", room);
      socket.emit("leave_conversation", {
        conversationId: room,
        userId: user.id,
      });
    };
  }, [selectedConversation?.id, socket, user?.id]);

  // ✅ 3. SOCKET LISTENERS
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      console.log("🔥 [Inbox] Incoming message:", data);

      const conversationId = data.conversationId;
      const channelId = activeChannelRef.current?.id;

      const lastMessageText =
        typeof data?.message?.content === "string"
          ? data.message.content
          : typeof data?.content === "string"
          ? data.content
          : "[Media]";

      const lastMessageAt =
        typeof data?.createdAt === "number"
          ? data.createdAt
          : typeof data?.createdAt === "string"
          ? Date.parse(data.createdAt)
          : Date.now();

      if (channelId) {
        queryClient.setQueryData(
          ["/api/conversations", channelId],
          (old: any[]) => {
            if (!Array.isArray(old)) return [];

            return old
              .map((conv) =>
                conv.id === conversationId
                  ? {
                      ...conv,
                      lastMessageText,
                      lastMessageAt,
                      unreadCount:
                        selectedConversationRef.current?.id === conversationId
                          ? 0
                          : (conv.unreadCount || 0) + 1,
                    }
                  : conv
              )
              .sort(
                (a, b) =>
                  normalizeTime(b.lastMessageAt) -
                  normalizeTime(a.lastMessageAt)
              );
          }
        );
      }

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      if (selectedConversationRef.current?.id === conversationId) {
        const incomingMsg = data.message || {
          id: data.id || `temp_${Date.now()}`,
          conversationId,
          content: lastMessageText,
          fromUser: data.fromUser ?? (data.from === "business_app" || data.from === "agent"),
          direction: data.direction ?? (data.from === "business_app" || data.from === "agent" ? "outbound" : "inbound"),
          messageType: data.messageType || "text",
          createdAt: new Date(lastMessageAt).toISOString(),
          status: data.status || "received",
        };

        const isMsgInbound = incomingMsg.direction === "inbound" || 
          (data.direction === "inbound" || (!data.fromUser && data.from !== "business_app" && data.from !== "agent"));
        
        if (isMsgInbound) {
          apiRequest("PUT", `/api/conversations/${conversationId}/read`).catch((err) => {
            console.error("❌ Failed to mark incoming message as read:", err);
          });
        }

        queryClient.setQueryData(
          ["/api/conversations", conversationId, "messages"],
          (old: any) => {
            if (!old) return old;
            const messagesList = Array.isArray(old) ? old : (old.messages || []);
            const hasMore = old.hasMore ?? false;

            const exists = messagesList.some((m: any) => m.id === incomingMsg.id);
            if (exists) return old;

            const updatedMessages = [...messagesList, incomingMsg];
            return Array.isArray(old)
              ? updatedMessages
              : { messages: updatedMessages, hasMore };
          }
        );

        queryClient.invalidateQueries({
          queryKey: [
            "/api/conversations",
            conversationId,
            "messages",
          ],
        });
        
        queryClient.refetchQueries({
          queryKey: [
            "/api/conversations",
            conversationId,
            "messages",
          ],
        });
      }
    };

    const handleConversationCreated = (data: any) => {
      console.log("🔥 [Inbox] conversation_created event received", data);
      const channelId = activeChannelRef.current?.id;
      if (data?.conversation && channelId) {
        queryClient.setQueryData(
          ["/api/conversations", channelId],
          (old: any[]) => {
            const list = Array.isArray(old) ? old : [];
            const exists = list.some((c) => c.id === data.conversation.id);
            if (exists) return list;
            return [data.conversation, ...list];
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    const handleMessageSent = (data: any) => {
      console.log("📩 [Inbox] message_sent event received:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", data.conversationId, "messages"]
        });
      }
    };

    const handleUserTyping = (data: any) => {
      if (selectedConversationRef.current?.id === data.conversationId) {
        setIsTyping(true);
        setTypingUser("Visitor");
      }
    };

    const handleUserStoppedTyping = (data: any) => {
      if (selectedConversationRef.current?.id === data.conversationId) {
        setIsTyping(false);
        setTypingUser("");
      }
    };

    const handleMessageStatusUpdate = (data: any) => {
      const { conversationId, whatsappMessageId, status, errorDetails } = data;
      console.log("📬 [Inbox] message_status_update received:", { conversationId, whatsappMessageId, status });

      if (selectedConversationRef.current?.id === conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", conversationId, "messages"],
        });
      }
    };

    const handleConversationAiToggled = (data: any) => {
      const { conversationId, aiEnabled } = data;
      console.log(`🤖 [Inbox] conversation-ai-toggled event received for ${conversationId}:`, aiEnabled);

      if (selectedConversationRef.current?.id === conversationId) {
        setCurrentConversationAiEnabled(aiEnabled);
        setSelectedConversation((prev) => prev ? { ...prev, aiEnabled } : null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    const handleConversationUpdated = (data: any) => {
      if (selectedConversationRef.current?.id === data.id) {
        setSelectedConversation((prev) => prev ? { ...prev, tags: data.tags } : null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    socket.on("conversation-updated", handleConversationUpdated);
    socket.on("contact-updated", handleConversationUpdated);
    socket.on("new-message", handleNewMessage);
    socket.on("new_message", handleNewMessage);
    socket.on("conversation_created", handleConversationCreated);
    socket.on("message_sent", handleMessageSent);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);
    socket.on("message_status_update", handleMessageStatusUpdate);
    socket.on("conversation-ai-toggled", handleConversationAiToggled);

    return () => {
      socket.off("conversation-updated", handleConversationUpdated);
      socket.off("contact-updated", handleConversationUpdated);
      socket.off("new-message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off("conversation_created", handleConversationCreated);
      socket.off("message_sent", handleMessageSent);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
      socket.off("message_status_update", handleMessageStatusUpdate);
      socket.off("conversation-ai-toggled", handleConversationAiToggled);
    };
  }, [socket, queryClient]);


  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string; replyToMessageId?: string | null }) => {
      const response = await fetch(
        `/api/conversations/${data.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: data.content,
            fromUser: true,
            fromType: "agent",
            replyToMessageId: data.replyToMessageId,
            agentId: user?.id,
            agentName:
              `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
              user?.username,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      if (socket && selectedConversation) {
        socket.emit("agent_send_message", {
          conversationId: selectedConversation.id,
          content: messageText,
          agentId: user?.id,
          agentName:
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            user?.username,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      setMessageText("");
      setReplyToMessage(null);

      if (socket && selectedConversation) {
        socket.emit("agent_stopped_typing", {
          conversationId: selectedConversation.id,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMessageText(e.target.value);

    if (!socket || !selectedConversation) return;

    socket.emit("agent_typing", {
      conversationId: selectedConversation.id,
      agentName:
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        user?.username,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("agent_stopped_typing", {
        conversationId: selectedConversation.id,
      });
    }, 2000);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { conversationId: string; status: string }) => {
      const response = await fetch(
        `/api/conversations/${data.conversationId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: data.status }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (socket) {
        socket.emit("conversation_status_changed", {
          conversationId: variables.conversationId,
          status: variables.status,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTemplateMutation = useMutation({
    mutationFn: async (data: {
      conversationId: string;
      templateName: string;
      phoneNumber: string;
      parameters?: { type?: string; value?: string }[];
      mediaId?: string;
      headerType?: string | null;
      buttonParameters?: string[];
      expirationTimeMs?: number;
      carouselCardMediaIds?: Record<number, string>;
    }) => {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.phoneNumber,
          templateName: data.templateName,
          channelId: selectedConversation?.channelId,
          headerType: data.headerType ? data.headerType.toUpperCase() : undefined,
          parameters: data.parameters || [],
          mediaId: data.mediaId,
          buttonParameters: data.buttonParameters,
          expirationTimeMs: data.expirationTimeMs,
          ...(data.carouselCardMediaIds ? { carouselCardMediaIds: data.carouselCardMediaIds } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send template");
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });
      toast({
        title: "Template submitted",
        description: "Your template message has been submitted for delivery.",
      });
    },
  });


  const handleStartNewChat = async (phoneNumber: string, name?: string) => {
    if (!activeChannel) {
      toast({
        title: "No Active Channel",
        description: "Please configure an active channel first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/conversations/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          name: name || phoneNumber,
          channelId: activeChannel.id,
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to start conversation");
      }

      const data = await response.json();
      
      // Invalidate query to refresh conversations list
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      // Select the conversation
      setSelectedConversation(data);

      toast({
        title: "Success",
        description: `Started conversation with ${phoneNumber}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: messageText.trim(),
      replyToMessageId: replyToMessage?.id || null,
    });
  };

  const handleSelectTemplate = (template: any, variables: { type?: string; value?: string }[], mediaId?: string, headerType?: string | null, buttonParameters?: string[], expirationTimeMs?: number, carouselCardMediaIds?: Record<number, string>) => {
    if (!selectedConversation) return;

    sendTemplateMutation.mutate({
      conversationId: selectedConversation.id,
      templateName: template.name,
      phoneNumber: selectedConversation.contactPhone || "",
      parameters: variables,
      mediaId: mediaId,
      headerType: headerType as any,
      buttonParameters,
      expirationTimeMs,
      ...(carouselCardMediaIds && Object.keys(carouselCardMediaIds).length > 0 ? { carouselCardMediaIds } : {}),
    });
  };

  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    const formData = new FormData();
    formData.append("media", file);
    formData.append("fromUser", "true");
    formData.append("conversationId", selectedConversation.id);
    formData.append("caption", messageText || "");

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send media");
      }

      toast({
        title: "Success",
        description: "Media sent successfully",
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation.id, "messages"],
      });
      setMessageText("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  const handleSendVoiceNote = async (file: File) => {
    if (!selectedConversation) return;

    const formData = new FormData();
    formData.append("media", file);
    formData.append("fromUser", "true");
    formData.append("conversationId", selectedConversation.id);
    formData.append("isVoiceNote", "true");
    formData.append("caption", "");

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send voice note");
      }

      toast({
        title: "Success",
        description: "Voice note sent successfully",
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation.id, "messages"],
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateConversationStatus = (status: string) => {
    if (!selectedConversation) return;

    updateStatusMutation.mutate({
      conversationId: selectedConversation.id,
      status: status,
    });
  };

  const handleViewContact = () => {
    if (!selectedConversation || !selectedConversation.contactId) return;
    window.location.href = `/contacts?id=${selectedConversation.contactId}&phone=${selectedConversation.contactPhone || ""}`;
  };

  const handleArchiveChat = async () => {
    if (!selectedConversation) return;

    try {
      await apiRequest(
        "PATCH",
        `/api/conversations/${selectedConversation.id}`,
        { status: "archived" }
      );

      toast({
        title: "Chat Archived",
        description: "This conversation has been archived",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive chat",
        variant: "destructive",
      });
    }
  };

  const handleBlockContact = async () => {
    if (!selectedConversation || !selectedConversation.contactId) return;

    try {
      await apiRequest(
        "PATCH",
        `/api/contacts/${selectedConversation.contactId}`,
        { status: "blocked" }
      );

      toast({
        title: "Contact Blocked",
        description: "This contact has been blocked",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this chat? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await apiRequest(
        "DELETE",
        `/api/conversations/${selectedConversation.id}`
      );

      toast({
        title: "Chat Deleted",
        description: "This conversation has been deleted",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const updateConversationMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const response = await fetch(`/api/conversations/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update conversation");
      }

      return result;
    },
    onSuccess: (updatedConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(updatedConversation);
      toast({
        title: "Success",
        description: "Conversation updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignConversation = (
    assignedTo: string,
    assignedToName: string
  ) => {
    if (!selectedConversation) return;

    updateConversationMutation.mutate({
      id: selectedConversation.id,
      updates: {
        assignedTo,
        assignedToName,
        assignedAt: new Date().toISOString(),
        status: assignedTo ? "assigned" : "open",
      },
    });
  };

  const filteredConversations = conversations.filter((conv: any) => {
    if (user?.showOnlyAssigned && conv.assignedTo !== user?.id) {
      return false;
    }

    const matchesSearch =
      conv.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contactPhone?.includes(searchQuery) ||
      conv.contactName?.toLowerCase().includes(searchQuery.toLowerCase());

    switch (filterTab) {
      case "unread":
        return matchesSearch && (conv.unreadCount || 0) > 0;
      case "open":
        return matchesSearch && conv.status === "open";
      case "resolved":
        return matchesSearch && conv.status === "resolved";
      case "whatsapp":
        return matchesSearch && conv.type === "whatsapp";
      case "chatbot":
        return matchesSearch && conv.type === "chatbot";
      case "assigned":
        return (
          matchesSearch &&
          conv.status === "assigned" &&
          (user?.role === "admin" || conv.assignedTo === user?.id)
        );
      default:
        return matchesSearch;
    }
  });

  const is24HourWindowExpired =
    selectedConversation?.type === "whatsapp" &&
    normalizeTime((selectedConversation as any)?.lastIncomingMessageAt || selectedConversation?.lastMessageAt) > 0
      ? Date.now() -
          normalizeTime((selectedConversation as any)?.lastIncomingMessageAt || selectedConversation?.lastMessageAt) >
        24 * 60 * 60 * 1000
      : false;


  if (!activeChannel) {
    return (
      <div className="h-screen max-h-[100dvh] w-full max-w-full flex flex-col overflow-hidden">
        <Header title={t("inbox.title")} />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={MessageCircle}
            title="No Active Channel"
            description="Please select a channel from the channel switcher to view conversations."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-[100dvh] w-full max-w-full flex flex-col overflow-hidden">
      <div className={selectedConversation ? "hidden md:block" : "block"}>
        <Header title={t("inbox.title")} />
      </div>

      <div className="flex-1 flex bg-gray-50 overflow-hidden">
        <ConversationList
          conversations={filteredConversations}
          conversationsLoading={conversationsLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterTab={filterTab}
          onFilterTabChange={setFilterTab}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          user={user}
          onStartNewChat={handleStartNewChat}
          onOpenAiSettings={handleOpenInboxAiSettings}
          tagsColorMap={tagsColorMap}
          channelTags={channelTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />

        {selectedConversation ? (
          <MessageThread
            selectedConversation={selectedConversation}
            messages={messages}
            messagesLoading={messagesLoading}
            isTyping={isTyping}
            typingUser={typingUser}
            user={user}
            messageText={messageText}
            onTyping={handleTyping}
            onSendMessage={handleSendMessage}
            onFileAttachment={handleFileAttachment}
            onFileChange={handleFileChange}
            onSendVoiceNote={handleSendVoiceNote}
            onSelectTemplate={handleSelectTemplate}
            is24HourWindowExpired={is24HourWindowExpired}
            activeChannelId={activeChannel?.id}
            sendMessagePending={sendMessageMutation.isPending}
            fileInputRef={fileInputRef}
            messagesEndRef={messagesEndRef}
            onBack={() => setSelectedConversation(null)}
            onUpdateStatus={updateConversationStatus}
            onViewContact={handleViewContact}
            onArchiveChat={handleArchiveChat}
            onBlockContact={handleBlockContact}
            onDeleteChat={handleDeleteChat}
            onAssignConversation={handleAssignConversation}
            hasMoreMessages={hasMoreMessages}
            onLoadMoreMessages={loadOlderMessages}
            loadingMoreMessages={loadingOlderMessages}
            replyToMessage={replyToMessage}
            onReply={setReplyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            onSelectLocalTemplate={(text) => setMessageText(text)}
            onOpenContactAiSettings={handleOpenContactAiSettings}
            aiEnabled={currentConversationAiEnabled}
            onToggleAi={handleToggleAi}
            channelTags={channelTags}
            onUpdateConversationTags={onUpdateConversationTags}
            onCreateTag={onCreateTag}
            tagsColorMap={tagsColorMap}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      <AISettingsDialog
        open={isAiSettingsOpen}
        onOpenChange={setIsAiSettingsOpen}
        title={aiSettingsTarget === "inbox" ? "Default Inbox AI settings" : `AI settings for ${selectedConversation?.contactName || "Contact"}`}
        initialSettings={aiSettingsData}
        isContactOverride={aiSettingsTarget === "contact"}
        aiEnabled={currentConversationAiEnabled}
        contactId={selectedConversation?.contactId}
        channelId={selectedConversation?.channelId}
        onSave={handleSaveAiSettings}
      />
    </div>
  );
}
