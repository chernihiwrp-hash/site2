import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  glowColor?: "green" | "lime" | "yellow";
  backTo?: string;
}

const PageHeader = ({ title, subtitle, backTo }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 mb-6">
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="w-10 h-10 rounded-xl liquid-glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div>
        <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

export default PageHeader;
