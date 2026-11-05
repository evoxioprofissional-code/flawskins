import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { serviceClient } from "@/lib/supabase/admin";
import { PandaScoreError } from "@/lib/esports/pandascore";
import { saveMatches, saveTournaments, writeSyncLog } from "@/lib/esports/repository";
import { listMatches, listTournaments } from "@/lib/esports/service";
import type { Match, Paginated, Tournament } from "@/lib/esports/types";

// Sincroniza dados da PandaScore -> Supabase (tabelas esports_*).
// Protegida por segredo (header Authorization: Bearer <ESPORTS_SYNC_SECRET>).
// Pensada para ser chamada por um agendador (ex.: Vercel Cron) — o
// agendamento NÃO está ativado; configure-o conscientemente no deploy.

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.ESPORTS_SYNC_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

type Job =
  | { scope: string; kind: "matches"; run: () => Promise<Paginated<Match>> }
  | { scope: string; kind: "tournaments"; run: () => Promise<Paginated<Tournament>> };

const JOBS: Job[] = [
  { scope: "matches:live", kind: "matches", run: () => listMatches({ filter: "live", perPage: 50 }) },
  { scope: "matches:upcoming", kind: "matches", run: () => listMatches({ filter: "upcoming", perPage: 100 }) },
  { scope: "matches:past", kind: "matches", run: () => listMatches({ filter: "finished", perPage: 100 }) },
  { scope: "tournaments:running", kind: "tournaments", run: () => listTournaments({ phase: "running", perPage: 100 }) },
  { scope: "tournaments:upcoming", kind: "tournaments", run: () => listTournaments({ phase: "upcoming", perPage: 100 }) },
];

async function sync(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = serviceClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase service-role não configurada." }, { status: 503 });
  }

  const report: Array<{ scope: string; status: string; received: number; upserted: number; error?: string }> = [];

  for (const job of JOBS) {
    const startedAt = new Date();
    let received = 0;
    try {
      let upserted = 0;
      if (job.kind === "matches") {
        const page = await job.run();
        received = page.items.length;
        upserted = await saveMatches(sb, page.items);
      } else {
        const page = await job.run();
        received = page.items.length;
        upserted = await saveTournaments(sb, page.items);
      }
      await writeSyncLog(sb, { scope: job.scope, status: "success", received, upserted, startedAt });
      report.push({ scope: job.scope, status: "success", received, upserted });
    } catch (e) {
      const kind = e instanceof PandaScoreError ? e.kind : "database";
      const message = e instanceof Error ? e.message : "erro desconhecido";
      await writeSyncLog(sb, { scope: job.scope, status: "error", received, upserted: 0, errorKind: kind, errorMessage: message, startedAt }).catch(() => {});
      report.push({ scope: job.scope, status: "error", received, upserted: 0, error: kind });
      // Sem cota, não adianta continuar os próximos jobs.
      if (kind === "rate_limited" || kind === "unauthorized" || kind === "config") break;
    }
  }

  const ok = report.every((r) => r.status === "success");
  return NextResponse.json({ ok, report }, { status: ok ? 200 : 207 });
}

export const GET = sync;
export const POST = sync;
