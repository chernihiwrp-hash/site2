import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "green" | "lime" | "yellow" | "cyan" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}

const variants = {
  green: {
    bg: "from-[hsl(84,81%,44%)] via-[hsl(142,71%,45%)] to-[hsl(152,76%,30%)]",
    glow: "hsl(142,71%,45%,0.5)",
    glowHover: "hsl(84,81%,44%,0.7)",
  },
  lime: {
    bg: "from-[hsl(84,81%,44%)] via-[hsl(142,71%,45%)] to-[hsl(152,76%,30%)]",
    glow: "hsl(84,81%,44%,0.5)",
    glowHover: "hsl(84,81%,44%,0.7)",
  },
  yellow: {
    bg: "from-[hsl(45,100%,55%)] to-[hsl(30,100%,55%)]",
    glow: "hsl(45,100%,55%,0.5)",
    glowHover: "hsl(45,100%,55%,0.8)",
  },
  cyan: {
    bg: "from-[hsl(180,100%,50%)] to-[hsl(84,81%,44%)]",
    glow: "hsl(180,100%,50%,0.4)",
    glowHover: "hsl(180,100%,50%,0.7)",
  },
  danger: {
    bg: "from-[hsl(0,70%,50%)] to-[hsl(0,60%,35%)]",
    glow: "hsl(0,70%,50%,0.5)",
    glowHover: "hsl(0,70%,50%,0.8)",
  },
};

const GradientButton = ({
  children,
  onClick,
  variant = "green",
  className,
  disabled = false,
  type = "button",
}: GradientButtonProps) => {
  const v = variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative px-6 py-3 rounded-2xl font-semibold text-sm text-white overflow-hidden",
        "transition-all duration-250",
        "active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:brightness-100",
        `bg-gradient-to-r ${v.bg}`,
        className
      )}
      style={{
        boxShadow: `0 0 16px ${v.glow}, 0 2px 8px hsl(0 0% 0% / 0.3)`,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 28px ${v.glowHover}, 0 0 60px ${v.glow}, 0 4px 12px hsl(0 0% 0% / 0.4)`;
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.02)";
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 16px ${v.glow}, 0 2px 8px hsl(0 0% 0% / 0.3)`;
        (e.currentTarget as HTMLButtonElement).style.transform = "";
      }}
    >
      {/* Liquid glass shine overlay */}
      <span className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "linear-gradient(135deg, hsl(0 0% 100% / 0.15) 0%, transparent 50%, hsl(0 0% 0% / 0.1) 100%)",
          borderTop: "1px solid hsl(0 0% 100% / 0.25)",
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

export default GradientButton;
