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
import { Lock, QrCode, Banknote, Smartphone } from "lucide-react"; // Import new icons
import { showError } from "@/utils/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { useAuth } from "@/context/AuthContext"; // Import useAuth to get exchangeRate

interface PaymentSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  negotiatedServiceRate: number;
  onConfirm: (finalAmount: number) => void;
}

const PaymentSimulationModal: React.FC<PaymentSimulationModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  negotiatedServiceRate,
  onConfirm,
}) => {
  const { exchangeRate } = useAuth(); // Get the exchange rate from AuthContext
  const [activeTab, setActiveTab] = useState("binance-pay"); // State for active tab

  // New states for simulated card details (kept for "Tarjeta de Crédito" tab if it were to be re-added)
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // New states for simulated Pago Móvil details
  const [pagoMovilBank, setPagoMovilBank] = useState("");
  const [pagoMovilPhone, setPagoMovilPhone] = useState("");
  const [pagoMovilId, setPagoMovilId] = useState("");

  // Calculate the total amount the client pays, including the 5% commission
  const CLIENT_PAYMENT_ADDITIONAL_COMMISSION_PERCENTAGE = 0.05;
  const clientPaymentAmountUSD = negotiatedServiceRate * (1 + CLIENT_PAYMENT_ADDITIONAL_COMMISSION_PERCENTAGE);
  const clientPaymentAmountVEF = clientPaymentAmountUSD * exchangeRate;

  const handleConfirmPayment = () => {
    if (activeTab === "binance-pay") {
      // No specific inputs for Binance Pay simulation, just confirmation
      onConfirm(negotiatedServiceRate);
      onClose();
    } else if (activeTab === "pago-movil") {
      // Basic validation for Pago Móvil simulation
      if (!pagoMovilBank || !pagoMovilPhone || !pagoMovilId) {
        showError("Por favor, completa todos los datos de Pago Móvil.");
        return;
      }
      if (pagoMovilPhone.replace(/\D/g, '').length < 7) {
        showError("Número de teléfono inválido.");
        return;
      }
      if (pagoMovilId.replace(/\D/g, '').length < 6) {
        showError("Cédula/RIF inválida.");
        return;
      }
      onConfirm(negotiatedServiceRate);
      onClose();
    } else {
      // Fallback for other payment methods (e.g., credit card if re-added)
      if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        showError("Por favor, completa todos los datos de la tarjeta.");
        return;
      }
      if (cardNumber.replace(/\s/g, '').length !== 16 || !/^\d+$/.test(cardNumber.replace(/\s/g, ''))) {
        showError("Número de tarjeta inválido (debe tener 16 dígitos).");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
        showError("Fecha de vencimiento inválida (MM/AA).");
        return;
      }
      if (cvv.length !== 3 || !/^\d+$/.test(cvv)) {
        showError("CVV inválido (debe tener 3 dígitos).");
        return;
      }
      onConfirm(negotiatedServiceRate);
      onClose();
    }
  };

  // Function to format card number with spaces (kept for potential future use)
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || '';
    return formatted.substring(0, 19);
  };

  // Function to format expiry date with slash (kept for potential future use)
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            Simulación de Pasarela de Pago
          </DialogTitle>
          <DialogDescription className="text-center">
            Estás a punto de depositar fondos para el servicio. El monto es el acordado con el proveedor.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-lg text-center">
            <span className="font-semibold">Servicio:</span> {serviceTitle}
          </p>
          <div>
            <Label htmlFor="payment-amount" className="text-center block mb-2">Monto del Servicio (USD)</Label>
            <Input
              id="payment-amount"
              type="text" // Changed to text to display fixed decimal
              value={`$${negotiatedServiceRate.toFixed(2)} USD`}
              readOnly
              className="mt-1 font-bold text-lg text-center"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            (Incluye una comisión del 5% para la plataforma)
          </p>
          <div className="text-center text-2xl font-bold text-blue-600 dark:text-blue-400">
            Total a Pagar: ${clientPaymentAmountUSD.toFixed(2)} USD
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="binance-pay" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" /> Binance Pay
              </TabsTrigger>
              <TabsTrigger value="pago-movil" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Pago Móvil
              </TabsTrigger>
            </TabsList>

            <TabsContent value="binance-pay" className="mt-4 space-y-4">
              <div className="text-center">
                <p className="text-md text-gray-700 dark:text-gray-300 mb-2">
                  Escanea el código QR o usa el ID de pago para completar la transacción.
                </p>
                <div className="bg-gray-200 dark:bg-gray-700 p-6 rounded-lg flex flex-col items-center justify-center h-48">
                  <QrCode className="h-24 w-24 text-gray-500 dark:text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    QR de Pago Simulado
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">
                    ID de Pago: TE_LO_HAGO_{Math.floor(Math.random() * 1000000)}
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Monto a enviar: <span className="font-semibold">${clientPaymentAmountUSD.toFixed(2)} USD</span>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pago-movil" className="mt-4 space-y-4">
              <div className="text-center">
                <p className="text-md text-gray-700 dark:text-gray-300 mb-2">
                  Realiza la transferencia a los siguientes datos:
                </p>
                <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                  <div>
                    <Label htmlFor="pago-movil-bank">Banco Receptor</Label>
                    <Input
                      id="pago-movil-bank"
                      type="text"
                      value="Banco de Venezuela (Simulado)"
                      readOnly
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pago-movil-phone">Número de Teléfono</Label>
                    <Input
                      id="pago-movil-phone"
                      type="tel"
                      value="0412-1234567 (Simulado)"
                      readOnly
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pago-movil-id">Cédula / RIF</Label>
                    <Input
                      id="pago-movil-id"
                      type="text"
                      value="V-12345678 (Simulado)"
                      readOnly
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Monto a enviar: <span className="font-semibold">${clientPaymentAmountUSD.toFixed(2)} USD</span>
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-2">
                  Equivalente en VEF: {clientPaymentAmountVEF.toFixed(2)} VEF
                </p>
                <div className="mt-4 space-y-3">
                  <h3 className="text-md font-semibold text-center">Confirma tus datos de Pago Móvil</h3>
                  <div>
                    <Label htmlFor="confirm-pago-movil-bank">Tu Banco</Label>
                    <Input
                      id="confirm-pago-movil-bank"
                      type="text"
                      value={pagoMovilBank}
                      onChange={(e) => setPagoMovilBank(e.target.value)}
                      placeholder="Ej: Banco Mercantil"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-pago-movil-phone">Tu Número de Teléfono</Label>
                    <Input
                      id="confirm-pago-movil-phone"
                      type="tel"
                      value={pagoMovilPhone}
                      onChange={(e) => setPagoMovilPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 04121234567"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-pago-movil-id">Tu Cédula / RIF</Label>
                    <Input
                      id="confirm-pago-movil-id"
                      type="text"
                      value={pagoMovilId}
                      onChange={(e) => setPagoMovilId(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: V-12345678"
                      required
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            (Este es un pago simulado. No se realizará ninguna transacción real.)
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 text-center flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" /> Transacción segura y encriptada
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleConfirmPayment} className="w-full">
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSimulationModal;