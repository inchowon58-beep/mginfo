import type { SiteThemeId } from "./types";

export type SiteTheme = {
  id: SiteThemeId;
  number: number;
  name: string;
  nameEn: string;
  description: string;
  rootClass: string;
  accent: string;
  paper: string;
};

export const SITE_THEMES: SiteTheme[] = [
  {
    id: "folio",
    number: 1,
    name: "폴리오",
    nameEn: "Folio",
    description: "지금 사이트의 매거진 특집형. 세리프 제목, 넓은 여백, 카드 레이아웃.",
    rootClass: "magazine-root editorial theme-folio",
    accent: "#2563eb",
    paper: "#f6f3ee",
  },
  {
    id: "press",
    number: 2,
    name: "라이브매거진",
    nameEn: "Live Mag",
    description: "흰 배경의 생활정보 매거진. 큰 타이틀, 피드형 카드, 한글 메뉴, 제휴·전체글 색인.",
    rootClass: "magazine-root theme-press",
    accent: "#0891b2",
    paper: "#ffffff",
  },
  {
    id: "night",
    number: 3,
    name: "나이트마켓",
    nameEn: "Night Market",
    description: "검정 포스터형. 표지 히어로, 번호 플레이리스트, 정사각 스틸 컷. 주황·라임 포인트.",
    rootClass: "magazine-root theme-night",
    accent: "#ff5c1c",
    paper: "#0a0a0a",
  },
  {
    id: "journal",
    number: 4,
    name: "노트블로그",
    nameEn: "Note Blog",
    description: "개인 블로그형. 프로필 소개, 날짜순 글 목록, 오른쪽 사이드바.",
    rootClass: "magazine-root theme-journal",
    accent: "#2f6f4e",
    paper: "#fffef9",
  },
  {
    id: "qna",
    number: 5,
    name: "지식데스크",
    nameEn: "Knowledge Desk",
    description: "지식인형 정보 사이트. 검색 중심, Q 목록, 분야별 지식 패널.",
    rootClass: "magazine-root theme-qna",
    accent: "#1b365d",
    paper: "#eef1f5",
  },
  {
    id: "talk",
    number: 6,
    name: "라이프피드",
    nameEn: "Life Feed",
    description: "인스타그램형 피드. 스토리 원형, 정사각 사진, 캡션과 탐색 그리드.",
    rootClass: "magazine-root theme-talk",
    accent: "#d62976",
    paper: "#fafafa",
  },
  {
    id: "portal",
    number: 7,
    name: "포털홈",
    nameEn: "Portal",
    description: "네이버형 포털. 초록 검색창, 바로가기, 이슈·랭킹 박스.",
    rootClass: "magazine-root theme-portal",
    accent: "#03c75a",
    paper: "#ffffff",
  },
  {
    id: "carrot",
    number: 8,
    name: "당근동네",
    nameEn: "Karrot Town",
    description: "당근마켓형 동네 정보. 주황 검색, 카테고리 바로가기, 사진 카드와 동네 이야기.",
    rootClass: "magazine-root theme-carrot",
    accent: "#ff6f0f",
    paper: "#f7f8fa",
  },
  {
    id: "studio",
    number: 9,
    name: "클래스룸",
    nameEn: "Classroom",
    description: "강의형 랜딩. 큰 히어로, 카드형 가이드, 입장 팝업. 상세뚝딱 마켓과 비슷한 톤.",
    rootClass: "magazine-root theme-studio",
    accent: "#5b4dff",
    paper: "#f6f3ee",
  },
];

export const DEFAULT_SITE_THEME: SiteThemeId = "press";

export function isSiteThemeId(value: unknown): value is SiteThemeId {
  return SITE_THEMES.some((theme) => theme.id === value);
}

export function getSiteTheme(id?: string | null): SiteTheme {
  const found = SITE_THEMES.find((theme) => theme.id === id);
  return found || SITE_THEMES.find((theme) => theme.id === DEFAULT_SITE_THEME)!;
}
