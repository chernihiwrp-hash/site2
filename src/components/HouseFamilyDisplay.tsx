import { useEffect, useState } from "react";
import { Crown, Shield, User as UserIcon, Users } from "lucide-react";
import { store } from "../lib/store";
import type { FamilyMember, FamilyRole } from "../lib/store";

const roleMeta: Record<FamilyRole, { label: string; icon: any; color: string }> = {
  owner:    { label: "Власник",      icon: Crown,   color: "hsl(45 100% 60%)" },
  co_owner: { label: "Співвласник",  icon: Shield,  color: "hsl(180 80% 55%)" },
  member:   { label: "Сожитель",     icon: UserIcon, color: "hsl(142 71% 50%)" },
};

interface Props {
  housePurchaseId: number;
  compact?: boolean;
}

/**
 * Компактний блок із сім'єю для вставки на сторінку інформації про дом
 * (наприклад, у "Покупка домів" → інфо про дом).
 */
const HouseFamilyDisplay = ({ housePurchaseId, compact = false }: Props) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    store.getFamily(housePurchaseId).then(list => {
      if (alive) { setMembers(list); setLoading(false); }
    });
    return () => { alive = false; };
  }, [housePurchaseId]);

  if (loading) {
    return (
      <div className="text-[10px] text-muted-foreground/60 px-2 py-1.5">Завантаження сім'ї…</div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl px-3 py-2 flex items-center gap-2"
        style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-[10px] text-muted-foreground">Сім'ї немає</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.18)" }}>
      <div className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid hsl(142 71% 45% / 0.12)" }}>
        <Users className="w-3.5 h-3.5 text-primary" />
        <p className="text-[11px] font-bold text-foreground">Сім'я</p>
        <span className="text-[10px] text-muted-foreground">· {members.length}</span>
      </div>
      <div className={compact ? "divide-y divide-white/5" : "p-2 space-y-1.5"}>
        {members.map(m => {
          const meta = roleMeta[m.role];
          const Icon = meta.icon;
          return (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${meta.color.replace(")", " / 0.12)")}`, border: `1px solid ${meta.color.replace(")", " / 0.3)")}` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">{m.username}</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HouseFamilyDisplay;
