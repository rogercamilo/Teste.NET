/**
 * Invariantes da persistência da grade formativa.
 *
 * Contexto (incidente de perda silenciosa): a grade tratava os eixos como dado
 * livre do cliente (delete-recria a cada save) e casava formação↔eixo por NOME
 * — qualquer desencontro fazia formações sumirem. O modelo correto:
 *  - eixos são projeção ESTÁVEL do plano (sync por `eixoPlanoId`, preserva ids);
 *  - formações são reconciliadas PELO id (só o omitido explicitamente some).
 *
 * Estes testes travam essas duas invariantes usando um `tx` falso que registra
 * as operações emitidas.
 */
import { describe, it, expect } from "vitest";
import { syncGradeEixos, reconcileGradeFormacoes } from "@/lib/grade-formacoes";

type Row = Record<string, unknown>;

/** tx falso: guarda tabelas em memória e registra chamadas de escrita. */
function makeTx(seed: { eixoPlano?: Row[]; eixo?: Row[]; formacao?: Row[] } = {}) {
  const db = {
    eixoPlano: seed.eixoPlano ?? [],
    eixo: seed.eixo ?? [],
    formacao: seed.formacao ?? [],
  };
  const calls = {
    formacaoUpdate: [] as Row[],
    formacaoCreateMany: [] as Row[],
    formacaoSoftDeleted: [] as string[],
    eixoCreated: [] as Row[],
    eixoUpdated: [] as Row[],
    eixoDeleted: [] as string[],
  };
  let idSeq = 0;
  const nextId = (p: string) => `${p}-${++idSeq}`;

  const tx = {
    eixoPlano: {
      findMany: async ({ where }: { where: { planoId: string } }) =>
        db.eixoPlano.filter((e) => e.planoId === where.planoId),
    },
    eixo: {
      findMany: async ({ where }: { where: { gradeId: string } }) =>
        db.eixo.filter((e) => e.gradeId === where.gradeId),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        calls.eixoDeleted.push(...where.id.in);
        db.eixo = db.eixo.filter((e) => !where.id.in.includes(e.id as string));
      },
      update: async ({ where, data }: { where: { id: string }; data: Row }) => {
        calls.eixoUpdated.push({ id: where.id, ...data });
      },
      create: async ({ data }: { data: Row }) => {
        const row = { id: nextId("eixo"), ...data };
        db.eixo.push(row);
        calls.eixoCreated.push(row);
        return { id: row.id };
      },
    },
    formacao: {
      findMany: async ({ where }: { where: { gradeId: string; deletedAt: null } }) =>
        db.formacao.filter((f) => f.gradeId === where.gradeId && f.deletedAt == null),
      update: async ({ where, data }: { where: { id: string }; data: Row }) => {
        calls.formacaoUpdate.push({ id: where.id, ...data });
      },
      updateMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        calls.formacaoSoftDeleted.push(...where.id.in);
      },
      createMany: async ({ data }: { data: Row[] }) => {
        calls.formacaoCreateMany.push(...data);
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { tx: tx as any, calls, db };
}

describe("syncGradeEixos — eixos como projeção estável do plano", () => {
  it("preserva o eixo já vinculado (upsert por eixoPlanoId) e cria o que falta", async () => {
    const { tx, calls } = makeTx({
      eixoPlano: [
        { id: "ep1", planoId: "p1", nome: "Identidade", objetivo: "obj1", ordem: 0 },
        { id: "ep2", planoId: "p1", nome: "Oração", objetivo: "obj2", ordem: 1 },
      ],
      eixo: [{ id: "eixoA", gradeId: "g1", eixoPlanoId: "ep1", cor: "#111" }],
    });

    const map = await syncGradeEixos(tx, { gradeId: "g1", planoId: "p1" });

    // ep1 já existia → atualizado, id preservado; ep2 → criado.
    expect(map.get("ep1")).toBe("eixoA");
    expect(map.get("ep2")).toBe("eixo-1");
    expect(calls.eixoUpdated).toHaveLength(1);
    expect(calls.eixoCreated).toHaveLength(1);
    expect(calls.eixoDeleted).toHaveLength(0);
  });

  it("remove eixos órfãos da grade (sem eixoPlanoId ou fora do plano)", async () => {
    const { tx, calls } = makeTx({
      eixoPlano: [{ id: "ep1", planoId: "p1", nome: "Identidade", objetivo: "o", ordem: 0 }],
      eixo: [
        { id: "eixoLivre", gradeId: "g1", eixoPlanoId: null }, // legado texto-livre
        { id: "eixoRemovido", gradeId: "g1", eixoPlanoId: "epX" }, // plano deixou de ter
      ],
    });

    await syncGradeEixos(tx, { gradeId: "g1", planoId: "p1" });

    expect(calls.eixoDeleted.sort()).toEqual(["eixoLivre", "eixoRemovido"]);
  });

  it("plano sem eixos → mapa vazio, nada criado", async () => {
    const { tx, calls } = makeTx({ eixoPlano: [], eixo: [] });
    const map = await syncGradeEixos(tx, { gradeId: "g1", planoId: "p1" });
    expect(map.size).toBe(0);
    expect(calls.eixoCreated).toHaveLength(0);
  });
});

describe("reconcileGradeFormacoes — reconciliação por id (nunca apaga pelo nome)", () => {
  const baseOpts = {
    gradeId: "g1",
    planoId: "p1",
    organizacaoId: "org1",
    nivelFormativo: "pre-discipulado",
    eixoByPlano: new Map([["ep1", "eixoA"]]),
  };

  it("atualiza a existente, cria a nova e soft-deleta só a omitida", async () => {
    const { tx, calls } = makeTx({
      formacao: [
        { id: "f1", gradeId: "g1", organizacaoId: "org1", deletedAt: null },
        { id: "f2", gradeId: "g1", organizacaoId: "org1", deletedAt: null },
      ],
    });

    await reconcileGradeFormacoes(tx, {
      ...baseOpts,
      formacoes: [
        { id: "f1", eixoPlanoId: "ep1", tema: "Atualizada", cargaHoraria: 2, modalidade: "presencial" },
        { eixoPlanoId: "ep1", tema: "Nova", cargaHoraria: 2, modalidade: "presencial" },
      ],
    });

    // f1 → update (id preservado); f2 (omitida) → soft-delete; "Nova" → create.
    expect(calls.formacaoUpdate.map((r) => r.id)).toEqual(["f1"]);
    expect(calls.formacaoSoftDeleted).toEqual(["f2"]);
    expect(calls.formacaoCreateMany).toHaveLength(1);
    expect(calls.formacaoCreateMany[0].tema).toBe("Nova");
  });

  it("resolve eixoId a partir do eixoPlanoId; formação avulsa fica com eixoId nulo", async () => {
    const { tx, calls } = makeTx({ formacao: [] });

    await reconcileGradeFormacoes(tx, {
      ...baseOpts,
      formacoes: [
        { eixoPlanoId: "ep1", tema: "Com eixo", cargaHoraria: 2, modalidade: "presencial" },
        { eixoPlanoId: null, tema: "Avulsa", cargaHoraria: 2, modalidade: "presencial" },
      ],
    });

    const [comEixo, avulsa] = calls.formacaoCreateMany;
    expect(comEixo.eixoId).toBe("eixoA");
    expect(avulsa.eixoId).toBeNull();
    // planoId é a FK do caminho (fonte de verdade), gravada em toda formação da grade
    expect(comEixo.planoId).toBe("p1");
    expect(avulsa.planoId).toBe("p1");
    // numeração sequencial na ordem recebida
    expect(comEixo.numero).toBe(1);
    expect(avulsa.numero).toBe(2);
  });

  it("id desconhecido (não pertence à grade) é tratado como nova formação", async () => {
    const { tx, calls } = makeTx({
      formacao: [{ id: "f1", gradeId: "g1", organizacaoId: "org1", deletedAt: null }],
    });

    await reconcileGradeFormacoes(tx, {
      ...baseOpts,
      formacoes: [
        { id: "intruso", eixoPlanoId: "ep1", tema: "X", cargaHoraria: 2, modalidade: "presencial" },
      ],
    });

    // "intruso" não existe → cria; f1 omitida → soft-delete.
    expect(calls.formacaoUpdate).toHaveLength(0);
    expect(calls.formacaoCreateMany).toHaveLength(1);
    expect(calls.formacaoSoftDeleted).toEqual(["f1"]);
  });

  it("lista vazia soft-deleta todas as existentes (remoção intencional)", async () => {
    const { tx, calls } = makeTx({
      formacao: [
        { id: "f1", gradeId: "g1", organizacaoId: "org1", deletedAt: null },
        { id: "f2", gradeId: "g1", organizacaoId: "org1", deletedAt: null },
      ],
    });

    await reconcileGradeFormacoes(tx, { ...baseOpts, formacoes: [] });

    expect(calls.formacaoSoftDeleted.sort()).toEqual(["f1", "f2"]);
    expect(calls.formacaoCreateMany).toHaveLength(0);
  });
});
