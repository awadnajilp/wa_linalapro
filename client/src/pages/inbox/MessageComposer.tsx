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

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Paperclip,
  AlertCircle,
  X,
  BookOpen,
  Mic,
  Trash2
} from "lucide-react";
import { TemplatePickerDialog } from "@/components/shared/TemplatePickerDialog";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Conversation } from "@shared/schema";
import type { Message } from "./types";
import { maskContent } from "@/utils/maskUtils";

interface MessageComposerProps {
  selectedConversation: Conversation;
  messageText: string;
  onTyping: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onFileAttachment: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSendVoiceNote?: (file: File) => void;
  onSelectTemplate: (template: any, variables: { type?: string; value?: string }[], mediaId?: string, headerType?: string | null, buttonParameters?: string[], expirationTimeMs?: number, carouselCardMediaIds?: Record<number, string>) => void;
  is24HourWindowExpired: boolean;
  activeChannelId?: string;
  sendMessagePending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  onSelectLocalTemplate?: (text: string) => void;
}

const MessageComposer = ({
  selectedConversation,
  messageText,
  onTyping,
  onSendMessage,
  onFileAttachment,
  onFileChange,
  onSendVoiceNote,
  onSelectTemplate,
  is24HourWindowExpired,
  activeChannelId,
  sendMessagePending,
  fileInputRef,
  replyToMessage,
  onCancelReply,
  onSelectLocalTemplate,
}: MessageComposerProps) => {
  const { data: localTemplates } = useQuery({
    queryKey: ["/api/templates", activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return [];
      const res = await fetch(`/api/templates?channelId=${activeChannelId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!activeChannelId,
  });

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSendRef = useRef(true);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        if (shouldSendRef.current && onSendVoiceNote) {
          const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
          const file = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
          onSendVoiceNote(file);
        }
      };

      shouldSendRef.current = true;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      shouldSendRef.current = true;
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      shouldSendRef.current = false;
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  };

  const cleanupRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  if (isRecording) {
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    return (
      <div className="bg-white border-t border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-sm font-semibold text-red-500">Recording</span>
            <span className="text-sm font-mono font-medium text-gray-700">{formattedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={cancelRecording}
              title="Discard Recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 rounded-full"
              onClick={stopAndSendRecording}
              title="Send Voice Note"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 p-3 md:p-4">
      {is24HourWindowExpired &&
        selectedConversation.type === "whatsapp" && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">
                  24-hour window expired
                </p>
                <p className="text-yellow-700">
                  You can only send template messages now
                </p>
              </div>
            </div>
          </div>
        )}

      {replyToMessage && (
        <div className="mb-3 flex items-center justify-between p-2 bg-gray-50 border-l-4 border-green-500 rounded-r-lg text-sm">
          <div className="flex-1 truncate">
            <span className="font-semibold text-green-700 block text-xs">
              Replying to {replyToMessage.fromUser ? "yourself" : selectedConversation.contactName}
            </span>
            <span className="text-gray-600 truncate block">
              {replyToMessage.content || "[Media]"}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-1 md:gap-2">
        <div className="flex gap-1">
          {selectedConversation.type === "whatsapp" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={onFileAttachment}
                      disabled={false}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach File</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={onFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />

              <TemplatePickerDialog
                channelId={activeChannelId}
                onSelectTemplate={onSelectTemplate}
              />

              {localTemplates && localTemplates.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      title="Quick Templates"
                    >
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="text-xs font-semibold text-gray-500 px-2 py-1 border-b border-gray-100 mb-1">
                      Quick Templates
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {localTemplates.map((tpl: any) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            if (onSelectLocalTemplate) {
                              onSelectLocalTemplate(tpl.body);
                            }
                          }}
                          className="w-full text-left text-xs p-2 hover:bg-gray-100 rounded transition-colors truncate block font-medium text-gray-700"
                          title={tpl.body}
                        >
                          <span className="font-semibold text-gray-900 block truncate">{tpl.name}</span>
                          <span className="text-[10px] text-gray-500 truncate block">{tpl.body}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}
        </div>

        <textarea
          placeholder={
            is24HourWindowExpired &&
            selectedConversation.type === "whatsapp"
              ? "Templates only"
              : "Type a message..."
          }
          value={messageText}
          onChange={onTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
          disabled={
            is24HourWindowExpired &&
            selectedConversation.type === "whatsapp"
          }
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />

        {messageText.trim() ? (
          <Button
            onClick={onSendMessage}
            disabled={
              !messageText.trim() ||
              (is24HourWindowExpired &&
                selectedConversation.type === "whatsapp") ||
              sendMessagePending
            }
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9 bg-emerald-500 hover:bg-emerald-600"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={startRecording}
            disabled={
              (is24HourWindowExpired &&
                selectedConversation.type === "whatsapp") ||
              sendMessagePending
            }
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9 bg-purple-600 hover:bg-purple-700 text-white rounded-full"
            title="Record Voice Note"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MessageComposer;
