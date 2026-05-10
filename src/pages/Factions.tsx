import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  AlertTriangle, Shield, Swords, Scale, Gavel, Flame, Crosshair,
  Skull, Target, Eye, BookOpen, ShieldCheck, ChevronRight, Users,
  Car, FileText, MessageSquare, Coins, Crown, Lock, Star, Zap, Search, Building2, Plus
} from "lucide-react";
import { supabase } from "../lib/store";

// Іконки за назвою
const ICON_MAP: Record<string, typeof Shield> = {
  Shield, Swords, Scale, Gavel, Flame, Crosshair, Skull, Target, Eye,
  BookOpen, ShieldCheck, AlertTriangle, Car, FileText, MessageSquare,
  Coins, Crown, Lock, Star, Zap, Search, Building2, Users, Plus,
};

// Базові дані статичних фракцій (використовуються тільки як fallback)
const STATIC_BASE = [
];

type FactionItem = {
  id: string;
  name: string;
  desc: string;
  iconName: string;
  color: string;
  gradient: string;
  bg_image?: string | null;
  dangerous: boolean;
  memberCount: number;
};

const Factions = () => {
  const navigate = useNavigate();
  const [factionList, setFactionList] = useState<FactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 1. DB фракції з Supabase (з усіма кастомними полями)
      const { data: dbFactions } = await supabase
        .from("factions")
        .select("id, name, color, gradient, description, icon_name, dangerous, questions, section, bg_image, banner_image")
        .order("created_at", { ascending: true });

      // 2. Рахуємо учасників
      const { data: appData } = await supabase
        .from("faction_applications")
        .select("faction_id, faction_name")
        .eq("status", "approved");

      const countById: Record<string, number> = {};
      const countByName: Record<string, number> = {};
      (appData || []).forEach((a: Record<string, unknown>) => {
        const fid = String(a.faction_id || "");
        const fname = (a.faction_name as string || "").toLowerCase();
        if (fid) countById[fid] = (countById[fid] || 0) + 1;
        if (fname) countByName[fname] = (countByName[fname] || 0) + 1;
      });

      const result: FactionItem[] = [];
      const dbNames = new Set<string>();

      // 3. DB фракції — беремо всі кастомні поля
      if (dbFactions && dbFactions.length > 0) {
        for (const f of dbFactions as Record<string, unknown>[]) {
          const color = (f.color as string) || "hsl(84,81%,44%)";
          const name = f.name as string;
          dbNames.add(name.toLowerCase());
          result.push({
            id: String(f.id),
            name,
            desc: (f.description as string) || "Фракція сервера",
            iconName: (f.icon_name as string) || "Shield",
            color,
            gradient: (f.gradient as string) || `linear-gradient(135deg,${color}22,${color}08)`,
            bg_image: (f.bg_image as string) || null,
            dangerous: (f.dangerous as boolean) || false,
            memberCount: countById[String(f.id)] || countByName[name.toLowerCase()] || 0,
          });
        }
      }

      // 4. Статичні фракції — читаємо overrides з Supabase faction_overrides
      const { data: overrides } = await supabase
        .from("faction_overrides")
        .select("*");
      const overrideMap: Record<string, Record<string, unknown>> = {};
      (overrides || []).forEach((o: Record<string, unknown>) => {
        overrideMap[o.faction_slug as string] = o;
      });

      for (const sf of STATIC_BASE) {
        if (dbNames.has(sf.name.toLowerCase())) continue;
        const slug = sf.name.toLowerCase().replace(/\s+/g, "_");
        const ov = overrideMap[slug];
        const color = (ov?.color as string) || sf.color;
        const name = (ov?.name as string) || sf.name;
        result.push({
          id: sf.id,
          name,
          desc: (ov?.description as string) || sf.desc,
          iconName: (ov?.icon_name as string) || sf.icon,
          color,
          gradient: (ov?.gradient as string) || sf.gradient,
          dangerous: (ov?.dangerous as boolean) ?? sf.dangerous,
          memberCount: countByName[sf.name.toLowerCase()] || countByName[name.toLowerCase()] || 0,
        });
      }

      setFactionList(result);
      setLoading(false);
    };
    load();
  }, []);

  const govFactions = factionList.filter(f => !f.dangerous);
  const crimFactions = factionList.filter(f => f.dangerous);

  const renderFaction = (f: FactionItem, i: number) => {
    const Icon = ICON_MAP[f.iconName] || Shield;
    const hasBgImage = !!(f.bg_image && (f.bg_image.startsWith("http") || f.bg_image.startsWith("data:")));
    const cardStyle: React.CSSProperties = hasBgImage
      ? {
          backgroundImage: `linear-gradient(135deg, ${f.color}22, rgba(0,0,0,0.65)), url(${f.bg_image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderColor: f.color + "30",
        }
      : { background: f.gradient, borderColor: f.color + "30" };
    return (
      <button key={f.id} onClick={() => navigate(`/factions/${f.id}`)}
        className="w-full animate-slide-up text-left"
        style={{ animationDelay: `${i * 50}ms` }}>
        <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3 border transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
          style={cardStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 16px ${f.color}28`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: f.color + "18", border: `1px solid ${f.color}35`, boxShadow: `0 0 10px ${f.color}18` }}>
            <Icon className="w-5 h-5" style={{ color: f.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ backgroundColor: f.color + "15", border: `1px solid ${f.color}25` }}>
              <Users className="w-3 h-3" style={{ color: f.color }} />
              <span className="text-[10px] font-semibold" style={{ color: f.color }}>{f.memberCount}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </button>
    );
  };

  if (loading) return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime mb-5">ФРАКЦІЇ</h1>
      <div className="text-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Завантаження...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime mb-1">ФРАКЦІЇ</h1>
      <p className="text-xs text-muted-foreground mb-5">Оберіть фракцію для вступу</p>

      <div className="mb-1">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Державні структури</span>
        </div>
        <div className="space-y-2">{govFactions.map((f, i) => renderFaction(f, i))}</div>
      </div>

      {crimFactions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Небезпечні фракції</span>
          </div>
          <div className="space-y-2">{crimFactions.map((f, i) => renderFaction(f, govFactions.length + i))}</div>
        </div>
      )}
    </div>
  );
};

export default Factions;
