import { ProfileAvatar } from '@/components/account/ProfileAvatar';
export function AuthorBadge({name,authorId}:{name:string;authorId?:string|null}) {
  const params=new URLSearchParams(authorId?{author_id:authorId}:{nickname:name});
  const available=!!authorId || /^[가-힣A-Za-z0-9_-]{2,16}$/.test(name) && name!=='탈퇴한회원';
  return <span className="author-badge"><ProfileAvatar src={available?`/api/authors/avatar?${params}`:null} name={name} size={24}/><span>{name}</span></span>;
}
