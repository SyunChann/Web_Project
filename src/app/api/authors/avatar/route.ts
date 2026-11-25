import { NextResponse } from 'next/server';
import { authorPhotoLookup, getAuthorPhoto } from '@/data/authorPhoto';
export async function GET(request:Request) {
  const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
  const params=new URL(request.url).searchParams;
  const lookup=authorPhotoLookup(params.get('author_id'),params.get('nickname'));
  if(!lookup)return new NextResponse(null,{status:400,headers});
  try {const url=await getAuthorPhoto(lookup.column as 'user_id'|'nickname',lookup.value);return url?NextResponse.redirect(url,{status:307,headers}):new NextResponse(null,{status:404,headers});}
  catch{return new NextResponse(null,{status:503,headers});}
}
