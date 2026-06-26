"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Crosshair, Play, Save, Trash2, Users, Zap } from "lucide-react";

import { excluirCrosshair, salvarCrosshair } from "@/actions/arena";
import type {
  CommunityCrosshair,
  PresetMeu,
  PresetUso,
  TopPreset,
} from "@/actions/arena";
import { CrosshairCanvas } from "@/components/arena/CrosshairCanvas";
import {
  DEFAULT_CROSSHAIR,
  type CrosshairConfig,
} from "@/lib/arena/crosshairs";
import { PRO_PLAYERS, edpi, presetLabel, type ProPlayer } from "@/lib/arena/pros";
import { cn } from "@/lib/utils";

function aplicar(cfg: CrosshairConfig, preset: string, nome: string) {
  localStorage.setItem("flaw_cross_cfg", JSON.stringify(cfg));
  localStorage.setItem("flaw_cross_preset", preset);
  localStorage.setItem("flaw_cross_nome", nome);
}

export function ProLab({
  logged,
  meuId,
  presetRanking,
  topPreset,
  comunidade,
  myStats,
}: {
  logged: boolean;
  meuId: string | null;
  presetRanking: PresetUso[];
  topPreset: TopPreset;
  comunidade: CommunityCrosshair[];
  myStats: PresetMeu[];
}) {
  const [aba, setAba] = useState<"pros" | "comunidade">("pros");
  const router = useRouter();

  const meuMap = useMemo(
    () => new Map(myStats.map((m) => [m.preset, m])),
    [myStats]
  );

  function aplicarPro(p: ProPlayer) {
    aplicar(p.crosshair, `pro:${p.id}`, `${p.nome} (pro)`);
    toast.success(`Mira de ${p.nome} aplicada!`);
  }
  function testarPro(p: ProPlayer) {
    aplicarPro(p);
    router.push("/arena/gridshot");
  }

  return (
    <div>
      {/* Abas */}
      <div className="mb-5 flex gap-2">
        <Tab ativo={aba === "pros"} onClick={() => setAba("pros")} icon={Zap}>
          Profissionais
        </Tab>
        <Tab ativo={aba === "comunidade"} onClick={() => setAba("comunidade")} icon={Users}>
          Comunidade
        </Tab>
      </div>

      {aba === "pros" ? (
        <div className="space-y-8">
          {/* Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {PRO_PLAYERS.map((p) => (
              <ProCard
                key={p.id}
                p={p}
                meu={meuMap.get(`pro:${p.id}`)}
                onApply={() => aplicarPro(p)}
                onTest={() => testarPro(p)}
              />
            ))}
          </div>

          {/* Ranking de presets */}
          <PresetRankingBox ranking={presetRanking} top={topPreset} />

          {/* Melhor setup pessoal */}
          {logged && <MelhorSetup myStats={myStats} />}
        </div>
      ) : (
        <ComunidadeTab
          comunidade={comunidade}
          logged={logged}
          meuId={meuId}
          onApply={(c, cfg) => {
            aplicar(cfg, `com:${c.id}`, c.nome);
            toast.success(`"${c.nome}" aplicada!`);
          }}
          onTest={(c, cfg) => {
            aplicar(cfg, `com:${c.id}`, c.nome);
            router.push("/arena/gridshot");
          }}
        />
      )}
    </div>
  );
}

function Tab({
  ativo,
  onClick,
  icon: Icon,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: typeof Zap;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
        ativo
          ? "border-violet-500 bg-violet-500/15 text-violet-200"
          : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function ProCard({
  p,
  meu,
  onApply,
  onTest,
}: {
  p: ProPlayer;
  meu?: PresetMeu;
  onApply: () => void;
  onTest: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full text-lg font-black text-white"
          style={{ background: `linear-gradient(135deg, ${p.cor}, #18181b)` }}
        >
          {p.nome.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-zinc-100">{p.nome}</p>
          <p className="truncate text-xs text-zinc-400">{p.time}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-lg border border-zinc-800 bg-zinc-950">
          <CrosshairCanvas cfg={p.crosshair} size={40} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <Spec label="DPI" v={p.dpi} />
        <Spec label="Sens" v={p.sens} />
        <Spec label="eDPI" v={edpi(p)} />
        <Spec label="Resolução" v={p.res} />
        <Spec label="Aspect" v={p.aspect} />
        <Spec label="Crosshair" v={p.crosshair.color.toUpperCase().replace("#", "")} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 rounded-lg bg-zinc-950 py-1.5 text-xs text-zinc-400">
        <span>
          Reflexo ref. <b className="text-emerald-400">{p.ref.reflexo}ms</b>
        </span>
        <span className="text-zinc-700">·</span>
        <span>
          Gridshot ref. <b className="text-fuchsia-400">{p.ref.gridshot} pts</b>
        </span>
      </div>

      {meu && (
        <p className="mt-2 text-xs text-violet-300">
          Seu melhor com esta mira: {meu.best} pts
          {meu.media_acc != null ? ` · ${meu.media_acc}% acc` : ""}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-500/10 text-sm font-semibold text-violet-200 hover:bg-violet-500/20"
        >
          <Crosshair className="size-4" /> Aplicar
        </button>
        <button
          type="button"
          onClick={onTest}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-sm font-semibold text-white"
        >
          <Play className="size-4" /> Testar agora
        </button>
      </div>
    </div>
  );
}

function Spec({ label, v }: { label: string; v: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-1.5 py-1.5">
      <p className="text-sm font-bold text-zinc-100">{v}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function PresetRankingBox({ ranking, top }: { ranking: PresetUso[]; top: TopPreset }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-1 text-sm font-bold text-zinc-100">Ranking de presets</h2>
      {top.preset && top.total >= 3 && top.pct != null && (
        <p className="mb-3 rounded-lg bg-violet-500/10 px-3 py-2 text-sm text-violet-200">
          🔥 <b>{top.pct}%</b> dos melhores jogadores usam{" "}
          <b>{presetLabel(top.preset)}</b>.
        </p>
      )}
      {ranking.length === 0 ? (
        <p className="text-sm text-zinc-500">Ainda sem dados suficientes.</p>
      ) : (
        <ul className="space-y-2">
          {ranking.slice(0, 8).map((r, i) => (
            <li key={r.preset} className="flex items-center gap-3">
              <span className="w-5 text-center text-sm font-bold text-zinc-400">
                {i + 1}º
              </span>
              <span className="w-36 truncate text-sm text-zinc-200">
                {presetLabel(r.preset)}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  style={{ width: `${r.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-zinc-400">{r.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MelhorSetup({ myStats }: { myStats: PresetMeu[] }) {
  if (myStats.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-1 text-sm font-bold text-zinc-100">Seu melhor setup</h2>
        <p className="text-sm text-zinc-500">
          Jogue o Gridshot com miras diferentes para descobrir com qual você
          performa melhor.
        </p>
      </section>
    );
  }
  const ordenado = [...myStats].sort((a, b) => b.best - a.best);
  const melhor = ordenado[0];
  const segundo = ordenado[1];
  let frase = `Seu melhor resultado no Gridshot foi com ${presetLabel(melhor.preset)} (${melhor.best} pts).`;
  if (segundo && melhor.media_acc != null && segundo.media_acc != null && segundo.media_acc > 0) {
    const diff = Math.round(((melhor.media_acc - segundo.media_acc) / segundo.media_acc) * 100);
    if (diff > 0)
      frase += ` Você tem ${diff}% mais accuracy com ${presetLabel(melhor.preset)} do que com ${presetLabel(segundo.preset)}.`;
  }
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-2 text-sm font-bold text-zinc-100">Seu melhor setup (Gridshot)</h2>
      <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        {frase}
      </p>
      <ul className="space-y-1.5">
        {ordenado.map((m) => (
          <li
            key={m.preset}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
          >
            <span className="text-zinc-200">{presetLabel(m.preset)}</span>
            <span className="text-zinc-400">
              <b className="text-fuchsia-400">{m.best} pts</b>
              {m.media_acc != null ? ` · ${m.media_acc}% acc` : ""} · {m.partidas}x
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComunidadeTab({
  comunidade,
  logged,
  meuId,
  onApply,
  onTest,
}: {
  comunidade: CommunityCrosshair[];
  logged: boolean;
  meuId: string | null;
  onApply: (c: CommunityCrosshair, cfg: CrosshairConfig) => void;
  onTest: (c: CommunityCrosshair, cfg: CrosshairConfig) => void;
}) {
  return (
    <div className="space-y-6">
      {logged ? (
        <CrosshairEditor />
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-400">
          Entre para criar e compartilhar sua própria mira.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-100">
          Miras da comunidade{" "}
          <span className="font-normal text-zinc-500">({comunidade.length})</span>
        </h2>
        {comunidade.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            Ninguém compartilhou miras ainda. Seja o primeiro!
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {comunidade.map((c) => (
              <CommunityItem
                key={c.id}
                c={c}
                meu={!!meuId && c.user_id === meuId}
                onApply={onApply}
                onTest={onTest}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CommunityItem({
  c,
  meu,
  onApply,
  onTest,
}: {
  c: CommunityCrosshair;
  meu: boolean;
  onApply: (c: CommunityCrosshair, cfg: CrosshairConfig) => void;
  onTest: (c: CommunityCrosshair, cfg: CrosshairConfig) => void;
}) {
  const router = useRouter();
  const cfg = c.config as CrosshairConfig;
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    const res = await excluirCrosshair(c.id);
    setExcluindo(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Mira excluída.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-950">
        <CrosshairCanvas cfg={cfg} size={38} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{c.nome}</p>
        <p className="truncate text-xs text-zinc-500">
          por {meu ? "você" : c.autor ?? "anônimo"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {confirmar ? (
          <>
            <button
              type="button"
              onClick={excluir}
              disabled={excluindo}
              className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {excluindo ? "..." : "Excluir"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
            >
              Não
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onApply(c, cfg)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => onTest(c, cfg)}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2.5 py-1 text-xs font-semibold text-white"
            >
              Testar
            </button>
            {meu && (
              <button
                type="button"
                onClick={() => setConfirmar(true)}
                aria-label="Excluir mira"
                className="grid size-7 place-items-center rounded-lg border border-zinc-700 text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CrosshairEditor() {
  const router = useRouter();
  const [cfg, setCfg] = useState<CrosshairConfig>({ ...DEFAULT_CROSSHAIR });
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  function up<K extends keyof CrosshairConfig>(k: K, v: CrosshairConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  async function salvar() {
    if (nome.trim().length < 2) {
      toast.error("Dê um nome para a mira.");
      return;
    }
    setSalvando(true);
    const res = await salvarCrosshair(nome, cfg as unknown as Record<string, unknown>);
    setSalvando(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Mira compartilhada!");
    setNome("");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-3 text-sm font-bold text-zinc-100">Criar sua mira</h2>
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Preview */}
        <div className="grid h-32 w-full place-items-center rounded-xl border border-zinc-800 bg-zinc-950 sm:w-40">
          <CrosshairCanvas cfg={cfg} size={90} />
        </div>

        {/* Controles */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cfg.color}
              onChange={(e) => up("color", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
              aria-label="Cor"
            />
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={40}
              placeholder="Nome da mira (ex: Fast Flick)"
              className="h-9 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
            />
          </div>

          <Slider label="Tamanho" val={cfg.size} min={0} max={24} onChange={(v) => up("size", v)} />
          <Slider label="Espessura" val={cfg.thickness} min={1} max={6} step={0.5} onChange={(v) => up("thickness", v)} />
          <Slider label="Gap" val={cfg.gap} min={0} max={16} onChange={(v) => up("gap", v)} />
          <Slider label="Transparência" val={cfg.alpha} min={0.2} max={1} step={0.05} onChange={(v) => up("alpha", v)} />

          <div className="flex flex-wrap gap-2 pt-1">
            <Toggle on={cfg.dot} onClick={() => up("dot", !cfg.dot)}>Ponto</Toggle>
            <Toggle on={cfg.outline} onClick={() => up("outline", !cfg.outline)}>Contorno</Toggle>
            <Toggle on={!!cfg.tStyle} onClick={() => up("tStyle", !cfg.tStyle)}>T-Style</Toggle>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="size-4" /> {salvando ? "Salvando…" : "Compartilhar"}
            </button>
            <button
              type="button"
              onClick={() => {
                aplicar(cfg, "custom", nome.trim() || "Minha mira");
                router.push("/arena/gridshot");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              <Play className="size-4" /> Testar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({
  label,
  val,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  val: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-zinc-400">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-violet-500"
      />
      <span className="w-10 text-right text-xs tabular-nums text-zinc-300">{val}</span>
    </label>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
        on
          ? "border-violet-500 bg-violet-500/15 text-violet-200"
          : "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
      )}
    >
      {on && <Check className="size-3" />}
      {children}
    </button>
  );
}
