import { useEffect, useRef } from "react";
import { connectSocket, socket } from "../services/socket";

export function useSocket() {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!connectedRef.current) {
      connectSocket();
      connectedRef.current = true;
    }
  }, []);
}

export function useSocketEvent(channel, callback) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    connectSocket();

    const handler = (...args) => {
      callbackRef.current?.(...args);
    };

    socket.on(channel, handler);
    return () => {
      socket.off(channel, handler);
    };
  }, [channel]);
}
