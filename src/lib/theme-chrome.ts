import { SITE } from "./categories";
import type { SiteThemeId } from "./types";

export type ThemeChrome = {
  home: string;
  posts: string;
  partners: string;
  admin: string;
  tagline: string;
};

export function getThemeChrome(themeId: SiteThemeId = "folio"): ThemeChrome {
  if (themeId === "press") {
    return {
      home: "홈",
      posts: "전체글",
      partners: "제휴업체",
      admin: "관리자",
      tagline: "모든 생활 정보를 한눈에",
    };
  }
  if (themeId === "night") {
    return {
      home: "홈",
      posts: "전체매거진",
      partners: "파트너",
      admin: "관리",
      tagline: "오늘 밤의 생활 정보",
    };
  }
  if (themeId === "journal") {
    return {
      home: "홈",
      posts: "글목록",
      partners: "소개",
      admin: "관리",
      tagline: "일상을 기록하는 블로그",
    };
  }
  if (themeId === "qna") {
    return {
      home: "홈",
      posts: "전체지식",
      partners: "파트너",
      admin: "관리",
      tagline: "궁금한 생활 정보를 찾아보세요",
    };
  }
  if (themeId === "talk") {
    return {
      home: "홈",
      posts: "피드",
      partners: "추천계정",
      admin: "관리",
      tagline: "오늘의 순간을 모아 보세요",
    };
  }
  if (themeId === "portal") {
    return {
      home: "홈",
      posts: "뉴스",
      partners: "파트너",
      admin: "관리",
      tagline: "오늘 필요한 정보를 한곳에서",
    };
  }
  if (themeId === "carrot") {
    return {
      home: "홈",
      posts: "동네소식",
      partners: "동네파트너",
      admin: "관리",
      tagline: "당신 근처의 생활 정보",
    };
  }
  if (themeId === "studio") {
    return {
      home: "홈",
      posts: "전체리스트",
      partners: "파트너",
      admin: "관리",
      tagline: "영상처럼 쉽고, 바로 써먹는 생활 가이드",
    };
  }
  return {
    home: "Home",
    posts: "Stories",
    partners: "Partners",
    admin: "Admin",
    tagline: SITE.tagline,
  };
}

export function getPageMastClass(themeId: SiteThemeId) {
  if (themeId === "press") {
    return { wrap: "press-mast is-page", kicker: "press-kicker", dek: "press-dek" };
  }
  if (themeId === "night") {
    return { wrap: "night-mast is-page", kicker: "night-kicker", dek: "night-dek" };
  }
  if (themeId === "journal") {
    return { wrap: "blog-mast is-page", kicker: "blog-kicker", dek: "blog-dek" };
  }
  if (themeId === "qna") {
    return { wrap: "qna-mast is-page", kicker: "qna-kicker", dek: "qna-dek" };
  }
  if (themeId === "talk") {
    return { wrap: "talk-mast is-page", kicker: "talk-kicker", dek: "talk-dek" };
  }
  if (themeId === "portal") {
    return { wrap: "portal-mast is-page", kicker: "portal-kicker", dek: "portal-dek" };
  }
  if (themeId === "carrot") {
    return { wrap: "carrot-mast is-page", kicker: "carrot-kicker", dek: "carrot-dek" };
  }
  if (themeId === "studio") {
    return { wrap: "studio-mast is-page", kicker: "studio-kicker", dek: "studio-dek" };
  }
  return { wrap: "edit-hero is-page", kicker: "edit-kicker", dek: "edit-dek" };
}
