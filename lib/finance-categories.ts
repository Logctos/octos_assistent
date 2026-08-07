export type TransactionType = "income" | "expense";

/** Grupo → subcategorias, na ordem em que devem aparecer no fluxo de caixa. */
export const FINANCE_CATEGORIES: Record<TransactionType, Record<string, string[]>> = {
  income: {
    Receitas: ["Receita Principal"],
  },
  expense: {
    "Cartões de Crédito": ["Pic Pay", "Nu Bank", "C6", "BB Maria", "NU Bank Maria"],
    Magazine: ["Itaú"],
    Educação: ["POS"],
    Moradia: ["Parcela Casa", "Luz", "Internet", "Água"],
    Serviços: ["Planos de Celulares", "Barbeiro", "Médicos"],
    "Saúde e Bem-estar": ["Terapia Luís", "Jiu Jitsu"],
    Alimentação: ["Alimentação", "Saídas"],
    Pet: ["Banho", "Ração"],
    Transporte: ["Gasolina"],
    "Outras Despesas": ["INSS", "Imposto de Renda"],
  },
};

/** Grupo/subcategoria de fallback para lançamentos que não batem com a árvore fixa acima. */
export const FALLBACK_GROUP: Record<TransactionType, string> = {
  income: "Receitas",
  expense: "Outras Despesas",
};

export function isKnownSubcategory(
  type: TransactionType,
  group: string,
  subcategory: string
): boolean {
  return FINANCE_CATEGORIES[type]?.[group]?.includes(subcategory) ?? false;
}
