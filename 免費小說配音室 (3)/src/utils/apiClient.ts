/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T & { error?: string; message?: string };
}

/**
 * Safely executes a fetch request and parses JSON response.
 * Prevents "Unexpected token '<', <!doctype... is not valid JSON" errors
 * when the server returns HTML (e.g., 502/503 during restart, 404 fallback).
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let parsedData: any = null;

    if (contentType.includes('application/json')) {
      try {
        parsedData = await res.json();
      } catch (_) {
        parsedData = null;
      }
    }

    if (!parsedData) {
      const rawText = await res.text().catch(() => '');
      if (rawText.trim().startsWith('<')) {
        // HTML response from server proxy / Cloud Run / Vite
        parsedData = {
          error: res.ok
            ? '伺服器回應異常，請重新整理'
            : `伺服器正在啟動或連線中斷（HTTP ${res.status}），請稍候重試。`,
        };
      } else {
        parsedData = {
          error: rawText || (res.ok ? '操作成功' : `伺服器請求失敗（HTTP ${res.status}）`),
        };
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: parsedData,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: {
        error: `伺服器連線中斷或正在重啟（${err.message || '連線逾時'}），請稍後再試。`,
      } as any,
    };
  }
}
