import React from "react";
import { Handshake, Wrench } from "lucide-react";

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <Handshake className="h-6 w-6 text-orange-500" />
        <Wrench className="h-3 w-3 text-blue-400 absolute bottom-0 right-0 transform translate-x-1 translate-y-1" />
      </div>
      <span className="font-sans text-xl font-semibold text-foreground dark:text-foreground">
        TE LO HAGO
      </span>
    </div>
  );
};

export default React.memo(Logo);