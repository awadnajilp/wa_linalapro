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

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { Search, Plus, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConversationListItem from "./ConversationListItem";
import type { ConversationWithContact } from "./types";
import type { Conversation } from "@shared/schema";

interface ConversationListProps {
  conversations: ConversationWithContact[];
  conversationsLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterTab: string;
  onFilterTabChange: (tab: string) => void;
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: ConversationWithContact) => void;
  user?: any;
  onStartNewChat: (phone: string, name?: string) => Promise<void>;
  onOpenAiSettings: () => void;
  tagsColorMap?: Record<string, string>;
  channelTags?: any[];
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

const ConversationList = ({
  conversations,
  conversationsLoading,
  searchQuery,
  onSearchChange,
  filterTab,
  onFilterTabChange,
  selectedConversation,
  onSelectConversation,
  user,
  onStartNewChat,
  onOpenAiSettings,
  tagsColorMap = {},
  channelTags = [],
  selectedTag = null,
  onSelectTag,
}: ConversationListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setIsStartingChat(true);
    try {
      await onStartNewChat(phoneInput, nameInput);
      setPhoneInput("");
      setNameInput("");
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] min-w-0 overflow-hidden",
        selectedConversation
          ? "hidden md:flex md:w-[340px] lg:w-[400px]"
          : "w-full md:w-[340px] lg:w-[400px]"
      )}
    >
      <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 bg-white">
        <div className="flex gap-2 mb-2 sm:mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-7 sm:pl-9 pr-2 sm:pr-3 bg-gray-50 text-xs sm:text-sm w-full h-8 sm:h-10 rounded-lg"
            />
          </div>
          <Button
            type="button"
            size="icon"
            onClick={onOpenAiSettings}
            className="h-8 w-8 sm:h-10 sm:w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shrink-0"
            title="Inbox AI Agent Settings"
          >
            <Brain className="h-4.5 w-4.5 text-white" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={() => setIsDialogOpen(true)}
            className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-500 hover:bg-emerald-600 rounded-lg shrink-0"
            title="Start New Chat"
          >
            <Plus className="h-4.5 w-4.5 text-white" />
          </Button>
        </div>

        {/* Scrollable Tag/Label Filter Bar */}
        {Array.isArray(channelTags) && channelTags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2.5 mt-0.5 py-1.5 border-t border-b border-gray-100 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 shrink-0 mr-1">
              Label:
            </span>
            <button
              onClick={() => onSelectTag?.(null)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-all shrink-0",
                !selectedTag
                   ? "bg-indigo-600 text-white"
                   : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All
            </button>
            {(channelTags || []).map((tag: any) => {
              const isSelected = selectedTag === tag.name;
              return (
                <button
                  key={tag.id}
                  onClick={() => onSelectTag?.(isSelected ? null : tag.name)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1",
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                  )}
                  style={{
                    backgroundColor: isSelected ? tag.color : undefined,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isSelected ? '#ffffff' : tag.color }} />
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}

        <Tabs value={filterTab} onValueChange={onFilterTabChange}>
          <div className="overflow-x-auto px-1 [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <TabsList className="inline-flex w-auto h-7 sm:h-9 md:h-10 gap-1 sm:gap-1.5 md:gap-2 bg-gray-100 p-0.5 sm:p-1 rounded-lg">
              <TabsTrigger
                value="all"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="whatsapp"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                WA
              </TabsTrigger>
              <TabsTrigger
                value="chatbot"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Widget
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Assigned
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Unread
              </TabsTrigger>
              <TabsTrigger
                value="open"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Open
              </TabsTrigger>
              <TabsTrigger
                value="resolved"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Resolved
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 ">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loading />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations found
          </div>
        ) : (
          conversations.map(
            (conversation: ConversationWithContact) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onClick={() => onSelectConversation(conversation)}
                user={user}
                tagsColorMap={tagsColorMap}
              />
            )
          )
        )}
      </ScrollArea>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleStartChatSubmit}>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
              <DialogDescription>
                Enter the recipient's phone number to start a new chat session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newChatPhone" className="text-right text-xs sm:text-sm">
                  Phone Number
                </Label>
                <Input
                  id="newChatPhone"
                  placeholder="e.g. +919633348491"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="col-span-3 text-xs sm:text-sm h-9"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newChatName" className="text-right text-xs sm:text-sm">
                  Name (Optional)
                </Label>
                <Input
                  id="newChatName"
                  placeholder="Recipient name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="col-span-3 text-xs sm:text-sm h-9"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="text-xs sm:text-sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-xs sm:text-sm" disabled={isStartingChat}>
                {isStartingChat ? "Starting..." : "Start Chat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationList;
