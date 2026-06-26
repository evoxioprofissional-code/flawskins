"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { isAdminEmail } from "@/lib/admin";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormValues>,
    defaultValues: { email: "", senha: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.senha,
      });
      if (error) throw error;

      // Só o admin pode entrar aqui.
      if (!isAdminEmail(values.email)) {
        await supabase.auth.signOut();
        toast.error("Esta conta não tem acesso ao painel.");
        return;
      }
      toast.success("Bem-vindo ao painel.");
      // Navegação cheia para o RootLayout recarregar sem o chrome do site.
      window.location.assign("/admin");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao entrar.";
      toast.error(/Invalid login/i.test(msg) ? "Email ou senha incorretos." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="admin@..." {...field} />
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
                <Input type="password" autoComplete="current-password" placeholder="••••••" {...field} />
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
          {loading ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
          Acessar painel
        </button>
      </form>
    </Form>
  );
}
