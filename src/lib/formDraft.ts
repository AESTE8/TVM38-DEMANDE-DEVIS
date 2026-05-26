import type { DevisFormData, LigneDevis } from '@/types';

const DRAFT_KEY = 'tvm38_form_draft';

type FormDraft = Partial<DevisFormData> & { lignes: LigneDevis[] };

export const saveDraft = (data: Partial<DevisFormData>, lignes: LigneDevis[]): void => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, lignes }));
  } catch {
    // quota exceeded — ignore silently
  }
};

export const loadDraft = (): FormDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as FormDraft) : null;
  } catch {
    return null;
  }
};

export const clearDraft = (): void => {
  localStorage.removeItem(DRAFT_KEY);
};

export const hasDraft = (): boolean => {
  return !!localStorage.getItem(DRAFT_KEY);
};
