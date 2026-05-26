import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socket, connectSocket, disconnectSocket } from '../api/socket.js';
import { getToken } from '../api/client.js';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [connected, setConnected]           = useState(false);
  const [onlineCount, setOnlineCount]       = useState(0);
  const [friendActivity, setFriendActivity] = useState([]);

  useEffect(() => {
    // Connect with current token
    connectSocket(getToken());

    const onConnect    = () => { setConnected(true);  };
    const onDisconnect = () => { setConnected(false); };
    const onUserCount  = ({ count }) => setOnlineCount(count);
    const onFriend     = (data) => {
      setFriendActivity(prev => {
        const filtered = prev.filter(f => f.socketId !== data.socketId);
        return [data, ...filtered].slice(0, 10);
      });
    };

    socket.on('connect',        onConnect);
    socket.on('disconnect',     onDisconnect);
    socket.on('user_count',     onUserCount);
    socket.on('friend_playing', onFriend);

    return () => {
      socket.off('connect',        onConnect);
      socket.off('disconnect',     onDisconnect);
      socket.off('user_count',     onUserCount);
      socket.off('friend_playing', onFriend);
    };
  }, []);

  const broadcastNowPlaying = useCallback((track) => {
    if (socket.connected && track) {
      socket.emit('now_playing', {
        id: track.id, title: track.title,
        artist: track.artist, thumbnail: track.thumbnail,
      });
    }
  }, []);

  const sendMessage = useCallback((text) => {
    if (socket.connected) socket.emit('chat_message', { text });
  }, []);

  const joinRoom = useCallback((roomId) => {
    if (socket.connected) socket.emit('join_room', roomId);
  }, []);

  const leaveRoom = useCallback((roomId) => {
    if (socket.connected) socket.emit('leave_room', roomId);
  }, []);

  return (
    <SocketContext.Provider value={{
      socket, connected, onlineCount, friendActivity,
      broadcastNowPlaying, sendMessage, joinRoom, leaveRoom,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside SocketProvider");
  return ctx;
};
