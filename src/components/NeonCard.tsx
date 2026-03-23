import { ReactNode } from "react";

interface NeonCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: "green" | "lime" | "yellow" | "red";
  style?: React.CSSProperties;
}

const glowColors = {
  green: { hover: "hsl(142,71%,45%,0.3)", border: "hsl(142,71%,45%,0.2)" },
  lime: { hover: "hsl(84,81%,44%,0.3)", border: "hsl(84,81%,44%,0.2)" },
  yellow: { hover: "hsl(45,100%,55%,0.3)", border: "hsl(45,100%,55%,0.2)" },
  red: { hover: "hsl(0,70%,50%,0.3)", border: "hsl(0,70%,50%,0.2)" },
};

const NeonCard = ({ children, className = "", onClick, glowColor = "lime", style }: NeonCardProps) => {
  const g = glowColors[glowColor];

  return (
    <div
      onClick={onClick}
      style={style}
      className={`liquid-glass-card rounded-2xl p-4 transition-all duration-300 ${onClick ? "cursor-pointer card-press ripple-effect" : ""} ${className}`}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${g.hover}, inset 0 1px 0 hsl(0 0% 100% / 0.1)`;
        (e.currentTarget as HTMLDivElement).style.borderColor = g.border;
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.borderColor = "";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      {children}
    </div>
  );
};

export default NeonCard;
