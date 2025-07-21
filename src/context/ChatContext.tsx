import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { Message, User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import { showError } from "@/utils/toast";

interface ChatContextType {
  messages: Message[];
  sendMessage: (receiverId: string, text: string) => Promise<void>;
  getMessagesForConversation: (otherUserId: string) => Message[];
  clearConversationMessages: (user1Id: string, user2Id: string) => Promise<void>;
  markMessagesAsRead: (otherUserId: string) => Promise<void>;
  hasUnreadMessages: (otherUserId: string) => boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Function to fetch messages from Supabase
  const fetchMessages = useCallback(async () => {
    if (!currentUser) {
      setMessages([]);
      setIsInitialLoad(false);
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

    if (error) {
      console.error("Error fetching messages from Supabase:", error);
      showError("Error al cargar mensajes.");
      setMessages([]);
    } else {
      const fetchedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        text: msg.text,
        timestamp: new Date(msg.timestamp).getTime(), // Convert ISO string to number
        readBy: msg.read_by || [],
      })).sort((a, b) => a.timestamp - b.timestamp); // Sort initially
      setMessages(fetchedMessages);
    }
    setIsInitialLoad(false);
  }, [currentUser]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    fetchMessages(); // Fetch messages on component mount or currentUser change

    // Only subscribe if currentUser exists to ensure a valid filter
    if (!currentUser) {
      console.log("ChatContext: No current user, skipping realtime subscription.");
      return;
    }

    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id})` 
        },
        (payload) => {
          const newMsg = payload.new as any;
          const oldMsg = payload.old as any;

          if (payload.eventType === 'INSERT') {
            setMessages(prevMessages => {
              const newMessage = {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                receiverId: newMsg.receiver_id,
                text: newMsg.text,
                timestamp: new Date(newMsg.timestamp).getTime(),
                readBy: newMsg.read_by || [],
              };
              // If the message with this ID already exists (e.g., from optimistic update that got replaced by actual DB ID),
              // ensure it's not duplicated. The `sendMessage` already handles replacing temp IDs.
              // This check prevents adding a message if its final ID is already present.
              if (prevMessages.some(msg => msg.id === newMessage.id)) {
                return prevMessages; 
              }
              // Add the new message and sort to ensure correct order
              return [...prevMessages, newMessage].sort((a, b) => a.timestamp - b.timestamp);
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prevMessages =>
              prevMessages.map(msg =>
                msg.id === newMsg.id
                  ? {
                      id: newMsg.id,
                      senderId: newMsg.sender_id,
                      receiverId: newMsg.receiver_id,
                      text: newMsg.text,
                      timestamp: new Date(newMsg.timestamp).getTime(), // Convert ISO string to number
                      readBy: newMsg.read_by || [],
                    }
                  : msg
              ).sort((a, b) => a.timestamp - b.timestamp) // Re-sort after update
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages(prevMessages => prevMessages.filter(msg => msg.id !== oldMsg.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (currentUser) { // Only remove channel if it was subscribed
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser, fetchMessages, authLoading]); // Re-run effect if currentUser changes or authLoading state changes

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) {
      showError("No hay usuario actual para enviar el mensaje.");
      return;
    }

    // Create a temporary message object for optimistic update
    // Use a temporary client-generated ID for immediate display
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId, // Temporary ID
      senderId: currentUser.id,
      receiverId: receiverId,
      text,
      timestamp: Date.now(), // Client-side timestamp
      readBy: [currentUser.id], // Assume sender has read their own message
    };

    // Optimistically add the message to the local state for immediate display
    setMessages(prevMessages => [...prevMessages, optimisticMessage].sort((a, b) => a.timestamp - b.timestamp));

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        text,
        timestamp: new Date(optimisticMessage.timestamp).toISOString(), // Use the same timestamp for consistency
        read_by: [currentUser.id], // Mark as read by sender upon insertion
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message to Supabase:", error);
      showError("Error al enviar el mensaje.");
      // Revert optimistic update on error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
    } else {
      // Replace the optimistic message with the actual message from the DB
      // This ensures the message has the correct DB-generated ID and timestamp
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === tempId
            ? {
                id: data.id, // Use the actual ID from Supabase
                senderId: data.sender_id,
                receiverId: data.receiver_id,
                text: data.text,
                timestamp: new Date(data.timestamp).getTime(),
                readBy: data.read_by || [],
              }
            : msg
        ).sort((a, b) => a.timestamp - b.timestamp) // Re-sort after replacement
      );
    }
  };

  const getMessagesForConversation = useCallback((otherUserId: string): Message[] => {
    if (!currentUser) return [];
    return messages
      .filter(
        (msg) =>
          (msg.senderId === currentUser.id && msg.receiverId === otherUserId) ||
          (msg.senderId === otherUserId && msg.receiverId === currentUser.id)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, currentUser]);

  const clearConversationMessages = async (user1Id: string, user2Id: string) => {
    console.log(`Attempting to clear messages between ${user1Id} and ${user2Id} using RPC.`);
    const { error } = await supabase.rpc('delete_conversation', {
      user1_id: user1Id,
      user2_id: user2Id
    });

    if (error) {
      console.error("Error clearing conversation messages via RPC:", error);
      showError("Error al borrar la conversación.");
    } else {
      console.log(`RPC call to delete conversation between ${user1Id} and ${user2Id} succeeded.`);
      // The realtime subscription for DELETE events will handle updating the local state.
    }
  };

  const markMessagesAsRead = useCallback(async (otherUserId: string) => {
    if (!currentUser) {
      console.warn("markMessagesAsRead: No current user, cannot mark messages as read.");
      return;
    }

    // Get IDs of messages sent by otherUserId to currentUser that are not yet read by currentUser
    const unreadMessageIds = messages.filter(
      (msg) =>
        msg.senderId === otherUserId &&
        msg.receiverId === currentUser.id &&
        !msg.readBy?.includes(currentUser.id)
    ).map(msg => msg.id);

    if (unreadMessageIds.length === 0) {
      return; // No unread messages to mark
    }

    // Optimistically update local state
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (unreadMessageIds.includes(msg.id) && !msg.readBy?.includes(currentUser.id)) {
          return {
            ...msg,
            readBy: [...(msg.readBy || []), currentUser.id],
          };
        }
        return msg;
      }).sort((a, b) => a.timestamp - b.timestamp) // Re-sort after update
    );

    // Call the PostgreSQL function to mark messages as read
    const { error: rpcError } = await supabase.rpc('mark_messages_as_read', {
      message_ids: unreadMessageIds,
      user_id: currentUser.id
    });

    if (rpcError) {
      console.error("markMessagesAsRead: Error calling RPC function:", rpcError);
      showError(`Error al marcar mensajes como leídos: ${rpcError.message}`);
      // Revert optimistic update on error (optional, but good practice)
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (unreadMessageIds.includes(msg.id) && msg.readBy?.includes(currentUser.id)) {
            return {
              ...msg,
              readBy: msg.readBy.filter(id => id !== currentUser.id),
            };
          }
          return msg;
        }).sort((a, b) => a.timestamp - b.timestamp) // Re-sort after revert
      );
    } else {
      // The real-time subscription will eventually confirm this,
      // but optimistic update makes it instant.
    }
  }, [messages, currentUser]);

  // Implementation of hasUnreadMessages
  const hasUnreadMessages = useCallback((otherUserId: string): boolean => {
    if (!currentUser) return false;
    return messages.some(
      (msg) =>
        msg.senderId === otherUserId &&
        msg.receiverId === currentUser.id &&
        !msg.readBy?.includes(currentUser.id)
    );
  }, [messages, currentUser]);

  // Render nothing or a minimal loader if initial messages are still loading
  if (isInitialLoad) {
    return null; // Or a small loading spinner if desired
  }

  return (
    <ChatContext.Provider value={{ messages, sendMessage, getMessagesForConversation, clearConversationMessages, markMessagesAsRead, hasUnreadMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat debe ser usado dentro de un ChatProvider");
  }
  return context;
};