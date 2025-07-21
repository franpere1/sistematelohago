import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { Client, Provider, User, Feedback, FeedbackType, Admin } from "@/types";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client"; // Importar el cliente de Supabase

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  allUsers: User[]; // Centralized user cache
  isLoadingUsers: boolean; // Loading state for the cache
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerClient: (
    clientData: Omit<Client, "id" | "createdAt" | "type"> & { password: string }
  ) => Promise<void>;
  registerProvider: (
    providerData: Omit<
      Provider,
      "id" | "createdAt" | "type" | "feedback" | "starRating"
    > & { password: string }
  ) => Promise<void>;
  findUserByEmail: (email: string) => Promise<User | undefined>;
  findUserById: (id: string) => Promise<User | undefined>;
  updateUser: (user: User) => Promise<boolean>;
  updateUserImage: (imageFile: File, imageType: 'profile' | 'service') => Promise<boolean>;
  getAllProviders: () => Promise<Provider[]>;
  getAllUsers: () => Promise<User[]>;
  addFeedbackToProvider: (
    providerId: string,
    type: FeedbackType,
    comment: string
  ) => Promise<boolean>;
  exchangeRate: number;
  setExchangeRate: (rate: number) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Fixed UUID for the single settings row
const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001";
const MAX_IMAGE_SIZE_KB = 250;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

// Helper to race a promise against a timeout
const withTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error("La operación tardó demasiado en responder.")
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(timeoutError);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

// Helper function to map Supabase profile to our User type
const mapProfileToUser = (profile: any): User => {
  return {
    id: profile.id,
    name: profile.name || profile.email,
    email: profile.email,
    state: profile.state || "",
    phone: profile.phone || "",
    type: profile.type,
    category: profile.category,
    serviceTitle: profile.service_title,
    serviceDescription: profile.service_description,
    serviceImage: profile.service_image,
    rate: profile.rate,
    feedback: profile.feedback || [],
    starRating: profile.star_rating || 0,
    profileImage: profile.profile_image,
    createdAt: new Date(profile.created_at).getTime(),
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRate, setExchangeRateState] = useState<number>(36.5);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const fetchUserProfile = useCallback(
    async (supabaseUser: any): Promise<User | null> => {
      if (!supabaseUser) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile:", error);
        return null;
      }

      if (profile) {
        if (profile.type === "admin") {
          return {
            id: profile.id,
            name: profile.name || "Admin",
            email: profile.email || supabaseUser.email,
            state: profile.state || "N/A",
            type: "admin",
            createdAt: new Date(profile.created_at).getTime(),
          } as Admin;
        }
        return mapProfileToUser(profile);
      }

      if (!profile && supabaseUser.email === "admin@admin.com") {
        console.warn(
          "No profile found for admin@admin.com. Creating a temporary admin user object to allow login."
        );
        return {
          id: supabaseUser.id,
          name: "Admin",
          email: supabaseUser.email,
          state: "N/A",
          type: "admin",
          createdAt: new Date(supabaseUser.created_at).getTime(),
        } as Admin;
      }

      console.error(
        `No profile found for user ID: ${supabaseUser.id}. Login cannot proceed.`
      );
      showError(
        "No se pudo encontrar el perfil del usuario. Por favor, contacta a soporte."
      );
      return null;
    },
    []
  );

  const refreshCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const userProfile = await fetchUserProfile(user);
      setCurrentUser(userProfile);
    }
  }, [fetchUserProfile]);

  const fetchExchangeRate = useCallback(async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("exchange_rate")
      .eq("id", SETTINGS_ROW_ID)
      .single();

    if (error && error.code === "PGRST116") {
      const { data: insertData, error: insertError } = await supabase
        .from("settings")
        .insert({
          id: SETTINGS_ROW_ID,
          exchange_rate: 36.5,
          updated_at: new Date().toISOString(),
        })
        .select("exchange_rate")
        .single();

      if (insertError) {
        console.error("Error inserting initial settings row:", insertError);
        setExchangeRateState(36.5);
      } else if (insertData) {
        setExchangeRateState(insertData.exchange_rate);
      }
    } else if (error) {
      console.error("Error fetching exchange rate from Supabase:", error);
      setExchangeRateState(36.5);
    } else if (data) {
      setExchangeRateState(data.exchange_rate);
    }
  }, []);

  // Effect for Auth State Change (runs once)
  useEffect(() => {
    setIsLoading(true);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        setCurrentUser(userProfile);
        if (userProfile && _event === 'SIGNED_IN') {
          showSuccess(`Bienvenido, ${userProfile.name}!`);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Effect for Exchange Rate (runs once)
  useEffect(() => {
    fetchExchangeRate();

    const settingsChannel = supabase
      .channel("settings_channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "settings",
          filter: `id=eq.${SETTINGS_ROW_ID}`,
        },
        (payload) => {
          const updatedSettings = payload.new as any;
          if (updatedSettings && updatedSettings.exchange_rate !== undefined) {
            setExchangeRateState(updatedSettings.exchange_rate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchExchangeRate]);

  // Effect for Profile Updates (runs when currentUser changes)
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const profilesChannel = supabase
      .channel(`profile_updates_${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUser.id}`,
        },
        async () => {
          await refreshCurrentUser();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [currentUser?.id, refreshCurrentUser]);

  // New effect to fetch and cache all users
  useEffect(() => {
    const fetchAllUsers = async () => {
      setIsLoadingUsers(true);
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) {
        console.error("Error fetching all users:", error);
        setAllUsers([]);
      } else {
        setAllUsers(data.map(mapProfileToUser));
      }
      setIsLoadingUsers(false);
    };

    fetchAllUsers();

    const allProfilesSubscription = supabase
      .channel('all-profiles-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchAllUsers() // Refetch on any change to keep cache fresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(allProfilesSubscription);
    };
  }, []);

  const findUserByEmail = useCallback(
    async (email: string): Promise<User | undefined> => {
      return allUsers.find(user => user.email === email);
    },
    [allUsers]
  );

  const findUserById = useCallback(
    async (id: string): Promise<User | undefined> => {
      return allUsers.find(user => user.id === id);
    },
    [allUsers]
  );

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      showError(`Error al iniciar sesión: ${error.message}`);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(`Error al cerrar sesión: ${error.message}`);
      setIsLoading(false);
    } else {
      showSuccess("Sesión cerrada correctamente.");
    }
  };

  const registerClient = async (
    clientData: Omit<Client, "id" | "createdAt" | "type"> & { password: string }
  ): Promise<void> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: clientData.email,
      password: clientData.password,
      options: {
        data: {
          name: clientData.name,
          state: clientData.state,
          phone: clientData.phone,
          type: "client",
        },
      },
    });
    if (error) {
      showError(`Error al registrar cliente: ${error.message}`);
      setIsLoading(false);
    }
  };

  const registerProvider = async (
    providerData: Omit<
      Provider,
      "id" | "createdAt" | "type" | "feedback" | "starRating"
    > & { password: string }
  ): Promise<void> => {
    setIsLoading(true);
    const toastId = showLoading("Registrando proveedor...");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: providerData.email,
        password: providerData.password,
        options: {
          data: {
            name: providerData.name,
            state: providerData.state,
            phone: providerData.phone,
            type: "provider",
          },
        },
      });
  
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("No se pudo crear el usuario.");
  
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          category: providerData.category,
          service_title: providerData.serviceTitle,
          service_description: providerData.serviceDescription,
          rate: providerData.rate,
        })
        .eq('id', signUpData.user.id);
  
      if (profileUpdateError) {
        showError("Cuenta creada, pero hubo un error al guardar los detalles del servicio. Por favor, edita tu perfil.");
      }
      
      dismissToast(toastId);
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Error al registrar proveedor: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserImage = async (
    imageFile: File,
    imageType: "profile" | "service"
  ): Promise<boolean> => {
    if (!currentUser) {
      showError("Debes iniciar sesión para actualizar tu imagen.");
      return false;
    }

    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      showError(`La foto debe tener un máximo de ${MAX_IMAGE_SIZE_KB} KB.`);
      return false;
    }

    if (imageType === "service" && currentUser.type !== "provider") {
      showError("Solo los proveedores pueden tener una imagen de servicio.");
      return false;
    }

    const toastId = showLoading("Subiendo imagen...");

    try {
      if (currentUser.type === 'provider') {
        const TIMEOUT_MS = 5000;
        const { error: rpcError } = await withTimeout(
            supabase.rpc('sanitize_provider_metadata'),
            TIMEOUT_MS,
            new Error("Timeout al sanitizar la sesión.")
        );
        if (rpcError) throw rpcError;
      }

      const filePath = `${currentUser.id}/${imageType}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("user-images")
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) {
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("user-images")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      const profileUpdate: { profile_image?: string; service_image?: string } = {};
      if (imageType === "profile") {
        profileUpdate.profile_image = imageUrl;
      } else {
        profileUpdate.service_image = imageUrl;
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", currentUser.id);

      if (dbError) {
        throw new Error(`Error al actualizar el perfil: ${dbError.message}`);
      }

      await refreshCurrentUser();
      dismissToast(toastId);
      showSuccess("Imagen actualizada correctamente.");
      return true;
    } catch (error: any) {
      dismissToast(toastId);
      console.error("Error actualizando imagen:", error);
      showError(error.message || "Ocurrió un error al actualizar la imagen.");
      return false;
    }
  };

  const updateUser = async (user: User): Promise<boolean> => {
    const toastId = showLoading("Guardando cambios...");
    try {
      if (user.type === 'client') {
        const client = user as Client;
        const { error } = await supabase
          .from('profiles')
          .update({
            name: client.name,
            state: client.state,
            phone: client.phone,
          })
          .eq('id', client.id);
  
        if (error) {
          throw new Error(`Error al actualizar el perfil del cliente: ${error.message}`);
        }
      } 
      else if (user.type === 'provider') {
        const provider = user as Provider;
        const TIMEOUT_MS = 5000;

        const { error: rpcError } = await withTimeout(
          supabase.rpc('sanitize_provider_metadata'),
          TIMEOUT_MS,
          new Error("Timeout al sanitizar la sesión.")
        );
        if (rpcError) throw new Error(`Error al sanitizar la sesión: ${rpcError.message}`);
        
        const { error: profileError } = await withTimeout(
          supabase
            .from('profiles')
            .update({
              name: provider.name,
              state: provider.state,
              phone: provider.phone || null,
              category: provider.category,
              service_title: provider.serviceTitle,
              service_description: provider.serviceDescription,
              rate: provider.rate,
            })
            .eq('id', provider.id),
          TIMEOUT_MS,
          new Error("Timeout en la actualización del perfil.")
        );
        if (profileError) throw new Error(`Error al actualizar el perfil: ${profileError.message}`);
      }
  
      await refreshCurrentUser();
      dismissToast(toastId);
      showSuccess("Información actualizada correctamente.");
      return true;
  
    } catch (error: any) {
      dismissToast(toastId);
      console.error("Error actualizando el usuario:", error);
      showError(error.message || "Ocurrió un error al actualizar tu información.");
      return false;
    }
  };

  const getAllProviders = useCallback(async (): Promise<Provider[]> => {
    return allUsers.filter(user => user.type === 'provider') as Provider[];
  }, [allUsers]);

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    return allUsers;
  }, [allUsers]);

  const addFeedbackToProvider = async (
    providerId: string,
    type: FeedbackType,
    comment: string
  ): Promise<boolean> => {
    if (!currentUser) {
      showError("Debes iniciar sesión para dejar feedback.");
      return false;
    }
    const { error } = await supabase.rpc("add_feedback", {
      provider_id_in: providerId,
      client_id_in: currentUser.id,
      feedback_type_in: type,
      comment_in: comment,
    });
    if (error) {
      showError(`Error al añadir feedback: ${error.message}`);
      return false;
    }
    return true;
  };

  const setExchangeRate = async (rate: number) => {
    if (isNaN(rate) || rate <= 0) {
      showError("La tasa de cambio debe ser un número positivo.");
      return;
    }
    const { data, error } = await supabase
      .from("settings")
      .update({ exchange_rate: rate, updated_at: new Date().toISOString() })
      .eq("id", SETTINGS_ROW_ID)
      .select()
      .single();
    if (error) {
      showError(`Error al actualizar la tasa de cambio: ${error.message}`);
    } else {
      setExchangeRateState(data.exchange_rate);
      showSuccess(
        `Tasa de cambio actualizada a ${data.exchange_rate.toFixed(2)} VEF/USD.`
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        allUsers,
        isLoadingUsers,
        login,
        logout,
        registerClient,
        registerProvider,
        findUserByEmail,
        findUserById,
        updateUser,
        updateUserImage,
        getAllProviders,
        getAllUsers,
        addFeedbackToProvider,
        exchangeRate,
        setExchangeRate,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};