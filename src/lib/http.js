


export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function jsonSuccess(data, extra = {}, status = 200) {
  return Response.json({ success: true, data, ...extra }, { status });
}

export function jsonError(status, code, message) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function logInternalError(context) {
  console.error(`[${context}] Internal server error`);
}

export function parsePositiveInteger(rawValue, { min, max } = {}) {
  if (typeof rawValue !== "string" || !/^[0-9]+$/.test(rawValue)) {
    return { ok: false };
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(value)) {
    return { ok: false };
  }

  if (min !== undefined && value < min) {
    return { ok: false };
  }

  if (max !== undefined && value > max) {
    return { ok: false };
  }

  return { ok: true, value };
}

export function parsePaginationParams(searchParams) {
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");

  const pageResult =
    pageRaw === null
      ? { ok: true, value: DEFAULT_PAGE }
      : parsePositiveInteger(pageRaw, { min: 1 });

  const limitResult =
    limitRaw === null
      ? { ok: true, value: DEFAULT_LIMIT }
      : parsePositiveInteger(limitRaw, { min: 1, max: MAX_LIMIT });

  if (!pageResult.ok || !limitResult.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    page: pageResult.value,
    limit: limitResult.value,
  };
}
