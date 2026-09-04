"use client";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ table: string; timestamp: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function connect() {
      // Use ws:// for http and wss:// for https
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      
      const wsUrl = `${protocol}//${host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log("[WebSocket] Connected to CPA Platform Sync");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "sync_completed") {
            setLastMessage({ table: data.table, timestamp: new Date().toISOString() });
            
            // Invalidate relevant SWR cache based on table
            if (data.table === "inventory_balances") {
              mutate((key) => typeof key === "string" && key.includes("/api/inventory"));
            } else if (data.table === "sales_orders" || data.table === "invoices") {
              mutate((key) => typeof key === "string" && key.includes("/api/sales"));
            } else if (data.table === "deliveries") {
              mutate((key) => typeof key === "string" && key.includes("/api/distributions"));
            } else if (data.table === "analytics_computed") {
              mutate((key) => typeof key === "string" && key.includes("/api/analytics"));
            }
          }
        } catch (e) {
          console.error("[WebSocket] Invalid message", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { isConnected, lastMessage };
}
