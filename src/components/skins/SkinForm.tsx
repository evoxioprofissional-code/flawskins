"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Copy, ImagePlus, Loader2 } from "lucide-react";

import { anuncioSchema, type AnuncioFormValues } from "@/lib/schemas";
import { CATEGORIAS, EXTERIORES } from "@/types/database";
import { criarAnuncio } from "@/actions/anuncios";
import { buildAnuncioText } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

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
  const [preview, setPreview] = useState<string | null>(null);
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

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    form.setValue("imagem", file, { shouldValidate: true });
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  }

  async function onSubmit(values: AnuncioFormValues) {
    const fd = new FormData();
    fd.append("titulo", values.titulo);
    fd.append("categoria", values.categoria);
    fd.append("exterior", values.exterior);
    fd.append("preco", String(values.preco));
    fd.append("whatsapp", values.whatsapp);
    fd.append("vendedor_nome", values.vendedor_nome);
    if (values.cidade) fd.append("cidade", values.cidade);
    if (values.float_val != null) fd.append("float_val", String(values.float_val));
    if (values.phase) fd.append("phase", values.phase);
    fd.append("imagem", values.imagem);

    const result = await criarAnuncio(fd);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Anúncio publicado!");
    const texto = buildAnuncioText(result.data);
    setCreated({ id: result.data.id, texto });
    form.reset();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

          {/* Imagem (controlada à parte do register) */}
          <FormField
            control={form.control}
            name="imagem"
            render={() => (
              <FormItem>
                <FormLabel>Imagem da skin</FormLabel>
                <label
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-4 py-6 text-center transition-colors hover:border-violet-500/60",
                    preview && "border-solid border-zinc-700"
                  )}
                >
                  {preview ? (
                    <div className="relative size-40">
                      <Image
                        src={preview}
                        alt="Prévia da skin"
                        fill
                        className="rounded-lg object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="size-7 text-zinc-500" />
                      <span className="text-sm text-zinc-400">
                        Toque para escolher uma imagem (JPEG, PNG ou WebP, até
                        5MB)
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onPickImage}
                  />
                  {preview && (
                    <span className="text-xs text-violet-400">
                      Trocar imagem
                    </span>
                  )}
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
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
