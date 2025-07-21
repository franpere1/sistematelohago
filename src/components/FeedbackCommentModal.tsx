import React from "react";
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
    } from "@/components/ui/dialog";
    import { ScrollArea } from "@/components/ui/scroll-area";

    interface FeedbackCommentModalProps {
      isOpen: boolean;
      onClose: () => void;
      comment: string;
      clientName: string;
      feedbackType: string;
    }

    const FeedbackCommentModal: React.FC<FeedbackCommentModalProps> = ({
      isOpen,
      onClose,
      comment,
      clientName,
      feedbackType,
    }) => {
      const typeColorClass =
        feedbackType === "positive"
          ? "text-green-600 dark:text-green-400"
          : feedbackType === "negative"
          ? "text-red-600 dark:text-red-400"
          : "text-gray-500 dark:text-gray-400";

      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comentario de {clientName}</DialogTitle>
              <DialogDescription>
                <span className={`font-semibold ${typeColorClass}`}>
                  {feedbackType === "positive" ? "Positivo" : feedbackType === "negative" ? "Negativo" : "Neutro"}
                </span>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow p-4 border rounded-md mt-4">
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {comment}
              </p>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      );
    };

    export default FeedbackCommentModal;