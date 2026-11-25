'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin';
import { observeApi } from '@/lib/apiMonitoring';
import { failureObservation, httpObservation, type ApiState } from '@/lib/apiMonitoringModel';
import { readTossSuccess, TossResponseError, tossErrorAdvice, tossOperation } from '@/lib/tossResponse';
type Check={label:string;state:ApiState;httpStatus?:number;code?:string;count?:number};
export async function checkTossDiagnostic() {
  const client=await createSupabaseServerClient();
  const {data:{user}}=client?await client.auth.getUser():{data:{user:null}};
  if(!isAdminUser(user))return {state:'error' as const,message:'관리자만 점검할 수 있습니다.'};
  const base=process.env.TOSS_PROXY_BASE_URL?.trim().replace(/\/+$/,'');const key=process.env.TOSS_PROXY_API_KEY?.trim();
  if(!base||!key)return {state:'error' as const,message:'토스 프록시 환경변수를 확인해 주세요.'};
  const config={base,key};
  const checks:Check[]=[];
  async function probe(label:string,path:string,field:'items'|'categories') {
    try {
      const operation=tossOperation(path);
      const response=await fetch(`${config.base}${path}`,{headers:{'x-proxy-api-key':config.key},cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new TossResponseError(httpObservation(response.status).state,response.status,operation);
      let payload:unknown;try{payload=await response.json();}catch{throw new TossResponseError('invalid-response',response.status,operation,'PROXY_INVALID_JSON');}
      const data=readTossSuccess<Record<string,unknown>>(payload,response.status,operation);
      if(!Array.isArray(data[field]))throw new TossResponseError('invalid-response',response.status,operation,'PROXY_INVALID_ITEMS');
      checks.push({label,state:data[field].length?'ok':'empty',httpStatus:response.status,count:data[field].length});
      return data[field] as {tacaItemId?:number}[];
    } catch(error) {
      const observed=failureObservation(error);
      checks.push({label,state:observed.state,httpStatus:observed.httpStatus,code:error instanceof TossResponseError?error.errorCode:undefined});
      return null;
    }
  }
  await observeApi('toss',async()=>{
    // Only GETs: reuse the existing ranking cache and inspect one detail item.
    const items=await probe('베스트 상품','/v1/products/best-selling?size=50','items');
    const id=items?.find(item=>item && Number.isSafeInteger(item.tacaItemId) && item.tacaItemId!>0)?.tacaItemId;
    if(id)await probe('상품 상세',`/v1/products/detail?tacaItemIds=${id}`,'items');
    await probe('카테고리 목록','/v1/categories','categories');
    return checks;
  },values=>{
    const failed=values.find(value=>!['ok','empty'].includes(value.state));
    return failed?{state:failed.state,httpStatus:failed.httpStatus}:{state:'ok',httpStatus:200};
  });
  const failed=checks.some(value=>!['ok','empty'].includes(value.state));
  const message=checks.map(value=>['ok','empty'].includes(value.state)?`${value.label}: 정상 · HTTP ${value.httpStatus} · ${value.count}개`:`${value.label}: ${value.httpStatus?`HTTP ${value.httpStatus} · `:''}${value.code||value.state}\n${value.code?tossErrorAdvice(value.code):'네트워크 연결과 응답 지연을 확인해 주세요.'}`).join('\n');
  return {state:failed?'error' as const:'ok' as const,message};
}
