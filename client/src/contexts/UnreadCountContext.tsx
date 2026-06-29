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

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/contexts/socket-context";

const UnreadCountContext = createContext<number>(0);

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["/api/conversations/unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/conversations/unread-count", {
        credentials: "include",
      });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count || 0;
    },
    refetchInterval: 30000, // refetch every 30s
    staleTime: 20000,       // consider fresh for 20s
  });

  useEffect(() => {
    if (!socket) return;

    const handleInvalidate = () => {
      console.log("⚡ Invalidation triggered by socket event - updating unread count");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
    };

    socket.on("new-message", handleInvalidate);
    socket.on("new_message", handleInvalidate);
    socket.on("messages_read", handleInvalidate);
    socket.on("conversation_created", handleInvalidate);
    socket.on("conversation_status_changed", handleInvalidate);

    return () => {
      socket.off("new-message", handleInvalidate);
      socket.off("new_message", handleInvalidate);
      socket.off("messages_read", handleInvalidate);
      socket.off("conversation_created", handleInvalidate);
      socket.off("conversation_status_changed", handleInvalidate);
    };
  }, [socket, queryClient]);

  return (
    <UnreadCountContext.Provider value={unreadCount}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  return useContext(UnreadCountContext);
}
