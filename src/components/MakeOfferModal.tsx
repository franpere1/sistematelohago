import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError } from "@/utils/toast";

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  serviceTitle: string;
  initialRate: number;
  onConfirmOffer: (contractId: string, newRate: number) => void;
}

const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  isOpen,
  onClose,
  contractId,
  serviceTitle,
  initialRate,
  onConfirmOffer,
}) => {
  const [offerAmount, setOfferAmount] = useState<number | string>(initialRate);

  const handleConfirm = () => {
    const finalAmount = parseFloat(String(offerAmount));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      showError("Por favor, introduce un monto válido mayor que cero.");
      return;
    }
    onConfirmOffer(contractId, finalAmount);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Hacer Oferta para {serviceTitle}</DialogTitle>
          <DialogDescription>
            Introduce el monto que ofreces para realizar este servicio.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-lg">
            <span className="font-semibold">Servicio:</span> {serviceTitle}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tarifa sugerida inicialmente: ${initialRate.toFixed(2)} USD
          </p>
          <div>
            <Label htmlFor="offer-amount">Monto de tu Oferta (USD)</Label>
            <Input
              id="offer-amount"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Ingresa tu oferta"
              required
              min="0.01"
              step="0.01"
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!offerAmount || parseFloat(String(offerAmount)) <= 0}>
            Enviar Oferta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MakeOfferModal;