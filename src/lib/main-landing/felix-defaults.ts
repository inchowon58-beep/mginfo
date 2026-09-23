/**
 * 필릭스스칼프(F:\필릭스스칼프) 메인 원고를 기본 템플릿으로 둔다.
 * {{KEYWORD}} {{BRAND}} {{REGION}} {{PLACE}} {{ADDRESS}} {{FULL}} 만 치환한다.
 */

export type FelixTemplateVars = {
  keyword: string;
  brand: string;
  region: string;
  place: string;
  address: string;
  full: string;
};

export function fillFelixTemplate(text: string, vars: FelixTemplateVars) {
  return text
    .replaceAll("{{KEYWORD}}", vars.keyword)
    .replaceAll("{{BRAND}}", vars.brand)
    .replaceAll("{{REGION}}", vars.region)
    .replaceAll("{{PLACE}}", vars.place)
    .replaceAll("{{ADDRESS}}", vars.address)
    .replaceAll("{{FULL}}", vars.full);
}

export function fillDeep<T>(value: T, vars: FelixTemplateVars): T {
  if (typeof value === "string") return fillFelixTemplate(value, vars) as T;
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, vars)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillDeep(v, vars);
    return out as T;
  }
  return value;
}

/** 청라점 기준 필릭스 원고 — 지역·키워드만 바꿔 재사용 */
export const FELIX_SCALP_DEFAULT = {
  brandEn: "FELIX SKALP",
  tagline: "{{PLACE}}에서 두피문신(SMP) 시술과 전문 교육을 함께하는 스튜디오",
  heroKicker: "Premium SMP · {{REGION}}",
  heroTitle: "{{KEYWORD}}",
  heroSubtitle: "{{BRAND}} · {{PLACE}}",
  heroLead:
    "{{PLACE}}에서 두피문신(SMP) 시술과 전문 교육을 함께하는 스튜디오. 헤어라인·정수리·밀도 보완까지 1:1 디자인 상담 후 맞춤 SMP를 진행합니다.",
  heroHint:
    "{{KEYWORD}} 시술·교육 상담을 원하시면 카카오톡 또는 전화로 연락 주세요. {{PLACE}} 스튜디오 방문 일정과 과정을 안내해 드립니다.",
  aboutKicker: "{{REGION}} · VISION",
  aboutTitle: "{{REGION}}에서 만나는\n프리미엄 두피문신",
  aboutBody:
    "{{BRAND}} {{REGION}}점은 {{PLACE}}에서 두피문신(SMP) 시술과 전문 교육을 함께 제공합니다. 인근 지역에서 방문하시는 분들을 위한 맞춤 상담을 진행합니다.",
  aboutPromises: [
    {
      n: "01",
      title: "{{PLACE}} 전용 스튜디오",
      body: "{{ADDRESS}}에 위치한 공간에서 두피문신 시술과 아카데미 교육을 함께 운영합니다. 1:1 맞춤 상담을 기본으로 합니다.",
    },
    {
      n: "02",
      title: "디자인 우선 접근",
      body: "얼굴형·모발 밀도·탈모 패턴을 세밀히 분석한 뒤, 자연스러운 라인과 밀도를 설계합니다. 충분히 상담한 후 시술을 결정하셔도 됩니다.",
    },
    {
      n: "03",
      title: "검증된 기술력",
      body: "국내·해외 SMP 마스터 과정과 보건·위생 교육을 이수한 원장이 {{REGION}}점 시술과 교육을 직접 진행합니다.",
    },
  ],
  processKicker: "CONSULTATION FLOW",
  processTitle: "{{KEYWORD}} 상담 흐름",
  processLead:
    "{{BRAND}} {{REGION}}점은 모든 시술과 교육을 상담부터 시작합니다. {{PLACE}} 스튜디오에서 편하게 문의해 주세요.",
  processSteps: [
    {
      title: "상담 예약",
      body: "카카오톡 또는 전화로 {{PLACE}} 스튜디오 방문 일정을 잡습니다.",
    },
    {
      title: "디자인 설계",
      body: "두피 상태와 원하는 라인을 확인하고, 시술 범위·횟수·밀도를 함께 정합니다.",
    },
    {
      title: "맞춤 SMP 시술",
      body: "설계된 디자인에 따라 헤어라인·정수리·밀도 보완 시술을 진행합니다.",
    },
    {
      title: "관리·교육 안내",
      body: "사후관리 가이드를 전달하고, 아카데미 과정 문의 시 커리큘럼을 안내합니다.",
    },
  ],
  servicesKicker: "SMP · {{REGION}}",
  servicesTitle: "{{KEYWORD}} 시술 안내",
  servicesLead:
    "{{PLACE}} 스튜디오에서 진행하는 SMP 시술·교육·상담 항목입니다. 관심 분야를 알려 주시면 맞춤 일정을 안내해 드립니다.",
  services: [
    {
      title: "헤어라인·정수리 SMP",
      body: "M자·정수리·측두부 등 탈모 부위에 맞춘 밀도 보완과 라인 디자인",
      tag: "시술",
    },
    {
      title: "1:1 디자인 상담",
      body: "얼굴형과 모발 상태를 분석해 시술 범위·횟수·예상 결과를 함께 설계",
      tag: "상담",
    },
    {
      title: "SMP 아카데미 교육",
      body: "{{REGION}}점에서 두피문신 기술·디자인·위생 과정을 체계적으로 교육",
      tag: "교육",
    },
    {
      title: "사후관리 프로그램",
      body: "시술 후 세안·자외선·재방문 일정을 정리해 드리는 관리 가이드",
      tag: "관리",
    },
  ],
  galleryKicker: "PORTFOLIO",
  galleryTitle: "{{KEYWORD}} 시술·교육 갤러리",
  galleryLead:
    "{{BRAND}} {{REGION}}점에서 진행한 SMP 시술·교육 사진입니다. 더 자세한 사례는 카카오톡 또는 전화로 문의해 주세요.",
  directorKicker: "DIRECTOR",
  directorTitle: "{{REGION}}점 대표원장 프로필",
  directorLead:
    "{{PLACE}} 스튜디오를 운영하는 대표원장의 경력입니다. {{KEYWORD}} 시술과 아카데미 교육을 직접 진행합니다.",
  directorGroups: [
    {
      title: "현장 경력",
      items: ["Gil Hair Beauty 근무", "AMOS Professional 근무", "Richard ProHair 근무"],
    },
    {
      title: "미용·교육 자격",
      items: [
        "네일아티스트 2급",
        "발관리사 2급",
        "AMOS COLOR INTENTIVE COURSE 수료",
        "미용대학 미용학과 졸업(헤어전공)",
        "미용종합면허(헤어, 피부, 네일, 메이크업)",
        "교원자격(교육인적자원부 장관)",
        "이용사 국가자격(보건복지부)",
      ],
    },
    {
      title: "SMP 교육·인증",
      items: [
        "KART SMP MASTER COURSE 수료",
        "GCA SMP MASTER COURSE 수료",
        "GCA DESIGN MASTER COURSE 수료",
        "K뷰티전문가연합회 SMP COURSE 수료",
        "호주 HRC SMP 기술교육 이수 실버인증",
        "KTF 보건 및 위생교육 이수",
      ],
    },
    {
      title: "강사·학회",
      items: [
        "호주 HRC SMP 기술인증 강사교육 골드인증",
        "K뷰티전문가연합회 SMP 인증 강사",
        "(사)대한문신사중앙회 정회원",
        "대한보건협회 정회원",
        "K뷰티전문가연합회 김포 지부장",
        "KW-SMP 학회 김포 운영위원장",
        "국제바디아트콘테스트 SMP 수석 심사감독관",
      ],
    },
    {
      title: "운영 이력",
      items: [
        "前 DD ACADEMY 부천본점 SMP 원장",
        "前 제이어반터치 청담본점 SMP 원장",
        "前 필릭스 스칼프 아카데미 인천점 대표원장",
        "現 필릭스 스칼프 본점 대표원장",
        "現 필릭스 스칼프 아카데미 본점 대표원장",
        "現 필릭스 스칼프 아카데미 {{REGION}}점 대표원장",
        "現 모가난다 주식회사 대표",
      ],
    },
  ],
  reviewsKicker: "TESTIMONIALS",
  reviewsTitle: "{{KEYWORD}} 이용 후기",
  reviewsLead: "{{BRAND}} {{REGION}}점에서 시술·교육을 경험하신 분들의 이야기입니다.",
  reviews: [
    {
      quote:
        "{{REGION}}에서 두피문신 알아보다 방문했는데, 라인을 먼저 그려 보여 주셔서 원하는 느낌에 가깝게 나왔습니다.",
      name: "김○○ 고객",
      course: "헤어라인 SMP",
    },
    {
      quote: "{{PLACE}} 스튜디오 분위기가 깔끔하고, 교육 과정 설명이 체계적이어서 수강 결정이 수월했습니다.",
      name: "이○○ 수강생",
      course: "SMP 아카데미",
    },
    {
      quote: "시술 전후 관리 항목을 구체적으로 알려 주셔서, 회복 기간 동안 불안하지 않았습니다.",
      name: "박○○ 고객",
      course: "사후관리",
    },
    {
      quote: "정수리 밀도만 보완하고 싶었는데, 과하지 않게 범위를 잡아 주셔서 자연스럽습니다.",
      name: "최○○ 고객",
      course: "밀도 보완",
    },
    {
      quote: "오기 편한 위치이고, 시술과 교육 일정을 나눠 안내해 줘서 선택이 명확했습니다.",
      name: "정○○ 수강생",
      course: "교육 상담",
    },
    {
      quote: "카카오톡으로 사진과 상담 시간을 바로 잡아 주셔서 방문까지 편했습니다.",
      name: "한○○ 고객",
      course: "상담",
    },
  ],
  faqKicker: "FAQ",
  faqTitle: "{{KEYWORD}}, 자주 묻는 질문",
  faqLead: "{{KEYWORD}} 시술·교육을 알아보실 때 많이 문의하시는 내용입니다.",
  faqs: [
    {
      q: "{{FULL}}는 어디에 있나요?",
      a: "{{ADDRESS}}에 위치해 있습니다. 인근 지역에서 방문하시는 분들이 많습니다. {{PLACE}} 스튜디오 상담은 카카오톡 또는 전화로 편하게 문의해 주세요.",
    },
    {
      q: "{{REGION}}에서 두피문신 시술은 어떻게 진행되나요?",
      a: "먼저 두피 상태와 원하는 라인을 1:1로 상담한 뒤, 헤어라인·정수리·밀도 보완 중 필요한 범위를 정합니다. 부위와 밀도에 따라 시술 횟수가 달라질 수 있습니다.",
    },
    {
      q: "{{REGION}}점에서 두피문신 교육도 받을 수 있나요?",
      a: "네. {{BRAND}} 아카데미 {{REGION}}점에서 SMP 기술·디자인·위생 교육을 진행합니다. 수강 과정과 일정은 상담을 통해 안내해 드립니다.",
    },
    {
      q: "{{KEYWORD}} 비용은 어떻게 되나요?",
      a: "시술 부위, 밀도, 필요 횟수에 따라 달라집니다. 상담에서 두피 상태를 확인한 후 범위별로 안내해 드리며, 전화나 카카오톡으로 대략적인 견적을 먼저 받으실 수 있습니다.",
    },
    {
      q: "시술 후 관리는 어떻게 해야 하나요?",
      a: "시술 직후 세안·자외선 차단·재방문 일정을 안내해 드립니다. {{PLACE}} 스튜디오에서 사후관리 항목을 정리해 드리니, 안내문과 함께 꼭 확인해 주세요.",
    },
    {
      q: "{{KEYWORD}} 상담은 어떻게 예약하나요?",
      a: "시술 부위나 교육 과정만 알려 주셔도 됩니다. 카카오톡 또는 전화로 접수하시면 {{PLACE}} 스튜디오 방문 일정을 잡아 드립니다.",
    },
  ],
  ctaLabel: "카카오톡 상담하기",
  ctaPhone: "전화 상담",
  ctaSecondary: "시술·교육 안내",
  footerTagline: "{{PLACE}}에서 두피문신(SMP) 시술과 전문 교육을 함께하는 스튜디오",
};

