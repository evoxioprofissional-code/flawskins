"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

import { perfilSchema, type PerfilFormValues } from "@/lib/schemas";
import { atualizarPerfil } from "@/actions/perfil";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props = {
  email: string;
  nome: string;
  regiao: string;
  whatsapp: string;
  avatarUrl: string | null;
};

export function ProfileForm({ email, nome, regiao, whatsapp, avatarUrl }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema) as Resolver<PerfilFormValues>,
    defaultValues: { nome, regiao, whatsapp },
  });

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview((old) => {
      if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function onSubmit(values: PerfilFormValues) {
    setSaving(true);
    const fd = new FormData();
    fd.append("nome", values.nome);
    fd.append("regiao", values.regiao ?? "");
    fd.append("whatsapp", values.whatsapp ?? "");
    if (file) fd.append("avatar", file);

    const res = await atualizarPerfil(fd);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Perfil salvo!");
    setFile(null);
    router.refresh();
  }

  const inicial = (form.watch("nome") || email || "?").trim().charAt(0).toUpperCase();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            <span className="grid size-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-2xl font-bold text-white">
              {preview ? (
                <Image
                  src={preview}
                  alt="Sua foto"
                  width={80}
                  height={80}
                  className="size-20 object-cover"
                  unoptimized={preview.startsWith("blob:")}
                />
              ) : (
                inicial
              )}
            </span>
            <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-zinc-200">
              <Camera className="size-3.5" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickAvatar}
            />
          </label>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-200">{email}</p>
            <p className="text-xs text-zinc-500">Toque na foto para trocar</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Seu nome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="regiao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Região</FormLabel>
              <FormControl>
                <Input placeholder="Ex: São Paulo, SP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>
    </Form>
  );
}
