import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { Contract, User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "./ChatContext";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client

interface ContractContextType {
  contracts: Contract[];
  isLoadingContracts: boolean; // Add loading state for contracts
  createContract: (
    clientId: string,
    providerId: string,
    serviceTitle: string,
    serviceRate: number
  ) => Promise<Contract | null>;
  makeOffer: (contractId: string, newRate: number) => Promise<void>;
  depositFunds: (contractId: string) => Promise<boolean>;
  handleContractAction: (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute' | 'cancel_dispute') => Promise<void>;
  resolveDispute: (contractId: string, resolutionType: 'toClient' | 'toProvider') => Promise<void>;
  getContractsForUser: (userId: string) => Contract[];
  hasActiveOrPendingContract: (clientId: string, providerId: string) => boolean;
  getLatestContractBetweenUsers: (user1Id: string, user2Id: string) => Contract | null;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

interface ContractProviderProps {
  children: ReactNode;
}

// Nuevas constantes para las comisiones
const PLATFORM_COMMISSION_PERCENTAGE = 0.10; // 10% de deducción del pago al proveedor
// const CLIENT_PAYMENT_ADDITIONAL_COMMISSION_PERCENTAGE = 0.05; // 5% adicional que paga el cliente - This is handled in PaymentSimulationModal

// Define a type for contract updates that matches Supabase database column names (snake_case)
interface SupabaseContractUpdatePayload {
  client_id?: string;
  provider_id?: string;
  service_title?: string;
  service_rate?: number;
  status?: "pending" | "offered" | "active" | "finalized" | "cancelled" | "disputed" | "finalized_by_dispute";
  client_deposited?: boolean;
  client_action?: "none" | "cancel" | "finalize" | "dispute" | "accept_offer" | "cancel_dispute";
  provider_action?: "none" | "cancel" | "finalize" | "make_offer" | "dispute" | "dispute_from_finalize";
  commission_rate?: number;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
  dispute_resolution?: 'toClient' | 'toProvider' | null; // Added null for clearing resolution
}

export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
  const { currentUser, allUsers, isLoading: authLoading } = useAuth();
  const { clearConversationMessages } = useChat();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoading] = useState(true); // Renamed to isLoading for consistency

  // Function to fetch contracts from Supabase
  const fetchContracts = useCallback(async () => {
    if (!currentUser) {
      setContracts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let query = supabase.from('contracts').select('*');

    // If the current user is NOT an admin, filter by their client_id or provider_id
    if (currentUser.type !== 'admin') {
      query = query.or(`client_id.eq.${currentUser.id},provider_id.eq.${currentUser.id}`);
    }
    // If currentUser.type IS 'admin', no additional filter is applied, fetching all contracts.

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching contracts from Supabase:", error);
      showError("Error al cargar contratos.");
      setContracts([]);
    } else {
      const fetchedContracts: Contract[] = data.map(contract => ({
        id: contract.id,
        clientId: contract.client_id,
        providerId: contract.provider_id,
        serviceTitle: contract.service_title,
        serviceRate: contract.service_rate,
        status: contract.status,
        clientDeposited: contract.client_deposited,
        clientAction: contract.client_action,
        providerAction: contract.provider_action,
        commissionRate: contract.commission_rate,
        createdAt: new Date(contract.created_at).getTime(),
        updatedAt: new Date(contract.updated_at).getTime(),
        disputeResolution: contract.dispute_resolution,
      }));
      setContracts(fetchedContracts);
    }
    setIsLoading(false);
  }, [currentUser]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    fetchContracts(); // Fetch contracts on component mount or currentUser change

    // Determine the filter for the real-time channel based on user type
    let filterString = '*'; // Default for admin or if no user
    if (currentUser && currentUser.type !== 'admin') {
      filterString = `or(client_id.eq.${currentUser.id},provider_id.eq.${currentUser.id})`;
    }

    const channel = supabase
      .channel('contracts_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'contracts',
          filter: filterString // Apply filter based on user type
        },
        (payload) => {
          const newContract = payload.new as any;
          const oldContract = payload.old as any;

          const mappedContract: Contract = {
            id: newContract?.id || oldContract?.id,
            clientId: newContract?.client_id || oldContract?.client_id,
            providerId: newContract?.provider_id || oldContract?.provider_id,
            serviceTitle: newContract?.service_title || oldContract?.service_title,
            serviceRate: newContract?.service_rate || oldContract?.service_rate,
            status: newContract?.status || oldContract?.status,
            clientDeposited: newContract?.client_deposited || oldContract?.client_deposited,
            clientAction: newContract?.client_action || oldContract?.client_action,
            providerAction: newContract?.provider_action || oldContract?.provider_action,
            commissionRate: newContract?.commission_rate || oldContract?.commission_rate,
            createdAt: new Date(newContract?.created_at || oldContract?.created_at).getTime(),
            updatedAt: new Date(newContract?.updated_at || oldContract?.updated_at).getTime(),
            disputeResolution: newContract?.dispute_resolution || oldContract?.dispute_resolution,
          };

          setContracts(prevContracts => {
            if (payload.eventType === 'INSERT') {
              // Add new contract if it doesn't exist
              if (!prevContracts.some(c => c.id === mappedContract.id)) {
                return [...prevContracts, mappedContract];
              }
            } else if (payload.eventType === 'UPDATE') {
              // Update existing contract
              return prevContracts.map(c =>
                c.id === mappedContract.id ? mappedContract : c
              );
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted contract
              return prevContracts.filter(c => c.id !== mappedContract.id);
            }
            return prevContracts; // No change if event type is not handled or contract already exists
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchContracts, authLoading]);

  const hasActiveOrPendingContract = useCallback((clientId: string, providerId: string): boolean => {
    return contracts.some(
      (contract) =>
        contract.clientId === clientId &&
        contract.providerId === providerId &&
        (contract.status === "pending" || contract.status === "offered" || contract.status === "active")
    );
  }, [contracts]);

  const getLatestContractBetweenUsers = useCallback((user1Id: string, user2Id: string): Contract | null => {
    const relevantContracts = contracts.filter(
      (c) =>
        (c.clientId === user1Id && c.providerId === user2Id) ||
        (c.clientId === user2Id && c.providerId === user1Id)
    );
    if (relevantContracts.length === 0) return null;

    relevantContracts.sort((a, b) => b.createdAt - a.createdAt);
    return relevantContracts[0];
  }, [contracts]);

  const createContract = async (
    clientId: string, // This will be ignored for security, but kept for function signature
    providerId: string,
    serviceTitle: string,
    serviceRate: number
  ): Promise<Contract | null> => {
    // Get user directly from supabase to ensure we have the latest auth state
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showError("Debes iniciar sesión para crear un contrato.");
      return null;
    }
    
    // We will use user.id from here on, ignoring the passed clientId for security.
    const authenticatedClientId = user.id;

    // We can still use the currentUser from context for other checks like type
    if (!currentUser || currentUser.type !== 'client') {
      showError("Solo los clientes pueden crear un contrato.");
      return null;
    }
    
    if (hasActiveOrPendingContract(authenticatedClientId, providerId)) {
      showError("Ya tienes un contrato pendiente o activo con este proveedor.");
      return null;
    }

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        client_id: authenticatedClientId, // Use the ID from the auth session
        provider_id: providerId,
        service_title: serviceTitle,
        service_rate: serviceRate,
        status: "pending",
        client_deposited: false,
        client_action: "none",
        provider_action: "none",
        commission_rate: PLATFORM_COMMISSION_PERCENTAGE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contract:", error);
      showError("Error al crear el contrato.");
      return null;
    }

    // Optimistically update the local state
    const newContract: Contract = {
      id: data.id,
      clientId: data.client_id,
      providerId: data.provider_id,
      serviceTitle: data.service_title,
      serviceRate: data.service_rate,
      status: data.status,
      clientDeposited: data.client_deposited,
      clientAction: data.client_action,
      providerAction: data.provider_action,
      commissionRate: data.commission_rate,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      disputeResolution: data.dispute_resolution,
    };
    setContracts(prevContracts => [...prevContracts, newContract]);

    showSuccess("Contrato creado con éxito. El proveedor ha sido notificado para hacer una oferta.");
    return newContract;
  };

  const makeOffer = async (contractId: string, newRate: number) => {
    if (!currentUser) {
      showError("Debes iniciar sesión para hacer una oferta.");
      return;
    }

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      showError("Contrato no encontrado.");
      return;
    }

    if (contract.status !== "pending" || contract.providerId !== currentUser.id) {
      showError("No puedes hacer una oferta en este contrato o no tienes permiso.");
      return;
    }

    const { data: updatedData, error } = await supabase
      .from('contracts')
      .update({
        service_rate: newRate,
        status: "offered",
        provider_action: "make_offer",
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error("Error making offer:", error);
      showError("Error al enviar la oferta.");
    } else {
      // Optimistic update
      const updatedContract: Contract = {
        id: updatedData.id,
        clientId: updatedData.client_id,
        providerId: updatedData.provider_id,
        serviceTitle: updatedData.service_title,
        serviceRate: updatedData.service_rate,
        status: updatedData.status,
        clientDeposited: updatedData.client_deposited,
        clientAction: updatedData.client_action,
        providerAction: updatedData.provider_action,
        commissionRate: updatedData.commission_rate,
        createdAt: new Date(updatedData.created_at).getTime(),
        updatedAt: new Date(updatedData.updated_at).getTime(),
        disputeResolution: updatedData.dispute_resolution,
      };
      setContracts(prevContracts => prevContracts.map(c =>
        c.id === updatedContract.id ? updatedContract : c
      ));
      showSuccess(`Oferta de $${newRate.toFixed(2)} USD enviada para el servicio "${contract.serviceTitle}".`);
    }
  };

  const depositFunds = async (contractId: string): Promise<boolean> => {
    if (!currentUser) {
      showError("Debes iniciar sesión para depositar fondos.");
      return false;
    }

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      showError("Contrato no encontrado.");
      return false;
    }

    if (contract.status !== "offered" || contract.clientDeposited || contract.clientId !== currentUser.id) {
      showError("No puedes depositar fondos en este contrato o ya han sido depositados.");
      return false;
    }

    const { data: updatedData, error } = await supabase
      .from('contracts')
      .update({
        client_deposited: true,
        status: "active",
        client_action: "accept_offer",
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error("Error depositing funds:", error);
      showError("Error al depositar los fondos.");
      return false;
    } else {
      // Optimistic update
      const updatedContract: Contract = {
        id: updatedData.id,
        clientId: updatedData.client_id,
        providerId: updatedData.provider_id,
        serviceTitle: updatedData.service_title,
        serviceRate: updatedData.service_rate,
        status: updatedData.status,
        clientDeposited: updatedData.client_deposited,
        clientAction: updatedData.client_action,
        providerAction: updatedData.provider_action,
        commissionRate: updatedData.commission_rate,
        createdAt: new Date(updatedData.created_at).getTime(),
        updatedAt: new Date(updatedData.updated_at).getTime(),
        disputeResolution: updatedData.dispute_resolution,
      };
      setContracts(prevContracts => prevContracts.map(c =>
        c.id === updatedContract.id ? updatedContract : c
      ));
      showSuccess(`Fondos depositados para el servicio "${contract.serviceTitle}". El proveedor ha sido notificado.`);
      return true;
    }
  };

  const handleContractAction = async (contractId: string, actorId: string, actionType: 'finalize' | 'cancel' | 'dispute' | 'cancel_dispute') => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
        showError("Contrato no encontrado.");
        return;
    }

    const isClient = actorId === contract.clientId;
    let updatePayload: SupabaseContractUpdatePayload = { updated_at: new Date().toISOString() };
    let newStatus: Contract['status'] = contract.status;
    let message = "";

    // --- SPECIAL CASE: Unilateral cancellation before deposit ---
    if (actionType === 'cancel' && (contract.status === 'pending' || contract.status === 'offered')) {
        updatePayload.status = 'cancelled';
        if (isClient) {
            updatePayload.client_action = 'cancel';
        } else {
            updatePayload.provider_action = 'cancel';
        }
        message = "El contrato ha sido cancelado.";
    }
    // --- Handle Dispute Cancellation ---
    else if (actionType === 'cancel_dispute') {
        if (contract.status !== 'disputed') {
            showError("El contrato no está en disputa.");
            return;
        }
        if (isClient && contract.clientAction === 'dispute') {
            updatePayload.client_action = 'accept_offer'; // Revert to a neutral state
            newStatus = 'active';
            message = "Disputa cancelada. El contrato vuelve a estar activo.";
        } else if (!isClient && (contract.providerAction === 'dispute' || contract.providerAction === 'dispute_from_finalize')) {
            updatePayload.provider_action = contract.providerAction === 'dispute_from_finalize' ? 'finalize' : 'none';
            newStatus = 'active';
            message = "Disputa cancelada. El contrato vuelve a estar activo.";
        } else {
            showError("No puedes cancelar una disputa que no iniciaste.");
            return;
        }
        updatePayload.status = newStatus;
    }
    // --- Handle Dispute Initiation ---
    else if (actionType === 'dispute') {
        if (contract.status !== 'active' || !contract.clientDeposited) {
            showError("Solo se pueden disputar contratos activos con fondos depositados.");
            return;
        }
        newStatus = 'disputed';
        if (isClient) {
            updatePayload.client_action = 'dispute';
        } else {
            updatePayload.provider_action = contract.providerAction === 'finalize' ? 'dispute_from_finalize' : 'dispute';
        }
        message = "El contrato ha entrado en disputa. Un administrador lo revisará.";
        updatePayload.status = newStatus;
    }
    // --- Handle Bilateral Actions on Active Contracts ---
    else if (actionType === 'cancel' || actionType === 'finalize') {
        if (contract.status !== 'active') {
            showError("Esta acción solo es válida para contratos activos.");
            return;
        }
        const otherPartyAction = isClient ? contract.providerAction : contract.clientAction;
        if (isClient) {
            updatePayload.client_action = actionType;
        } else {
            updatePayload.provider_action = actionType;
        }

        if (actionType === 'finalize' && otherPartyAction === 'finalize') {
            newStatus = 'finalized';
            message = "Contrato finalizado exitosamente.";
        } else if (actionType === 'cancel' && otherPartyAction === 'cancel') {
            newStatus = 'cancelled';
            message = "Contrato cancelado por ambas partes.";
        } else if ((actionType === 'finalize' && otherPartyAction === 'cancel') || (actionType === 'cancel' && otherPartyAction === 'finalize')) {
            newStatus = 'disputed';
            message = "Conflicto de acciones. El contrato ha entrado en disputa.";
        } else {
            message = `Tu acción de '${actionType}' ha sido registrada. Esperando a la otra parte.`;
        }
        updatePayload.status = newStatus;
    } else {
        showError("Acción desconocida.");
        return;
    }

    const { data: updatedData, error } = await supabase
        .from('contracts')
        .update(updatePayload)
        .eq('id', contractId)
        .select()
        .single();

    if (error) {
        console.error(`Error handling action '${actionType}':`, error);
        showError(`Error al procesar la acción: ${error.message}`);
    } else {
        const updatedContract: Contract = {
            id: updatedData.id,
            clientId: updatedData.client_id,
            providerId: updatedData.provider_id,
            serviceTitle: updatedData.service_title,
            serviceRate: updatedData.service_rate,
            status: updatedData.status,
            clientDeposited: updatedData.client_deposited,
            clientAction: updatedData.client_action,
            providerAction: updatedData.provider_action,
            commissionRate: updatedData.commission_rate,
            createdAt: new Date(updatedData.created_at).getTime(),
            updatedAt: new Date(updatedData.updated_at).getTime(),
            disputeResolution: updatedData.dispute_resolution,
        };

        setContracts(prevContracts =>
            prevContracts.map(c => (c.id === updatedContract.id ? updatedContract : c))
        );
        
        showSuccess(message);

        if (updatedContract.status === 'finalized' || updatedContract.status === 'cancelled') {
            await clearConversationMessages(contract.clientId, contract.providerId);
        }

        if (actionType === 'cancel_dispute') {
            const adminUser = allUsers.find(u => u.type === 'admin');
            if (adminUser) {
                await clearConversationMessages(contract.clientId, adminUser.id);
                await clearConversationMessages(contract.providerId, adminUser.id);
            }
        }
    }
};

  const resolveDispute = async (contractId: string, resolutionType: 'toClient' | 'toProvider') => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      showError("Contrato no encontrado.");
      return;
    }

    if (contract.status !== "disputed") {
      showError("No se puede resolver la disputa en este contrato o no está en disputa.");
      return;
    }

    let message = "";
    if (resolutionType === "toClient") {
      message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${contract.serviceRate.toFixed(2)} USD) liberados al cliente.`;
    } else {
      const amountToProvider = contract.serviceRate * (1 - contract.commissionRate);
      message = `Disputa resuelta para "${contract.serviceTitle}". Fondos (${amountToProvider.toFixed(2)} USD) liberados al proveedor (menos comisión).`;
    }

    const { data: updatedData, error } = await supabase
      .from('contracts')
      .update({
        status: "finalized_by_dispute",
        dispute_resolution: resolutionType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error("Error resolving dispute:", error);
      showError("Error al resolver la disputa.");
    } else {
      // Map the updated data from Supabase to our Contract type
      const updatedContract: Contract = {
        id: updatedData.id,
        clientId: updatedData.client_id,
        providerId: updatedData.provider_id,
        serviceTitle: updatedData.service_title,
        serviceRate: updatedData.service_rate,
        status: updatedData.status, // This will be 'finalized_by_dispute'
        clientDeposited: updatedData.client_deposited,
        clientAction: updatedData.client_action,
        providerAction: updatedData.provider_action,
        commissionRate: updatedData.commission_rate,
        createdAt: new Date(updatedData.created_at).getTime(),
        updatedAt: new Date(updatedData.updated_at).getTime(),
        disputeResolution: updatedData.dispute_resolution,
      };

      // Update the local state to reflect the change immediately
      setContracts(prevContracts =>
        prevContracts.map(c => (c.id === updatedContract.id ? updatedContract : c))
      );
      
      showSuccess(message);
      await clearConversationMessages(contract.clientId, contract.providerId);
      const adminUser = allUsers.find(u => u.type === 'admin');
      if (adminUser) {
          await clearConversationMessages(contract.clientId, adminUser.id);
          await clearConversationMessages(contract.providerId, adminUser.id);
      }
    }
  };

  const getContractsForUser = useCallback((userId: string): Contract[] => {
    if (currentUser?.type === 'admin') {
      return contracts;
    }
    return contracts.filter(
      (contract) => contract.clientId === userId || contract.providerId === userId
    );
  }, [contracts, currentUser]);

  return (
    <ContractContext.Provider
      value={{
        contracts,
        isLoadingContracts,
        createContract,
        makeOffer,
        depositFunds,
        handleContractAction,
        resolveDispute,
        getContractsForUser,
        hasActiveOrPendingContract,
        getLatestContractBetweenUsers,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error("useContracts debe ser usado dentro de un ContractProvider");
  }
  return context;
};