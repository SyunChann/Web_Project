import { ApiRequestError, type ApiState } from '@/lib/apiMonitoringModel';
export type TossOperation = 'best-selling' | 'categories' | 'category-ranking' | 'product-detail' | 'links' | 'unknown';
export function tossOperation(path:string):TossOperation {
  const route=path.split('?')[0];
  if(route==='/v1/products/best-selling')return 'best-selling';
  if(route==='/v1/categories')return 'categories';
  if(/^\/v1\/products\/best-categories\/[1-9]\d*$/.test(route))return 'category-ranking';
  if(route==='/v1/products/detail')return 'product-detail';
  return route==='/v1/links'?'links':'unknown';
}
export function safeTossErrorCode(value:unknown) { return typeof value==='string' && /^[A-Z0-9_]{1,120}$/.test(value)?value:'UNSPECIFIED'; }
export class TossResponseError extends ApiRequestError {
  constructor(kind:ApiState,httpStatus:number,public operation:TossOperation,public errorCode='UNSPECIFIED') {
    super(kind,httpStatus);this.name='TossResponseError';
    // Never log credentials, response bodies, request parameters or provider reason strings.
    console.error('토스 API 조회 실패',{operation,state:kind,httpStatus,errorCode});
  }
}
export function readTossSuccess<T>(payload:unknown,status:number,operation:TossOperation):T {
  if(payload && typeof payload==='object' && 'resultType' in payload && payload.resultType==='FAIL') {
    const error='error' in payload && payload.error && typeof payload.error==='object'?payload.error:{};
    const code=safeTossErrorCode('errorCode' in error?error.errorCode:undefined);
    const state:ApiState=['SHARELINK_OPENAPI_ACCESS_DENIED','SHARELINK_OPENAPI_PARTNER_NOT_AUTHORIZED'].includes(code)?'authentication':code==='SHARELINK_OPENAPI_QUOTA_EXCEEDED'?'rate-limit':code==='INVALID_TOSS_RESPONSE'?'invalid-response':'upstream-error';
    throw new TossResponseError(state,status,operation,code);
  }
  if(!payload || typeof payload!=='object' || !('resultType' in payload) || payload.resultType!=='SUCCESS' || !('success' in payload) || !payload.success || typeof payload.success!=='object')throw new TossResponseError('invalid-response',status,operation,'PROXY_INVALID_ENVELOPE');
  return payload.success as T;
}
export function tossErrorAdvice(code:string) {
  if(code==='PROXY_INVALID_JSON'||code==='INVALID_TOSS_RESPONSE')return 'JSON으로 읽을 수 없는 응답입니다. 프록시의 경로와 원본 응답을 확인해야 합니다.';
  if(code==='PROXY_INVALID_ENVELOPE'||code==='PROXY_INVALID_ITEMS')return '예상한 공통 응답 또는 상품 목록이 없습니다. 프록시 응답 구조를 확인해야 합니다.';
  if(code==='SHARELINK_OPENAPI_QUOTA_EXCEEDED')return '토스 일 사용 한도를 소진했습니다. 반복 조회를 멈추고 자정(KST) 초기화 후 확인해 주세요.';
  if(code==='SHARELINK_OPENAPI_PARTNER_NOT_AUTHORIZED')return '상품 조회 권한이 없는 응답입니다. 토스쇼핑 인증 상태를 확인해 주세요.';
  if(code==='SHARELINK_OPENAPI_ACCESS_DENIED')return '인증 정보·등록된 서버 IP·거래처 상태를 확인해 주세요. 링크 발급만 실패하면 publisherId와 subTagId도 확인해 주세요.';
  if(code==='INVALID_ARGUMENT')return '요청값 검증에 실패했습니다. 상품 ID·조회 크기·카테고리 ID를 확인해야 합니다.';
  if(code==='SHARELINK_MAINTENANCE_ISSUE_BLOCKED')return '토스 점검으로 링크 발급이 차단됐습니다. 즉시 재시도하지 말고 점검 종료 후 확인해 주세요.';
  return '제공기관 응답을 확인해야 합니다. 표시된 API 종류와 오류 코드로 원인을 좁힐 수 있습니다.';
}
