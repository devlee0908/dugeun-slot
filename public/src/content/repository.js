// Content access layer. The UI only talks to `ContentRepository`-shaped objects,
// so a future API/DB source can replace the static JSON source without touching the UI.
//
// interface ContentRepository {
//   listItems(): Promise<ContentItem[]>   // read-only for public users
// }

const FILES = ['balance', 'talk', 'psych'];

export class StaticContentRepository {
  constructor(baseUrl = new URL('../../content/', import.meta.url)) {
    this.baseUrl = baseUrl;
    this.cache = null;
  }

  async listItems() {
    if (!this.cache) {
      this.cache = Promise.all(
        FILES.map(async (name) => {
          const res = await fetch(new URL(`${name}.json`, this.baseUrl));
          if (!res.ok) throw new Error(`콘텐츠를 불러오지 못했어요 (${name}.json: ${res.status})`);
          return res.json();
        }),
      ).then((lists) => lists.flat().filter(isUsable));
      this.cache.catch(() => { this.cache = null; });
    }
    return this.cache;
  }
}

/** Example of a future remote source (not used in the demo). */
export class ApiContentRepository {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async listItems() {
    const res = await fetch(`${this.endpoint}/contents?status=published`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()).filter(isUsable);
  }
}

function isUsable(item) {
  return item && typeof item.id === 'string' && typeof item.type === 'string' && Array.isArray(item.tags) && item.audience;
}

export const createContentRepository = () => new StaticContentRepository();
