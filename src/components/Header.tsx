import React from "react";
    import Logo from "./Logo";
    import { Link } from "react-router-dom";
    import { Button } from "@/components/ui/button";
    import { useAuth } from "@/context/AuthContext";
    import { useNavigate } from "react-router-dom";

    const Header: React.FC = () => {
      const { currentUser, logout, isLoading } = useAuth();
      const navigate = useNavigate();

      const handleLogout = () => {
        logout();
        navigate("/auth");
      };

      const getDashboardPath = () => {
        if (!currentUser) return "/";
        if (currentUser.type === "client") return "/client-dashboard";
        if (currentUser.type === "provider") return "/provider-dashboard";
        if (currentUser.type === "admin") return "/admin-dashboard";
        return "/";
      };

      return (
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Link to={getDashboardPath()}>
            <Logo />
          </Link>
          {isLoading ? (
            <div className="text-gray-500 dark:text-gray-400">Cargando usuario...</div>
          ) : currentUser ? (
            <div className="flex items-center space-x-4">
              <span className="text-foreground dark:text-foreground">
                Hola, {currentUser.name} ({currentUser.type === "client" ? "Cliente" : currentUser.type === "provider" ? "Proveedor" : "Administrador"})
              </span>
              <Button onClick={handleLogout} variant="outline">
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="default">Iniciar Sesión / Registrarse</Button>
            </Link>
          )}
        </header>
      );
    };

    export default React.memo(Header);