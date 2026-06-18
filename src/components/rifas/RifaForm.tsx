"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

import { criarRifa, editarRifa } from "@/actions/rifas";
import { uploadParaBucket } from "@/lib/upload";
import type { Rifa } from "@/types/rifa";

export function RifaForm({ rifa }: { rifa?: Rifa }) {
  const router = useRouter();
  const edicao = !!rifa;
  const [titulo, setTitulo] = useState(rifa?.titulo ?? "");
  const [premio, setPremio] = useState(rifa?.premio ?? "");
  const [descricao, setDescricao] = useState(rifa?.descricao ?? "");
  const [preco, setPreco] = useState(rifa ? String(rifa.preco_cota) : "");
  const [total, setTotal] = useState(rifa ? String(rifa.total_numeros) : "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(rifa?.image_url ?? null);
  const [busy, setBusy] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const precoN = Number(preco.replace(",", "."));
    const totalN = parseInt(total, 10);
    if (titulo.trim().length < 3) return toast.error("Título muito curto.");
    if (!premio.trim()) return toast.error("Informe o prêmio.");
    if (!(precoN >= 0)) return toast.error("Preço inválido.");
    if (!(totalN >= 1 && totalN <= 100000))
      return toast.error("Total de números de 1 a 100000.");

    setBusy(true);
    try {
      // Mantém a imagem atual se nenhuma nova for escolhida.
      let image_url: string | undefined = rifa?.image_url ?? undefined;
      if (file) image_url = await uploadParaBucket("skins", file);

      const payload = {
        titulo,
        premio,
        descricao,
        image_url,
        preco_cota: precoN,
        total_numeros: totalN,
      };
      const res = edicao
        ? await editarRifa(rifa!.id, payload)
        : await criarRifa(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(edicao ? "Rifa atualizada!" : "Rifa criada!");
      router.push(`/rifas/${res.data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Campo label="Título da rifa">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Rifa AK-47 Redline"
          className={inputCls}
        />
      </Campo>

      <Campo label="Prêmio (skin)">
        <input
          value={premio}
          onChange={(e) => setPremio(e.target.value)}
          placeholder="Ex: AK-47 | Redline (Field-Tested)"
          className={inputCls}
        />
      </Campo>

      <Campo label="Descrição (opcional)">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          placeholder="Detalhes da rifa, regras, data do sorteio…"
          className={inputCls}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Preço da cota (R$)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="5.00"
            className={inputCls}
          />
        </Campo>
        <Campo label="Total de números">
          <input
            type="number"
            min="1"
            max="100000"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="100"
            className={inputCls}
          />
        </Campo>
      </div>

      <Campo label="Imagem da rifa">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-4 py-6 text-center transition-colors hover:border-violet-500/60">
          {preview ? (
            <div className="relative h-36 w-full">
              <Image src={preview} alt="Prévia" fill className="rounded-lg object-contain" unoptimized />
            </div>
          ) : (
            <>
              <ImagePlus className="size-7 text-zinc-500" />
              <span className="text-sm text-zinc-400">Escolher imagem da skin</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={pick} />
        </label>
      </Campo>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 text-base font-semibold text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="size-5 animate-spin" />}
        {busy ? "Salvando…" : edicao ? "Salvar alterações" : "Criar rifa"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-200">{label}</span>
      {children}
    </label>
  );
}
