"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

import { criarRifa, criarRifaUsuario, editarRifa } from "@/actions/rifas";
import { uploadParaBucket } from "@/lib/upload";
import type { Rifa } from "@/types/rifa";

export function RifaForm({ rifa, usuario }: { rifa?: Rifa; usuario?: boolean }) {
  const router = useRouter();
  const edicao = !!rifa;
  const [titulo, setTitulo] = useState(rifa?.titulo ?? "");
  const [premio, setPremio] = useState(rifa?.premio ?? "");
  const [descricao, setDescricao] = useState(rifa?.descricao ?? "");
  const [preco, setPreco] = useState(rifa ? String(rifa.preco_cota) : "");
  const [total, setTotal] = useState(rifa ? String(rifa.total_numeros) : "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(rifa?.image_url ?? null);
  const [chavePix, setChavePix] = useState("");
  const [busy, setBusy] = useState(false);
  const pedeChavePix = usuario && !edicao;

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
    if (usuario && precoN < 5)
      return toast.error("A cota mínima é R$ 5,00.");
    if (!(totalN >= 1 && totalN <= 100000))
      return toast.error("Total de números de 1 a 100000.");
    if (pedeChavePix && chavePix.trim().length < 5)
      return toast.error("Informe a chave Pix para receber o repasse.");

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
        : usuario
          ? await criarRifaUsuario({ ...payload, chave_pix: chavePix })
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

      {pedeChavePix && (
        <Campo label="Chave Pix para receber o repasse">
          <input
            value={chavePix}
            onChange={(e) => setChavePix(e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            autoComplete="off"
            maxLength={140}
            className={inputCls}
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Só você e a equipe da Cloud veem essa chave. É para onde enviamos o valor das cotas vendidas.
          </p>
        </Campo>
      )}

      <Campo label="Imagem da rifa">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-4 py-6 text-center transition-colors hover:border-blue-500/60">
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
        className="cloud-button-primary inline-flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-60"
      >
        {busy && <Loader2 className="size-5 animate-spin" />}
        {busy ? "Salvando…" : edicao ? "Salvar alterações" : "Criar rifa"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-200">{label}</span>
      {children}
    </label>
  );
}
