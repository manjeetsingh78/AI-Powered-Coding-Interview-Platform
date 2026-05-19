import { useEffect, useRef, useState } from "react";

export default function useWebSocket(url, { onMessage } = {}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!url) return undefined;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      if (!onMessage) return;
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        onMessage(event.data);
      }
    };

    return () => {
      socket.close();
    };
  }, [url, onMessage]);

  const send = (payload) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return false;
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    socketRef.current.send(message);
    return true;
  };

  return { connected, send };
}
