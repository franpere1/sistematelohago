import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { VENEZUELAN_STATES } from "@/constants/venezuelanStates";
import { ServiceCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showError, showSuccess } from "@/utils/toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
// import AdminRegistrationForm from "@/components/AdminRegistrationForm"; // Removed import

const Auth: React.FC = () => {
  const [activeTab, setActiveTab] = useState("login");
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser) {
      if (currentUser.type === "client") {
        navigate("/client-dashboard");
      } else if (currentUser.type === "provider") {
        navigate("/provider-dashboard");
      } else if (currentUser.type === "admin") {
        navigate("/admin-dashboard");
      }
    }
  }, [currentUser, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-card dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-2 text-foreground dark:text-foreground">
            Bienvenido a TE LO HAGO
          </h2>
          <p className="text-lg font-semibold text-foreground dark:text-foreground mb-6">
            El Portal donde todo te lo pueden hacer
          </p>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3"> {/* Changed to grid-cols-3 */}
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="client-register">Cliente</TabsTrigger>
              <TabsTrigger value="provider-register">Proveedor</TabsTrigger>
              {/* <TabsTrigger value="admin-register">Administrador</TabsTrigger> */} {/* Removed tab for admin */}
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="client-register">
              <ClientRegistrationForm />
            </TabsContent>
            <TabsContent value="provider-register">
              <ProviderRegistrationForm />
            </TabsContent>
            {/* <TabsContent value="admin-register"> */} {/* Removed content for admin */}
              {/* <AdminRegistrationForm onSuccess={() => setActiveTab("login")} /> */}
            {/* </TabsContent> */}
          </Tabs>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    // The useEffect in the Auth component will handle navigation.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="login-email">Correo Electrónico</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Iniciar Sesión
      </Button>
    </form>
  );
};

const ClientRegistrationForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const { registerClient } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    await registerClient({
      name,
      email,
      state,
      phone,
      password,
    });
    // The useEffect in the Auth component will handle navigation.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="client-name">Nombre</Label>
        <Input
          id="client-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="client-email">Correo Electrónico</Label>
        <Input
          id="client-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="client-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="client-state">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            {VENEZUELAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="client-phone">Número de Teléfono</Label>
        <Input
          id="client-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: 0412-1234567"
          required
        />
      </div>
      <div>
        <Label htmlFor="client-password">Contraseña</Label>
        <Input
          id="client-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Registrar Cliente
      </Button>
    </form>
  );
};

const ProviderRegistrationForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [password, setPassword] = useState("");
  const [rate, setRate] = useState<number | ''>('');
  const [phone, setPhone] = useState("");
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

  const { registerProvider } = useAuth();

  const serviceCategories: ServiceCategory[] = ([ // Explicitly type as ServiceCategory[]
    "Abogado", "Adiestrador canino", "Albañil", "Arquitecto", "Barbero", "Carpintero", "Cerrajero",
    "Chef a domicilio", "Chofer privado", "Clases de idiomas", "Clases de música", "Clases particulares",
    "Contador", "Cuidador de adultos mayores", "Electricista", "Enfermero(a)", "Fumigador", "Herrero",
    "Ingeniero", "Jardinero", "Lavado de autos", "Limpieza de casas", "Limpieza de oficinas",
    "Maquillador", "Manicurista", "Masajista", "Mecánico", "Mesonero", "Motorizado / Delivery",
    "Mudanzas", "Niñera", "Organización de eventos", "Paseador de perros", "Peluquero", "Pintor",
    "Plomero", "Repostero", "Servicios de sistemas", "Servicios digitales", "Servicios electrónica",
    "Técnico de aire acondicionado",
  ] as ServiceCategory[]).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      showError("Por favor, selecciona una categoría de servicio.");
      return;
    }
    if (serviceDescription.length > 50) {
      showError("La descripción breve no debe exceder los 50 caracteres.");
      return;
    }
    if (rate === '' || isNaN(Number(rate)) || Number(rate) < 0) {
      showError("Por favor, introduce una tarifa válida.");
      return;
    }
    if (password.length < 6) {
      showError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    await registerProvider({
      name,
      email,
      state,
      phone,
      password,
      category: category as ServiceCategory,
      serviceTitle,
      serviceDescription,
      rate: Number(rate),
    });
    // The useEffect in the Auth component will handle navigation.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <Label htmlFor="provider-name">Nombre</Label>
        <Input
          id="provider-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-email">Correo Electrónico</Label>
        <Input
          id="provider-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="provider-state">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            {VENEZUELAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="provider-phone">Número de Teléfono</Label>
        <Input
          id="provider-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: 0412-1234567"
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-category">Categoría del Servicio</Label>
        <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCategoryCombobox}
              className="w-full justify-between"
            >
              {category
                ? serviceCategories.find((c) => c === category)
                : "Selecciona una categoría..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Buscar categoría..." />
              <CommandList>
                <CommandEmpty>No se encontró categoría.</CommandEmpty>
                <CommandGroup>
                  {serviceCategories.map((cat) => (
                    <CommandItem
                      key={cat}
                      value={cat}
                      onSelect={(currentValue) => {
                        setCategory(currentValue === category ? "" : (currentValue as ServiceCategory));
                        setOpenCategoryCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          category === cat ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {cat}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor="provider-service-title">Título del Servicio</Label>
        <Input
          id="provider-service-title"
          type="text"
          value={serviceTitle}
          onChange={(e) => setServiceTitle(e.target.value)}
          placeholder="Ej: Plomero a domicilio"
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-service-description">Descripción Breve (máx. 50 caracteres)</Label>
        <Textarea
          id="provider-service-description"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          maxLength={50}
          required
        />
      </div>
      <div>
        <Label htmlFor="provider-rate">Tarifa por Servicio (USD)</Label>
        <Input
          id="provider-rate"
          type="number"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || '')}
          placeholder="Ej: 50"
          required
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <Label htmlFor="provider-password">Contraseña</Label>
        <Input
          id="provider-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Registrar Proveedor
      </Button>
    </form>
  );
};

export default Auth;