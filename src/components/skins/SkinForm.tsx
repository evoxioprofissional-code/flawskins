"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Copy, ImagePlus, Loader2, X } from "lucide-react";

import { anuncioSchema, type AnuncioFormValues } from "@/lib/schemas";
import { CATEGORIAS, EXTERIORES } from "@/types/database";
import { criarAnuncio } from "@/actions/anuncios";
import { uploadParaBucket } from "@/lib/upload";
import { buildAnuncioText } from "@/lib/whatsapp";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Created = { id: string; texto: string };

export function SkinForm({
  defaultNome = "",
  defaultWhatsapp = "",
  defaultCidade = "",
}: {
  defaultNome?: string;
  defaultWhatsapp?: string;
  defaultCidade?: string;
}) {
  const router = useRouter();
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [imgError, setImgError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<AnuncioFormValues>({
    // Cast necessário: o schema usa z.coerce, então o tipo de entrada
    // difere do de saída e o resolver precisa ser alinhado ao output.
    resolver: zodResolver(anuncioSchema) as Resolver<AnuncioFormValues>,
    defaultValues: {
      titulo: "",
      preco: undefined,
      whatsapp: defaultWhatsapp,
      vendedor_nome: defaultNome,
      cidade: defaultCidade,
      phase: "",
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setImages((old) => [
      ...old,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    setImgError(null);
    // Permite re-selecionar o mesmo arquivo depois.
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((old) => {
      const alvo = old[index];
      if (alvo) URL.revokeObjectURL(alvo.url);
      return old.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(values: AnuncioFormValues) {
    if (images.length === 0) {
      setImgError("Adicione pelo menos uma imagem da skin.");
      toast.error("Adicione pelo menos uma imagem da skin.");
      return;
    }

    try {
      // 1) Sobe as imagens direto pro Storage (sem passar pela Server Action,
      //    então não há limite prático de tamanho).
      const imageUrls: string[] = [];
      for (const { file } of images) {
        imageUrls.push(await uploadParaBucket("skins", file));
      }

      // 2) Cria o anúncio só com as URLs (payload pequeno).
      const result = await criarAnuncio({
        titulo: values.titulo,
        categoria: values.categoria,
        exterior: values.exterior,
        preco: values.preco,
        whatsapp: values.whatsapp,
        vendedor_nome: values.vendedor_nome,
        cidade: values.cidade || undefined,
        float_val: values.float_val ?? undefined,
        phase: values.phase || undefined,
        imageUrls,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Anúncio publicado!");
      const texto = buildAnuncioText(result.data);
      setCreated({ id: result.data.id, texto });
      form.reset();
      images.forEach(({ url }) => URL.revokeObjectURL(url));
      setImages([]);
    } catch (e) {
      console.error("Falha ao publicar anúncio:", e);
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível publicar. Tente novamente."
      );
    }
  }

  // Avisa quando a validação dos campos barra o envio (erros podem estar
  // fora da tela em um formulário longo).
  function onInvalid() {
    toast.error("Confira os campos destacados em vermelho.");
  }

  async function copyText() {
    if (!created) return;
    await navigator.clipboard.writeText(created.texto);
    setCopied(true);
    toast.success("Texto copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  // Tela de sucesso: texto pronto para divulgar nos grupos.
  if (created) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-violet-500/40 bg-zinc-900 p-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Anúncio publicado 🎉
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Copie o texto abaixo e cole nos seus grupos de WhatsApp para
            divulgar.
          </p>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm whitespace-pre-wrap text-zinc-200">
            {created.texto}
          </pre>
          <button
            type="button"
            onClick={copyText}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/skin/${created.id}`}
            className="inline-flex h-10 items-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Ver anúncio
          </Link>
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="inline-flex h-10 items-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            Anunciar outra
          </button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
        {/* Seção: dados da skin */}
        <Section title="Dados da skin">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Karambit | Doppler (Factory New)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exterior"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exterior (wear)</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXTERIORES.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="preco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="4500.00"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Imagens (uma ou mais) */}
          <FormItem>
            <FormLabel>Imagens da skin</FormLabel>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img, i) => (
                <div
                  key={img.url}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
                >
                  <Image
                    src={img.url}
                    alt={`Imagem ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded bg-violet-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Capa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Remover imagem"
                    className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-zinc-950/80 text-zinc-200 transition-colors hover:bg-red-600 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}

              {/* Tile para adicionar mais */}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900 text-center transition-colors hover:border-violet-500/60">
                <ImagePlus className="size-6 text-zinc-500" />
                <span className="px-1 text-[11px] leading-tight text-zinc-400">
                  Adicionar
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickImages}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500">
              A primeira imagem é a capa. Você pode adicionar várias.
            </p>
            {imgError && (
              <p className="text-sm text-destructive">{imgError}</p>
            )}
          </FormItem>
        </Section>

        {/* Seção: extras opcionais */}
        <Section title="Extras (opcional)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="float_val"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Float</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.00001"
                      min="0"
                      max="1"
                      placeholder="0.0123"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Phase 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* Seção: contato */}
        <Section title="Seu contato">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="vendedor_nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: São Paulo, SP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="DDD + número (ex: 11999998888)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="size-5 animate-spin" />}
          {isSubmitting ? "Publicando..." : "Publicar anúncio"}
        </button>
      </form>
    </Form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
