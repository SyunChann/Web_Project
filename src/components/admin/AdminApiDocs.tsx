"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { restrictSwaggerRequest } from "@/lib/swaggerRequestPolicy";
import "swagger-ui-react/swagger-ui.css";
import styles from "./AdminApiDocs.module.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => <p role="status" className="p-5 text-sm">API 문서 화면을 준비하고 있습니다.</p>,
});
// React 래퍼는 validatorUrl 옵션을 전달하지 않으므로 검증 서버 배지 자체를 제거함.
const localDocsOnlyPlugin = () => ({ components: { onlineValidatorBadge: () => null } });

export function AdminApiDocs() {
  const [state, setState] = useState<{ spec?: object; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/openapi", { signal: controller.signal, credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 401 ? "로그인이 만료되었습니다. 다시 로그인해 주세요." : response.status === 403 ? "관리자만 볼 수 있습니다." : "문서를 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.");
        return response.json() as Promise<object>;
      })
      .then(spec => { if (!controller.signal.aborted) setState({ spec }); })
      .catch(error => { if (!controller.signal.aborted) setState({ error: error instanceof Error ? error.message : "문서를 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, []);

  if (state.error) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">{state.error}</p>;
  if (!state.spec) return <p role="status" className="p-5 text-sm">API 명세를 불러오고 있습니다.</p>;
  return <div className={styles.docs}>
    <SwaggerUI spec={state.spec} plugins={[localDocsOnlyPlugin]} queryConfigEnabled={false} persistAuthorization={false}
      supportedSubmitMethods={["get"]} tryItOutEnabled={false}
      docExpansion="list" defaultModelsExpandDepth={-1} displayRequestDuration
      requestInterceptor={request => restrictSwaggerRequest({ ...request, url: String(request.url), method: String(request.method ?? "") }, window.location.origin)} />
  </div>;
}
