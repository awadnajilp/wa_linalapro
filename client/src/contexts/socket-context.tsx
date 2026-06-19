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

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/auth-context";

type SocketContextType = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || socket) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketInstance = io(window.location.origin, {
      query: {
        userId: String(user.id),
        role: String(user.role || "agent"),
      },
      transports: ["websocket"],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("🟢 Global socket connected:", socketInstance.id);
      socketInstance.emit("test_event", { msg: "Hello from client!" });
    });

    socketInstance.on("disconnect", () => {
      console.log("🔴 Global socket disconnected");
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
