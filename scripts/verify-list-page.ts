import { listPageHref, paginateList, parseListPage, PUBLIC_LIST_PAGE_SIZE } from "../src/lib/list-page";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

assert(PUBLIC_LIST_PAGE_SIZE === 12, "public lists stay at 12 per page");
assert(parseListPage(undefined) === 1, "missing page is 1");
assert(parseListPage("3") === 3, "numeric page");
assert(parseListPage("0") === 1, "page 0 becomes 1");
assert(parseListPage("nope") === 1, "invalid page becomes 1");

const items = Array.from({ length: 25 }, (_, i) => i + 1);
const first = paginateList(items, 1);
assert(first.items.length === 12, "first page has 12");
assert(first.items[0] === 1 && first.items[11] === 12, "first page slice");
assert(first.totalPages === 3, "25 items make 3 pages");
assert(first.start === 1, "first page start index");

const last = paginateList(items, 3);
assert(last.items.length === 1, "last page has remainder");
assert(last.items[0] === 25, "last item");
assert(last.page === 3, "clamped last page");

const overflow = paginateList(items, 99);
assert(overflow.page === 3 && overflow.items.length === 1, "overflow page clamps");

assert(listPageHref("/category/pets", 1) === "/category/pets", "page 1 omits query");
assert(listPageHref("/category/pets", 2) === "/category/pets?page=2", "page 2 query");
assert(listPageHref("/posts", 2, { q: "강아지" }) === "/posts?q=%EA%B0%95%EC%95%84%EC%A7%80&page=2", "keeps search");

console.log("list page ok");
