import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { Message, User, Contract } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showError } from "@/utils/toast";

interface ChatWindowProps {
  otherUser: User;
  contractStatus?: Contract['status'] | 'initial_contact';
}

const ChatWindow: React.FC<ChatWindowProps> = ({ otherUser, contractStatus }) => {
  const { currentUser } = useAuth();
  const { sendMessage, getMessagesForConversation, markMessagesAsRead } = useChat(); // Import markMessagesAsRead
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationMessages = getMessagesForConversation(otherUser.id);

  // Mark messages as read when the chat window is opened or messages change
  useEffect(() => {
    if (currentUser && otherUser) {
      markMessagesAsRead(otherUser.id);
    }
  }, [currentUser, otherUser, conversationMessages, markMessagesAsRead]); // Added conversationMessages as dependency

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && currentUser) {
      let messageContent = messageInput.trim();
      let containsSensitiveInfo = false;

      // Determine if it's a pre-payment chat (pending, offered, or initial contact)
      const isPrePaymentChat = contractStatus === "pending" || contractStatus === "offered" || contractStatus === "initial_contact";

      if (isPrePaymentChat) {
        // Rule 1: Email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        if (emailRegex.test(messageContent)) {
          containsSensitiveInfo = true;
        }

        // Rule 2: Social media handles (@username)
        const socialHandleRegex = /(^|\s)@([a-zA-Z0-9_.]+)\b/g;
        if (socialHandleRegex.test(messageContent)) {
          containsSensitiveInfo = true;
        }

        // Rule 3: Phone numbers (7 or more consecutive digits)
        const phoneNumbersRegex = /\b\d{7,}\b/g;
        if (phoneNumbersRegex.test(messageContent)) {
          containsSensitiveInfo = true;
        }

        // Rule 4: Two consecutive words that indicate numbers (e.g., "dos tres", "cinco mil")
        const numberWords = [
          "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
          "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
          "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
          "cien", "ciento", "mil", "millón", "millones"
        ];
        const numberWordsPattern = numberWords.join("|");
        const twoNumberWordsRegex = new RegExp(`\\b(${numberWordsPattern})\\s+(${numberWordsPattern})\\b`, 'gi');

        if (twoNumberWordsRegex.test(messageContent)) {
          containsSensitiveInfo = true;
        }

        // Rule 5: URLs/Links
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|ve|co|es)[^\s]*)/g;
        if (urlRegex.test(messageContent)) {
          containsSensitiveInfo = true;
        }

        // Rule 6: Specific keywords related to social media and contact info
        const sensitiveKeywords = [
          "instagram", "tiktok", "email", "telefono", "whatsapp", "facebook", "twitter",
          "telegram", "discord", "linkedin", "gmail", "hotmail", "outlook", "yahoo",
          "contacto", "celular", "movil", "número", "numero", "llámame", "escríbeme", "mi número", "mi correo",
          "encuéntrame", "fuera de la app", "directo", "personal", "whatsappme", "telegramme", "discordme",
          "skype", "zoom", "google meet", "dirección", "ubicación", "cita", "reunión", "visita", "domicilio",
          "casa", "oficina", "local", "calle", "avenida", "zona", "sector", "punto de referencia",
          "coordenadas", "gps", "mapa", "encuentro", "vernos", "hablamos", "contactar", "comunicar", "reunirse"
        ];
        const keywordRegex = new RegExp(`\\b(${sensitiveKeywords.join("|")})\\b`, 'gi');
        if (keywordRegex.test(messageContent)) {
          containsSensitiveInfo = true;
        }

        if (containsSensitiveInfo) {
          showError("Tu mensaje contiene información sensible (contactos, números, enlaces o intentos de comunicación externa) y no puede ser enviado antes de que el contrato esté activo. Por favor, mantén la conversación dentro de la plataforma.");
          setMessageInput(""); // Clear the input field
          return; // Prevent sending the message
        }
      }

      // If not a pre-payment chat or no sensitive info detected, send the message
      sendMessage(otherUser.id, messageContent);
      setMessageInput("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  if (!currentUser) {
    return <div className="text-center text-gray-500">Inicia sesión para chatear.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4 space-y-4">
        {conversationMessages.length === 0 ? (
          <div className="text-center text-gray-500">
            Inicia una conversación con {otherUser.name}.
          </div>
        ) : (
          conversationMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderId === currentUser.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.senderId === currentUser.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <span className="text-xs opacity-75 mt-1 block">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="flex p-4 border-t">
        <Input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-grow mr-2"
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
};

export default ChatWindow;