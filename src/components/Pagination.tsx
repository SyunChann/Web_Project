import Link from "next/link";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    getHref: (page: number) => string;
}

export default function Pagination({ currentPage, totalPages, getHref }: PaginationProps) {
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

    // 공통 디자인 클래스: 원형, 큰 크기, 굵은 폰트
    const baseClass = "flex h-9 w-9 items-center justify-center rounded-full transition-all text-xl font-black pt-1.5";
    const activeClass = "bg-[#be4b49] text-white shadow-md";
    const inactiveClass = "hover:bg-[#f3f0ec] hover:text-[#be4b49] text-[#52616b]";
    const disabledClass = "opacity-20 pointer-events-none";

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