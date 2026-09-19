import { escapeHtml } from "./html-escape";
import type { PagePlanSection } from "./page-plan-types";
import type { VerifiedPack } from "./verified-availability";
import type { Animal, ProjectExample } from "./vendor-profile-types";

function esc(value: string): string {
  return escapeHtml(String(value || ""));
}

function factValue(value: string | number | boolean | string[]): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return String(value);
}

/** Only http(s) absolute URLs — never invent or pass through javascript: etc. */
export function isSafeMediaUrl(url: string): boolean {
  const raw = String(url || "").trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function animalAlt(animal: Animal, companyName?: string): string {
  return [companyName, animal.breed, animal.name].map((s) => String(s || "").trim()).filter(Boolean).join(" ");
}

/** Verified-only animal card. No Gemini copy. Hide empty fields. */
export function renderAnimalCard(animal: Animal, companyName?: string): string {
  const title = esc(animal.name || animal.breed);
  const bits = [
    animal.breed && `품종 ${esc(animal.breed)}`,
    animal.sex && `성별 ${esc(animal.sex)}`,
    animal.birthDate && `생년월일 ${esc(animal.birthDate)}`,
    animal.color && `모색 ${esc(animal.color)}`,
  ].filter(Boolean);
  const defaultAlt = animalAlt(animal, companyName);
  const media = (animal.media || [])
    .filter((m) => isSafeMediaUrl(m.url))
    .slice(0, 3)
    .map((m) => {
      const alt = esc(m.alt?.trim() || defaultAlt || animal.breed);
      return `<figure class="verified-animal-media"><img src="${esc(m.url)}" alt="${alt}" width="800" height="600" loading="lazy" decoding="async" /></figure>`;
    })
    .join("");
  const desc =
    animal.description && String(animal.description).trim()
      ? `<p class="verified-animal-desc">${esc(animal.description.trim())}</p>`
      : "";
  return `<article class="verified-animal" data-animal-id="${esc(animal.id)}">
  <h3>${title}</h3>
  ${bits.length ? `<p>${bits.join(" · ")}</p>` : ""}
  ${desc}
  ${media}
</article>`;
}

function renderProjectCard(project: ProjectExample): string {
  const bits = [
    project.projectType && esc(project.projectType),
    project.region && esc(project.region),
    project.completedAt && `완료 ${esc(project.completedAt.slice(0, 10))}`,
  ].filter(Boolean);
  const media = (project.media || [])
    .filter((m) => isSafeMediaUrl(m.url))
    .slice(0, 3)
    .map(
      (m) =>
        `<figure class="verified-project-media"><img src="${esc(m.url)}" alt="${esc(m.alt || project.title)}" width="800" height="600" loading="lazy" decoding="async" /></figure>`
    )
    .join("");
  return `<article class="verified-project">
  <h3>${esc(project.title)}</h3>
  ${bits.length ? `<p>${bits.join(" · ")}</p>` : ""}
  ${project.description ? `<p>${esc(project.description)}</p>` : ""}
  ${media}
</article>`;
}

/**
 * Code-rendered Verified blocks.
 * Role split (no duplicate facts across adjacent blocks):
 * - store_information: identity + contact + services/specialty (no hours)
 * - visit_information: hours, consultation, visit policy, parking (no phone/address repeat)
 */
export function renderVerifiedBlockHtml(
  blockKey: string,
  section: PagePlanSection,
  pack: VerifiedPack
): string | null {
  const view = pack.view;
  if (!view) return null;

  switch (blockKey) {
    case "available_animals": {
      if (!pack.matchingAnimals.length) return null;
      const cards = pack.matchingAnimals
        .map((a) => renderAnimalCard(a, view.companyName))
        .join("\n");
      return `<div class="verified-block verified-animals" data-block="${esc(blockKey)}">
${cards}
</div>`;
    }
    case "store_information":
    case "company_information": {
      const rows: string[] = [];
      rows.push(`<li><strong>상호</strong> ${esc(view.companyName)}</li>`);
      if (view.address) rows.push(`<li><strong>주소</strong> ${esc(view.address)}</li>`);
      if (view.phone) rows.push(`<li><strong>전화</strong> ${esc(view.phone)}</li>`);
      if (view.website) rows.push(`<li><strong>웹사이트</strong> ${esc(view.website)}</li>`);
      if (view.services.length) {
        rows.push(`<li><strong>서비스</strong> ${esc(view.services.join(", "))}</li>`);
      }
      if (view.serviceAreas.length) {
        rows.push(`<li><strong>서비스 지역</strong> ${esc(view.serviceAreas.join(", "))}</li>`);
      }
      for (const fact of view.verifiedFacts.slice(0, 8)) {
        rows.push(`<li><strong>${esc(fact.label)}</strong> ${esc(factValue(fact.value))}</li>`);
      }
      // businessHours intentionally omitted — belongs in visit_information
      return `<div class="verified-block verified-store" data-block="${esc(blockKey)}">
<ul>
${rows.join("\n")}
</ul>
</div>`;
    }
    case "visit_information": {
      const rows: string[] = [];
      if (view.businessHours) rows.push(`<li><strong>영업시간</strong> ${esc(view.businessHours)}</li>`);
      if (view.consultationMethod) {
        rows.push(`<li><strong>상담</strong> ${esc(view.consultationMethod)}</li>`);
      }
      if (view.visitPolicy) rows.push(`<li><strong>방문</strong> ${esc(view.visitPolicy)}</li>`);
      const parking = view.industryData?.parking;
      if (parking != null && String(parking).trim()) {
        rows.push(`<li><strong>주차</strong> ${esc(String(parking).trim())}</li>`);
      }
      // Do not repeat address/phone — those stay in store_information
      if (!rows.length) return null;
      return `<div class="verified-block verified-visit" data-block="${esc(blockKey)}">
<ul>
${rows.join("\n")}
</ul>
</div>`;
    }
    case "consultation": {
      if (!view.consultationMethod) return null;
      return `<div class="verified-block verified-consultation" data-block="${esc(blockKey)}">
<p>${esc(view.consultationMethod)}</p>
</div>`;
    }
    case "project_examples": {
      if (!pack.projects.length) return null;
      return `<div class="verified-block verified-projects" data-block="${esc(blockKey)}">
${pack.projects.map(renderProjectCard).join("\n")}
</div>`;
    }
    default:
      return null;
  }
}

/** Prefer section.heading from plan; never let AI rewrite verified body. */
export function wrapVerifiedSection(heading: string, innerHtml: string): string {
  const h = esc(heading);
  return `<h2>${h}</h2>\n${innerHtml}`;
}
