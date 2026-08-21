// Terminologia/identificação da estrutura de leitura por CONTEXTO. A mesma
// mecânica (livros → capítulos → progresso/Frutos) atende dois contextos com
// identidades distintas: o Período Vocacional ("Travessia") e a jornada
// formativa por níveis ("Leituras da formação"). Só os rótulos e a presença de
// seções específicas do vocacional (evangelização, Mural) mudam.
//
// Constante pura, sem imports — segura para client e server.

export type LeituraContexto = "vocacional" | "formativo";

export interface LeituraTermos {
  // Lado formador (LeiturasManager)
  secaoTitulo: string; // cabeçalho da seção de cadastro
  vazioTexto: string; // estado vazio
  // Portal (TravessiaCard)
  cardTitulo: string; // título do card no portal
  frutoSingular: string;
  frutoPlural: string;
  trilhaTitulo: string; // título da lista de livros/capítulos
  concluido: string; // mensagem de 100%
  // Seções exclusivas do vocacional
  mostrarEvangelizacao: boolean;
  mostrarMural: boolean;
}

const VOCACIONAL: LeituraTermos = {
  secaoTitulo: "Leituras da turma",
  vazioTexto: "Nenhuma leitura cadastrada. As indicações de leitura da turma aparecem aqui.",
  cardTitulo: "Minha Travessia literária",
  frutoSingular: "Fruto da Travessia",
  frutoPlural: "Frutos da Travessia",
  trilhaTitulo: "Trilha da Travessia",
  concluido: "Travessia concluída!",
  mostrarEvangelizacao: true,
  mostrarMural: true,
};

const FORMATIVO: LeituraTermos = {
  secaoTitulo: "Leituras do grupo",
  vazioTexto: "Nenhuma leitura cadastrada. Os livros indicados ao grupo aparecem aqui.",
  cardTitulo: "Minhas leituras",
  frutoSingular: "Fruto de leitura",
  frutoPlural: "Frutos de leitura",
  trilhaTitulo: "Trilha de leitura",
  concluido: "Leitura concluída!",
  mostrarEvangelizacao: false,
  mostrarMural: false,
};

export function leituraTermos(contexto: LeituraContexto): LeituraTermos {
  return contexto === "vocacional" ? VOCACIONAL : FORMATIVO;
}
