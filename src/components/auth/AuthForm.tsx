"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  cadastroSchema,
  loginSchema,
  type CadastroFormValues,
} from "@/lib/schemas";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Mode = "cadastro" | "login";

export function AuthForm({ mode }: { mode: Mode }) {
  const isCadastro = mode === "cadastro";
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const [loading, setLoading] = useState(false);

  const form = useForm<CadastroFormValues>({
    resolver: zodResolver(
      isCadastro ? cadastroSchema : loginSchema
    ) as unknown as Resolver<CadastroFormValues>,
    defaultValues: { nome: "", email: "", senha: "" },
  });

  async function onSubmit(values: CadastroFormValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      if (isCadastro) {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.senha,
          options: { data: { nome: values.nome } },
        });
        if (error) throw error;
        // Se a confirmação de email estiver desligada, já vem sessão.
        // Senão, tentamos logar na sequência.
        if (!data.session) {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email: values.email,
              password: values.senha,
            });
          if (signInError) throw signInError;
        }
        toast.success("Conta criada! Bem-vindo ao Vision Skins.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.senha,
        });
        if (error) throw error;
        toast.success("Login feito!");
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Algo deu errado.";
      toast.error(traduzErro(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isCadastro && (
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seu nome</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="voce@email.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="senha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••"
                  autoComplete={isCadastro ? "new-password" : "current-password"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="size-5 animate-spin" />}
          {isCadastro ? "Criar conta" : "Entrar"}
        </button>

        <p className="text-center text-sm text-zinc-400">
          {isCadastro ? (
            <>
              Já tem conta?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="font-medium text-violet-400 hover:underline"
              >
                Entrar
              </Link>
            </>
          ) : (
            <>
              Ainda não tem conta?{" "}
              <Link
                href={`/cadastro?next=${encodeURIComponent(next)}`}
                className="font-medium text-violet-400 hover:underline"
              >
                Cadastre-se
              </Link>
            </>
          )}
        </p>
      </form>
    </Form>
  );
}

function traduzErro(msg: string): string {
  if (/already registered|already exists/i.test(msg))
    return "Esse email já tem conta. Tente entrar.";
  if (/Invalid login credentials/i.test(msg))
    return "Email ou senha incorretos.";
  if (/Email not confirmed/i.test(msg))
    return "Email ainda não confirmado. Desative a confirmação no painel do Supabase.";
  return msg;
}
