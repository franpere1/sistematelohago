import React, { useState, useEffect } from "react";
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
import { VENEZUELAN_STATES } from "@/constants/venezuelanStates";
import { Client } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

interface ClientProfileEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const MAX_IMAGE_SIZE_KB = 250;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

const ClientProfileEditor: React.FC<ClientProfileEditorProps> = ({
  onSave,
  onCancel,
}) => {
  const { currentUser, updateUser, updateUserImage } = useAuth();
  const client = currentUser && currentUser.type === "client" ? (currentUser as Client) : null;

  const [name, setName] = useState(client?.name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [state, setState] = useState(client?.state || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email);
      setState(client.state);
      setPhone(client.phone || "");
    }
  }, [client]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        showError(`La foto debe tener un máximo de ${MAX_IMAGE_SIZE_KB} KB.`);
        e.target.value = '';
        return;
      }
      setIsUploading(true);
      await updateUserImage(file, 'profile');
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) {
      showError("No se pudo cargar la información del cliente.");
      return;
    }

    setIsSaving(true);
    const updatedClientData: Client = {
      ...client,
      name,
      email,
      state,
      phone,
    };

    const success = await updateUser(updatedClientData);
    setIsSaving(false);

    if (success) {
      onSave();
    }
  };

  if (!client) {
    return <div className="text-center text-gray-500">Cargando perfil...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-client-name">Nombre</Label>
        <Input id="edit-client-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="edit-client-email">Correo Electrónico</Label>
        <Input id="edit-client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled />
      </div>
      <div>
        <Label htmlFor="edit-client-state">Estado</Label>
        <Select value={state} onValueChange={setState} required>
          <SelectTrigger id="edit-client-state"><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
          <SelectContent>
            {VENEZUELAN_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="edit-client-phone">Número de Teléfono</Label>
        <Input id="edit-client-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 0412-1234567" required />
      </div>
      <div>
        <Label htmlFor="edit-profile-image">Foto de Perfil</Label>
        <Input id="edit-profile-image" type="file" accept="image/*" onChange={handleProfileImageChange} className="mt-1" disabled={isUploading} />
        {client.profileImage && (
          <div className="mt-2 relative w-24 h-24">
            <img src={client.profileImage} alt="Vista previa del perfil" className="w-24 h-24 rounded-full object-cover" />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || isUploading}>Cancelar</Button>
        <Button type="submit" disabled={isSaving || isUploading}>
          {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : ("Guardar Cambios")}
        </Button>
      </div>
    </form>
  );
};

export default ClientProfileEditor;