export function SearchForm({
  q = "",
  placeholder = "기사 제목, 키워드로 검색",
}: {
  q?: string;
  placeholder?: string;
}) {
  return (
    <form className="mag-search" action="/posts" method="get">
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label="기사 검색" />
      <button type="submit">검색</button>
    </form>
  );
}
