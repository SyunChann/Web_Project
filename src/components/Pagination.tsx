import Link from "next/link";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    getHref: (page: number) => string;
    //페이징 버튼 컬러테마 변경용 디폴트 레드
    //색 추가 필요시 activeThemeClasses 와 inactiveThemeClasses 색 추가후 사용
    theme?: "red" | "green" | "blue";
}

export default function Pagination({ currentPage, totalPages, getHref, theme = "red" }: PaginationProps) {
    const maxVisiblePages = 10; //페이지수 노출 맥시멈 설정

    const getPageNumbers = () => {
        if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        // 6페이지부터 11페이지 보임
        // 11페이지부터 7~16가 나오도록 설정
        let start = Math.max(1, currentPage - 4);
        let end = start + maxVisiblePages - 1;

        if (end > totalPages) {
            end = totalPages;
            start = Math.max(1, end - maxVisiblePages + 1);
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const pageNumbers = getPageNumbers();

    if (totalPages <= 1) return null;

    // 공통 디자인
    const baseClass = "flex h-9 w-9 items-center justify-center rounded-full transition-all text-xl font-black pt-1.5";
    const disabledClass = "opacity-20 pointer-events-none";

    // 활성화(현재 페이지) 색상
    const activeThemeClasses = {
        red: "bg-[#be4b49] text-white shadow-md",
        green: "bg-[#2f7f7a] text-white shadow-md",
        blue: "bg-[#2563eb] text-white shadow-md",
    };

    // 비활성화(마우스 호버 등) 색상
    const inactiveThemeClasses = {
        red: "hover:bg-[#f3f0ec] hover:text-[#be4b49] text-[#52616b]",
        green: "hover:bg-[#f3f0ec] hover:text-[#2f7f7a] text-[#52616b]",
        blue: "hover:bg-[#f3f0ec] hover:text-[#2563eb] text-[#52616b]",
    };

    // 넘어온 theme 값에 맞는 스타일을 사전에서 꺼냅니다.
    const activeClass = activeThemeClasses[theme];
    const inactiveClass = inactiveThemeClasses[theme];

    return (
        <div className="flex items-center justify-center gap-2">

            {/* 처음 */}
            <Link href={getHref(1)} className={`${baseClass} ${currentPage === 1 ? disabledClass : inactiveClass}`}>
                &lt;&lt;
            </Link>
            
            {/* 이전 */}
            <Link href={getHref(Math.max(1, currentPage - 1))} className={`${baseClass} ${currentPage === 1 ? disabledClass : inactiveClass}`}>
                &lt;
            </Link>

            {/* 번호 */}
            {pageNumbers.map((pageNum) => (
                <Link
                    key={pageNum}
                    href={getHref(pageNum)}
                    className={`${baseClass} ${currentPage === pageNum ? activeClass : inactiveClass}`}>
                {pageNum}    
                </Link>
            ))}

            {/* 다음 */}
            <Link href={getHref(Math.min(totalPages, currentPage + 1))} className={`${baseClass} ${currentPage === totalPages ? disabledClass : inactiveClass}`}>
                &gt;
            </Link>
            
            {/* 끝 */}
            <Link href={getHref(totalPages)} className={`${baseClass} ${currentPage === totalPages ? disabledClass : inactiveClass}`}>
                &gt;&gt;
            </Link>
        </div>
    );
}