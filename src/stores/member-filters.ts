import { create } from 'zustand';

type MemberFiltersState = {
  search: string;
  pageIndex: number;
  setSearch: (value: string) => void;
  setPageIndex: (value: number) => void;
  reset: () => void;
};

export const useMemberFiltersStore = create<MemberFiltersState>((set) => ({
  search: '',
  pageIndex: 0,
  setSearch: (value) =>
    set(() => ({
      search: value,
      pageIndex: 0
    })),
  setPageIndex: (value) =>
    set(() => ({
      pageIndex: value
    })),
  reset: () =>
    set(() => ({
      search: '',
      pageIndex: 0
    }))
}));
