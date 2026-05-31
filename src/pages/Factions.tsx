import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  AlertTriangle, Shield, Swords, Scale, Gavel, Flame, Crosshair,
  Skull, Target, Eye, BookOpen, ShieldCheck, ChevronRight, Users,
  Car, FileText, MessageSquare, Coins, Crown, Lock, Star, Zap, Search, Building2, Plus
} from "lucide-react";
import { dbPublic } from "../lib/db";

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
  bgImage: string;
  bannerImage?: string;
  dangerous: boolean;
  memberCount: number;
};

const Factions = () => {
  const navigate = useNavigate();
  const [factionList, setFactionList] = useState<FactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 1. DB фракції з Supabase через service role key
      const { data: dbFactions } = await dbPublic("factions", {
        columns: "id, name, color, gradient, description, icon_name, dangerous, questions, section, background_image, banner_image",
        order: { col: "created_at", dir: "asc" },
      });

      // 2. Рахуємо учасників
      const { data: appData } = await dbPublic("faction_applications", {
        columns: "faction_id, faction_name",
        filters: [{ col: "status", op: "eq", value: "approved" }],
      });

      const countById: Record<string, number> = {};
      const countByName: Record<string, number> = {};
      (appData || []).forEach((a: Record<string, unknown>) => {
        const fid = String(a.faction_id ?? "");
        const fname = (a.faction_name as string || "").toLowerCase().trim();
        if (fid && fid !== "" && fid !== "null" && fid !== "undefined") {
          countById[fid] = (countById[fid] || 0) + 1;
        }
        if (fname) countByName[fname] = (countByName[fname] || 0) + 1;
      });

      const result: FactionItem[] = [];
      const dbNames = new Set<string>();

      // 3. DB фракції — беремо всі кастомні поля
      // First load all overrides so DB factions can also use bg_image/banner_image
      const { data: overrides } = await dbPublic("faction_overrides");
      const overrideMap: Record<string, Record<string, unknown>> = {};
      (overrides || []).forEach((o: Record<string, unknown>) => {
        overrideMap[o.faction_slug as string] = o;
      });

      if (dbFactions && dbFactions.length > 0) {
        for (const f of dbFactions as Record<string, unknown>[]) {
          const color = (f.color as string) || "hsl(84,81%,44%)";
          const name = f.name as string;
          const slug = name.toLowerCase().replace(/\s+/g, "_");
          const ov = overrideMap[slug];
          dbNames.add(name.toLowerCase());
          result.push({
            id: String(f.id),
            name,
            desc: (f.description as string) || "Фракція сервера",
            iconName: (f.icon_name as string) || "Shield",
            color,
            gradient: (f.gradient as string) || `linear-gradient(135deg,${color}22,${color}08)`,
            bgImage: (f.background_image as string) || (ov?.background_image as string) || "",
            bannerImage: (f.banner_image as string) || (ov?.banner_image as string) || undefined,
            dangerous: (f.dangerous as boolean) || false,
            memberCount: countById[String(f.id)] || countByName[name.toLowerCase()] || 0,
          });
        }
      }

      // 4. Статичні фракції — читаємо overrides з Supabase faction_overrides
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
          bgImage: (ov?.background_image as string) || "",
          bannerImage: (ov?.banner_image as string) || undefined,
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
    const bgStyle = f.bgImage
      ? { backgroundImage: `url(${f.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: f.gradient };
    return (
      <button key={f.id} onClick={() => navigate(`/factions/${f.id}`)}
        className="w-full animate-slide-up text-left"
        style={{ animationDelay: `${i * 50}ms` }}>
        <div className="rounded-2xl border overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
          style={{ borderColor: f.color + "30" }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 16px ${f.color}28`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
          {/* Card row */}
          <div className="px-4 py-3.5 flex items-center gap-3 relative overflow-hidden"
            style={{ ...bgStyle }}>
            {f.bgImage && <div className="absolute inset-0 bg-black/50 pointer-events-none" />}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-10"
              style={{ backgroundColor: f.color + "18", border: `1px solid ${f.color}35`, boxShadow: `0 0 10px ${f.color}18` }}>
              <Icon className="w-5 h-5" style={{ color: f.color }} />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ backgroundColor: f.color + "15", border: `1px solid ${f.color}25` }}>
                <Users className="w-3 h-3" style={{ color: f.color }} />
                <span className="text-[10px] font-semibold" style={{ color: f.color }}>{f.memberCount}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
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
