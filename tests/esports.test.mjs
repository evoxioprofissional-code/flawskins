// Testes unitários do módulo E-Sports (normalização + datas).
// Rodar: npm run test:esports   (Node >= 22.6, usa --experimental-strip-types)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractRound,
  mapFormat,
  mapStatus,
  parseMatch,
  parseMatches,
  toUtcIso,
} from "../src/lib/esports/normalize.ts";
import {
  calendarDayDiff,
  dayRangeUtc,
  formatTime,
  relativeDayLabel,
  safeTimeZone,
} from "../src/lib/esports/datetime.ts";

const TZ = "America/Sao_Paulo";

// Payload no formato real da PandaScore (campos reduzidos).
const raw = {
  id: 1200600,
  slug: "bestia-academy-vs-red-canids-academy",
  name: "Quarterfinal 1: BST.A vs RED.A",
  status: "finished",
  scheduled_at: "2025-06-24T21:00:00Z",
  begin_at: "2025-06-24T21:05:00Z",
  end_at: null,
  match_type: "best_of",
  number_of_games: 3,
  winner_id: 135505,
  forfeit: false,
  draw: false,
  videogame: { slug: "cs-go" },
  league: { id: 4554, name: "Gamers Club Liga Série A", image_url: "https://cdn/league.png" },
  serie: { id: 9437, name: "", full_name: "June 2025", year: 2025 },
  tournament: { id: 16969, name: "Playoffs", tier: "c", region: "SA", type: "online", prizepool: null, begin_at: null, end_at: null },
  opponents: [
    { type: "Team", opponent: { id: 135743, name: "BESTIA Academy", acronym: "BST.A", image_url: "https://cdn/a.png", dark_mode_image_url: "https://cdn/a-dark.png" } },
    { type: "Team", opponent: { id: 135505, name: "RED Canids Academy", acronym: "RED.A", image_url: "https://cdn/b.png", dark_mode_image_url: null } },
  ],
  results: [
    { team_id: 135743, score: 0 },
    { team_id: 135505, score: 2 },
  ],
  games: [
    { id: 2, position: 2, status: "finished", winner: { id: 135505 }, forfeit: false },
    { id: 1, position: 1, status: "finished", winner: { id: 135505 }, forfeit: false },
    { id: 3, position: 3, status: "not_started", winner: { id: null }, forfeit: false },
  ],
  streams_list: [
    { raw_url: "https://www.twitch.tv/gamersclubcs", language: "pt", official: true, main: true },
    { raw_url: "javascript:alert(1)", language: "en" },
  ],
};

test("mapStatus cobre todos os status e não inventa", () => {
  assert.equal(mapStatus("not_started"), "scheduled");
  assert.equal(mapStatus("running"), "live");
  assert.equal(mapStatus("finished"), "finished");
  assert.equal(mapStatus("postponed"), "postponed");
  assert.equal(mapStatus("canceled"), "canceled");
  assert.equal(mapStatus("algo_novo"), "unknown");
  assert.equal(mapStatus(null), "unknown");
});

test("mapFormat gera BO1/BO3/BO5", () => {
  assert.equal(mapFormat("best_of", 1).label, "BO1");
  assert.equal(mapFormat("best_of", 3).label, "BO3");
  assert.equal(mapFormat("best_of", 5).label, "BO5");
  assert.equal(mapFormat("first_to", 2).label, "FT2");
  assert.equal(mapFormat(null, 3).label, null);
});

test("normaliza partida finalizada com placar, vencedor e mapas ordenados", () => {
  const m = parseMatch(raw);
  assert.ok(m);
  assert.equal(m.status, "finished");
  assert.equal(m.round, "Quarterfinal 1");
  assert.equal(m.format.label, "BO3");
  assert.equal(m.sides[0].team.name, "BESTIA Academy");
  assert.equal(m.sides[0].team.logo, "https://cdn/a-dark.png"); // prefere logo dark
  assert.equal(m.sides[1].team.logo, "https://cdn/b.png");
  assert.equal(m.sides[0].score, 0);
  assert.equal(m.sides[1].score, 2);
  assert.equal(m.winnerId, 135505);
  assert.equal(m.serie.name, "June 2025");
  assert.deepEqual(m.games.map((g) => g.position), [1, 2, 3]);
  assert.equal(m.games[2].status, "scheduled");
  assert.equal(m.streams.length, 1, "descarta URLs não-https");
  assert.equal(m.scheduledAt, "2025-06-24T21:00:00.000Z");
});

test("partida não finalizada nunca tem vencedor, mesmo se a API mandar winner_id", () => {
  const m = parseMatch({ ...raw, status: "running", winner_id: 135505 });
  assert.equal(m.status, "live");
  assert.equal(m.winnerId, null);
});

test("adversário indefinido (TBD) vira lado sem time", () => {
  const m = parseMatch({ ...raw, status: "not_started", opponents: [raw.opponents[0]], results: [] });
  assert.equal(m.sides[1].team, null);
  assert.equal(m.sides[0].score, null);
});

test("parseMatches descarta itens inválidos sem derrubar a lista", () => {
  const { items, invalid } = parseMatches([raw, { id: "x" }, null]);
  assert.equal(items.length, 1);
  assert.equal(invalid, 2);
  assert.deepEqual(parseMatches({ error: "x" }), { items: [], invalid: 1 });
});

test("extractRound e toUtcIso", () => {
  assert.equal(extractRound("Grand final: A vs B"), "Grand final");
  assert.equal(extractRound("A vs B"), null);
  assert.equal(toUtcIso("2026-11-04T18:00:00-03:00"), "2026-11-04T21:00:00.000Z");
  assert.equal(toUtcIso("lixo"), null);
});

test("datas: conversão para America/Sao_Paulo", () => {
  assert.equal(formatTime("2026-11-04T21:00:00Z", TZ), "18:00");
  // 01:30 UTC do dia 5 ainda é dia 4 em São Paulo.
  const now = new Date("2026-11-04T12:00:00Z");
  assert.equal(calendarDayDiff("2026-11-05T01:30:00Z", now, TZ), 0);
  assert.equal(relativeDayLabel("2026-11-05T01:30:00Z", now, TZ), "Hoje");
  assert.equal(relativeDayLabel("2026-11-05T15:00:00Z", now, TZ), "Amanhã");
});

test("datas: janela UTC de 'hoje' e 'amanhã' em São Paulo", () => {
  const now = new Date("2026-11-04T02:00:00Z"); // 23:00 do dia 3 em SP
  const today = dayRangeUtc(now, TZ, 0);
  assert.equal(today.start.toISOString(), "2026-11-03T03:00:00.000Z");
  assert.equal(today.end.toISOString(), "2026-11-04T02:59:59.000Z");
  const tomorrow = dayRangeUtc(now, TZ, 1);
  assert.equal(tomorrow.start.toISOString(), "2026-11-04T03:00:00.000Z");
});

test("datas: fuso inválido cai para São Paulo", () => {
  assert.equal(safeTimeZone("Nada/Isso"), TZ);
  assert.equal(safeTimeZone("Europe/Lisbon"), "Europe/Lisbon");
});
