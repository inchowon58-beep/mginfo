# Infocs Brand Studio (v2)

기존 `studio/`(Infocs Studio)와 **분리**된 PC 앱입니다. 키워드마다 Vercel 사이트를 만들고, 메인(두피문신)·블로그 디자인을 심습니다. 사이트마다 `variationSeed`로 내용·색이 조금 달라집니다.

- appId: `co.infocs.studio.brand`
- 출력: `../사이트만들기-브랜드/InfocsBrandStudio.exe`
- ops 사이트 대장(`/api/ops/sites`) **미사용** — 로컬 대장만

## 사용

1. `cd studio-v2 && npm install && npm start`
2. **계정 설정**: Vercel 토큰 · (선택) Team · GitHub repo · 마스터 비번
3. **구성·발행**: apex · 키워드 목록 · 업체 최소정보 · 메인/블로그 디자인 → **대량 사이트 발행**
4. 배포된 코드에 `/api/brand-studio/bootstrap`이 있어야 메인랜딩이 자동 적용됩니다 (이 저장소 main 배포 후).
   사이트에 제미나이 키가 있으면 bootstrap이 **내용 보충**까지 돌려 사이트마다 문장을 다르게 씁니다.

```bash
npm run dist
```
