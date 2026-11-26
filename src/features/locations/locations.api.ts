import { http } from "@/shared/api/http";

export type Country = { id: string; name: string; code?: string };
export type Province = {
  id: string;
  code: string;
  name: string;
  type?: string;
  countryCode?: string;
};
export type City = {
  id: string;
  name: string;
  countryId?: string;
  regionName?: string;
};

export type ListQuery = { search?: string; page?: number; limit?: number };
export type Page<T> = { items: T[]; page: number; hasMore: boolean };

const pickArray = (x: any): any[] | null => {
  if (Array.isArray(x)) return x;
  if (!x || typeof x !== "object") return null;
  for (const k of [
    "items",
    "data",
    "rows",
    "results",
    "list",
    "countries",
    "cities",
  ]) {
    if (Array.isArray(x[k])) return x[k];
  }
  return null;
};

function toPage<T>(
  body: any,
  page: number,
  limit: number,
  map: (x: any) => T,
): Page<T> {
  const root = body?.data ?? body;
  const list = pickArray(root) ?? pickArray(root?.data) ?? [];
  const meta = root?.meta ?? root?.pagination ?? root?.data?.meta ?? root ?? {};
  const totalPages = Number(meta.totalPages ?? meta.pages ?? meta.lastPage);
  const total = Number(meta.total ?? meta.totalItems ?? meta.count);
  const hasMore =
    typeof meta.hasNextPage === "boolean"
      ? meta.hasNextPage
      : Number.isFinite(totalPages)
        ? page < totalPages
        : Number.isFinite(total)
          ? page * limit < total
          : list.length === limit;
  return { items: list.map(map), page, hasMore };
}

const toCountry = (x: any): Country => ({
  id: String(x.id),
  name: String(x.name ?? x.code ?? ""),
  code: x.code ?? x.countryCode,
});

const toCity = (x: any): City => ({
  id: String(x.id),
  name: String(x.name ?? ""),
  countryId: x.countryId ?? x.country?.id,
  regionName: x.region?.name ?? x.regionName ?? x.province?.name ?? undefined,
});

const toProvince = (x: any): Province => ({
  id: String(x.id),
  code: String(x.code ?? ""),
  name: String(x.name ?? x.code ?? ""),
  type: x.type ?? undefined,
  countryCode: x.country?.code ?? x.countryCode ?? undefined,
});

const params = ({ search, page = 1, limit = 20 }: ListQuery) => ({
  page,
  limit,
  ...(search?.trim() ? { search: search.trim() } : {}),
});

export const locationsApi = {
  countries: async (q: ListQuery): Promise<Page<Country>> => {
    const p = params(q);
    const res = await http.get("/countries", { params: p });
    return toPage(res.data, p.page, p.limit, toCountry);
  },

  provinces: async (
    q: ListQuery & { countryCode?: string },
  ): Promise<Page<Province>> => {
    const p = {
      ...params(q),
      ...(q.countryCode ? { countryCode: q.countryCode } : {}),
    };
    const res = await http.get("/provinces", { params: p });
    const page = toPage(res.data, p.page, p.limit, toProvince);
    const want = q.countryCode?.toUpperCase();
    return want
      ? {
          ...page,
          items: page.items.filter(
            (x) => !x.countryCode || x.countryCode.toUpperCase() === want,
          ),
        }
      : page;
  },

  cities: async (
    q: ListQuery & { countryId?: string; provinceId?: string },
  ): Promise<Page<City>> => {
    const p = {
      ...params({ ...q, limit: q.limit ?? 10 }),
      // GET /cities?regionId={provinceId}: cities of the picked province only.
      // countryId is sent only while no province is picked.
      ...(q.provinceId ? { regionId: q.provinceId } : q.countryId ? { countryId: q.countryId } : {}),
    };
    const res = await http.get("/cities", { params: p });
    return toPage(res.data, p.page, p.limit, toCity);
  },
};
