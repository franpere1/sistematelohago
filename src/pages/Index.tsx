import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        if (currentUser.type === "client") {
          navigate("/client-dashboard");
        } else if (currentUser.type === "provider") {
          navigate("/provider-dashboard");
        } else if (currentUser.type === "admin") {
          navigate("/admin-dashboard");
        }
      } else {
        navigate("/auth");
      }
    }
  }, [currentUser, isLoading, navigate]);

  // Renderizar un mensaje de carga si isLoading es true
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center p-4">
            <h1 className="text-4xl font-bold mb-4 text-foreground dark:text-foreground">
              Cargando...
            </h1>
            <p className="text-xl text-foreground dark:text-foreground">
              Por favor espera.
            </p>
          </div>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  // Si no está cargando y no hay currentUser, significa que ya se redirigió a /auth
  // Si hay currentUser, el useEffect ya redirigió al dashboard correspondiente.
  // Este return solo se alcanzaría si hay un caso no manejado, pero el useEffect debería cubrirlo.
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-4">
          <h1 className="text-4xl font-bold mb-4 text-foreground dark:text-foreground">
            Redirigiendo...
          </h1>
          <p className="text-xl text-foreground dark:text-foreground">
            Por favor espera.
          </p>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;