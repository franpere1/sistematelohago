import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VENEZUELAN_STATES } from "@/constants/venezuelanStates";
import { ServiceCategory, Provider } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderProfileEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const MAX_IMAGE_SIZE_KB = 250;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

const ProviderProfileEditor: React.FC<ProviderProfileEditorProps> = ({ onSave, onCancel }) => {
  const { currentUser, updateUser, updateUserImage } = useAuth();
  const provider = currentUser && currentUser.type === "provider" ? (currentUser as Provider) : null;

  const [name, setName] = useState(provider?.name || "");
  const [email, setEmail] = useState(provider?.email || "");
  const [state, setState] = useState(provider?.state || "");
  const [phone, setPhone] = useState(provider?.phone || "");
  const [category, setCategory] = useState<ServiceCategory | "">(provider?.category || "");
  const [serviceTitle, setServiceTitle] = useState(provider?.serviceTitle || "");
  const [serviceDescription, setServiceDescription] = useState(provider?.serviceDescription || "");
  const [rate, setRate] = useState<number | ''>(provider?.rate || '');
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<{ profile: boolean; service: boolean }>({ profile: false, service: false });

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setEmail(provider.email);
      setState(provider.state);
      setPhone(provider.phone || "");
      setCategory(provider.category);
      setServiceTitle(provider.serviceTitle);
      setServiceDescription(provider.serviceDescription);
      setRate(provider.rate);
    }
  }, [provider]);

  const serviceCategories: ServiceCategory[] = (["Abogado", "Adiestrador canino", "Albañil", "Arquitecto", "Barbero", "Carpintero", "Cerrajero", "Chef a domicilio", "Chofer privado", "Clases de idiomas", "Clases de música", "Clases particulares", "Contador", "Cuidador de adultos mayores", "Electricista", "Enfermero(a)", "Fumigador", "Herrero", "Ingeniero", "Jardinero", "Lavado de autos", "Limpieza de casas", "Limpieza de oficinas", "Maquillador", "Manicurista", "Masajista", "Mecánico", "Mesonero", "Motorizado / Delivery", "Mudanzas", "Niñera", "Organización de eventos", "Paseador de perros", "Peluquero", "Pintor", "Plomero", "Repostero", "Servicios de sistemas", "Servicios digitales", "Servicios electrónica", "Técnico de aire acondicionado"] as ServiceCategory[]).sort();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'service') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        showError(`La foto debe tener un máximo de ${MAX_IMAGE_SIZE_KB} KB.`);
        e.target.value = '';
        return;
      }
      setIsUploading(prev => ({ ...prev, [type]: true }));
      await updateUserImage(file, type);
      setIsUploading(prev => ({ ...prev, [type]: false }));
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !category) {
      showError("Por favor, completa todos los campos requeridos.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedProviderData: Provider = {
        ...provider,
        name,
        email,
        state,
        phone,
        category,
        serviceTitle,
        serviceDescription,
        rate: Number(rate),
      };

      const success = await updateUser(updatedProviderData);

      if (success) {
        onSave();
      }
      // If !success, the error toast is handled inside updateUser.
      // The finally block will still run to disable the loader.

    } catch (error) {
      console.error("Error inesperado en handleSubmit:", error);
      showError("Ocurrió un error inesperado al guardar los cambios.");
    } finally {
      // This block is guaranteed to run, regardless of success or failure.
      setIsSaving(false);
      console.log("Finalizó handleSubmit");
    }
  };

  if (!provider) {
    return <div className="text-center text-gray-500">Cargando perfil...</div>;
  }

  const anyLoading = isSaving || isUploading.profile || isUploading.service;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Label htmlFor="edit-name">Nombre</Label>
      <Input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      <Label htmlFor="edit-email">Correo Electrónico</Label>
      <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled />
      <Label htmlFor="edit-state">Estado</Label>
      <Select value={state} onValueChange={setState} required>
        <SelectTrigger id="edit-state"><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
        <SelectContent>{VENEZUELAN_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
      </Select>
      <Label htmlFor="edit-phone">Número de Teléfono</Label>
      <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 0412-1234567" required />
      
      <Label htmlFor="edit-profile-image">Foto de Perfil</Label>
      <Input id="edit-profile-image" type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'profile')} className="mt-1" disabled={anyLoading} />
      {provider.profileImage && (
        <div className="mt-2 relative w-24 h-24">
          <img src={provider.profileImage} alt="Vista previa del perfil" className="w-24 h-24 rounded-full object-cover" />
          {isUploading.profile && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}
      
      <Label htmlFor="edit-category">Categoría del Servicio</Label>
      <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
        <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{category || "Selecciona una categoría..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Buscar categoría..." /><CommandList><CommandEmpty>No se encontró.</CommandEmpty><CommandGroup>{serviceCategories.map((cat) => (<CommandItem key={cat} value={cat} onSelect={(currentValue) => { setCategory(currentValue as ServiceCategory); setOpenCategoryCombobox(false);}}><Check className={cn("mr-2 h-4 w-4", category === cat ? "opacity-100" : "opacity-0")} />{cat}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
      </Popover>

      <Label htmlFor="edit-service-title">Título del Servicio</Label>
      <Input id="edit-service-title" type="text" value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} placeholder="Ej: Plomero a domicilio" required />
      <Label htmlFor="edit-service-description">Descripción Breve (máx. 50 caracteres)</Label>
      <Textarea id="edit-service-description" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} maxLength={50} required />
      
      <Label htmlFor="edit-service-image">Imagen del Servicio</Label>
      <Input id="edit-service-image" type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'service')} className="mt-1" disabled={anyLoading} />
      {provider.serviceImage && (
        <div className="mt-2 relative w-full h-48">
          <img src={provider.serviceImage} alt="Vista previa del servicio" className="w-full h-48 object-cover rounded-md" />
          {isUploading.service && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
          )}
        </div>
      )}
      
      <Label htmlFor="edit-rate">Tarifa por Servicio (USD)</Label>
      <Input id="edit-rate" type="number" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || '')} placeholder="Ej: 50" required min="0" step="0.01" />

      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={anyLoading}>Cancelar</Button>
        <Button type="submit" disabled={anyLoading}>
          {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : ("Guardar Cambios")}
        </Button>
      </div>
    </form>
  );
};

export default ProviderProfileEditor;