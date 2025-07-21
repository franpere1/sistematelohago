import React, { useState } from "react";
    import {
      Dialog,
      DialogContent,
      DialogDescription,
      DialogHeader,
      DialogTitle,
    } from "@/components/ui/dialog";
    import { Button } from "@/components/ui/button";
    import { Contract, FeedbackType } from "@/types";
    import { useContracts } from "@/context/ContractContext";
    import { useAuth } from "@/context/AuthContext";
    import { showError, showSuccess } from "@/utils/toast";
    import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
    import { Label } from "@/components/ui/label";
    import { Textarea } from "@/components/ui/textarea";

    interface ContractCompletionModalProps {
      isOpen: boolean;
      onClose: () => void;
      contract: Contract;
      providerName: string;
      onCompletionSuccess: () => void; // Callback to refresh data
    }

    const ContractCompletionModal: React.FC<ContractCompletionModalProps> = ({
      isOpen,
      onClose,
      contract,
      providerName,
      onCompletionSuccess,
    }) => {
      const { currentUser, addFeedbackToProvider } = useAuth();
      const { handleContractAction } = useContracts();
      const [selectedRating, setSelectedRating] = useState<FeedbackType | null>(null);
      const [comment, setComment] = useState("");

      const handleConfirmCompletion = async () => {
        if (!selectedRating) {
          showError("Por favor, selecciona una calificación para el servicio.");
          return;
        }
        if (comment.trim().length > 2000) {
          showError("El comentario no debe exceder los 2000 caracteres.");
          return;
        }
        if (comment.trim() === "") {
          showError("Por favor, escribe un comentario.");
          return;
        }

        if (currentUser && currentUser.id === contract.clientId) {
          try {
            const feedbackSuccess = await addFeedbackToProvider(
              contract.providerId,
              selectedRating,
              comment.trim()
            );
            
            if (feedbackSuccess) {
              await handleContractAction(contract.id, currentUser.id, 'finalize');
              showSuccess("¡Gracias por tu feedback! El contrato ha sido finalizado.");
              onCompletionSuccess(); // Trigger data refresh in parent component
              onClose(); // This should close the modal
            }
          } catch (error) {
            console.error("ContractCompletionModal: Error during completion process:", error);
            showError("Ocurrió un error al finalizar el contrato. Intenta de nuevo.");
          }
        } else {
          showError("Solo el cliente que contrató puede finalizar el contrato y dejar feedback.");
        }
      };

      const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
      const commissionAmount = contract.serviceRate * contract.commissionRate;

      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Finalizar Contrato y Liberar Fondos</DialogTitle>
              <DialogDescription>
                Confirma que el servicio ha sido completado satisfactoriamente y deja tu feedback.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-lg">
                <span className="font-semibold">Servicio:</span> {contract.serviceTitle}
              </p>
              <p className="text-lg">
                <span className="font-semibold">Proveedor:</span> {providerName}
              </p>
              <p className="text-lg">
                <span className="font-semibold">Tarifa Total:</span> ${contract.serviceRate.toFixed(2)} USD
              </p>
              <p className="text-lg text-green-600 dark:text-green-400">
                <span className="font-semibold">Monto a Liberar al Proveedor:</span> ${amountToProvider.toFixed(2)} USD
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                (Comisión de la plataforma: ${commissionAmount.toFixed(2)} USD)
              </p>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-2">Dejar Feedback</h3>
                <div>
                  <Label className="mb-2 block">Calificación:</Label>
                  <RadioGroup
                    onValueChange={(value: FeedbackType) => setSelectedRating(value)}
                    value={selectedRating || ""}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={FeedbackType.Positive} id="rating-positive" />
                      <Label htmlFor="rating-positive">Positivo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={FeedbackType.Neutral} id="rating-neutral" />
                      <Label htmlFor="rating-neutral">Neutro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={FeedbackType.Negative} id="rating-negative" />
                      <Label htmlFor="rating-negative">Negativo</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="mt-4">
                  <Label htmlFor="feedback-comment" className="mb-2 block">Comentario (máx. 2000 caracteres):</Label>
                  <Textarea
                    id="feedback-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    placeholder="Escribe tu comentario aquí (máx. 2000 caracteres)..."
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Al confirmar, los fondos serán liberados al proveedor. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmCompletion} disabled={!selectedRating || comment.trim() === ""}>
                Confirmar y Liberar Fondos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    };

    export default ContractCompletionModal;