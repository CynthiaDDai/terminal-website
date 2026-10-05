const text = ['name', 'owner', 'user', 'host', 'description', 'bio', 'caption', 'lang', 'dateLocale'];
const known = new Set([...text, 'wordmark', 'homeFooter', 'pageFooter', 'notFound', 'mottos', 'themeSwitch', 'feed', 'email', 'github', 'socials', 'friends', 'activityLimit']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const optionalString = (value: unknown) => value === undefined || isString(value);
const webUrl = (value: unknown, protocols = ['http:', 'https:']) => {
  try { return isString(value) && protocols.includes(new URL(value).protocol); } catch { return false; }
};

// Readable build errors for src/config/site.json; an empty list means the profile is usable.
export function siteConfigErrors(profile: unknown): string[] {
  if (!isRecord(profile)) return ['site.json must contain a JSON object.'];
  const errors: string[] = [];
  for (const key of Object.keys(profile)) if (!known.has(key)) errors.push(`Unknown field "${key}".`);
  for (const key of text) if (!isString(profile[key])) errors.push(`"${key}" must be a string.`);
  try { new Intl.DateTimeFormat(profile.dateLocale as string); } catch { errors.push('"dateLocale" must be a locale such as "en-CA" or "zh-CN".'); }
  const wordmark = profile.wordmark;
  if (!isRecord(wordmark) || !isString(wordmark.name) || !isString(wordmark.suffix)) errors.push('"wordmark" must be { "name": string, "suffix": string }.');
  const notFound = profile.notFound;
  if (!isRecord(notFound) || !isString(notFound.title) || !isString(notFound.description) || !optionalString(notFound.motto) || !optionalString(notFound.quote)) {
    errors.push('"notFound" must be { "title": string, "description": string } with optional "motto" and "quote" strings.');
  }
  const footerWord = (word: unknown) => isString(word) || (isRecord(word) && isString(word.text) && optionalString(word.motto));
  if (!Array.isArray(profile.homeFooter) || !profile.homeFooter.every(footerWord)) errors.push('"homeFooter" must be a list of strings or { "text": string, "motto": string }.');
  const pageFooter = profile.pageFooter;
  if (!isString(pageFooter) && !(Array.isArray(pageFooter) && pageFooter.length > 0 && pageFooter.every(isString))) errors.push('"pageFooter" must be a string or a list of strings.');
  const themeSwitch = profile.themeSwitch;
  if (themeSwitch !== undefined && !(isRecord(themeSwitch) && Object.keys(themeSwitch).every(key => ['title', 'labels'].includes(key)) && optionalString(themeSwitch.title)
    && (themeSwitch.labels === undefined || (isRecord(themeSwitch.labels) && Object.entries(themeSwitch.labels).every(([id, label]) => /^[a-z0-9][a-z0-9_-]*$/.test(id) && isRecord(label) && isString(label.text) && optionalString(label.motto)))))) {
    errors.push('"themeSwitch" may set a "title" string and "labels": theme ID → { "text": string, "motto": string }.');
  }
  const mottos = profile.mottos;
  if (mottos !== undefined && !(isRecord(mottos) && Object.entries(mottos).every(([key, value]) => ['index', 'search', 'toc'].includes(key) && isString(value)))) {
    errors.push('"mottos" may only set "index", "search" and "toc" to strings.');
  }
  if (!Array.isArray(profile.feed) || !profile.feed.every(path => isString(path) && /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(path))) {
    errors.push('"feed" must list site directories such as "/blog" (no trailing slash).');
  }
  if (!Number.isInteger(profile.activityLimit) || (profile.activityLimit as number) < 1 || (profile.activityLimit as number) > 10) errors.push('"activityLimit" must be a whole number from 1 to 10.');
  if (profile.email !== '' && !(isString(profile.email) && /^[^\s@]+@[^\s@]+$/.test(profile.email))) errors.push('"email" must be an address or "".');
  if (profile.github !== '' && !webUrl(profile.github)) errors.push('"github" must be an http(s) URL or "".');
  if (!Array.isArray(profile.socials)) errors.push('"socials" must be a list.');
  else profile.socials.forEach((link, index) => {
    if (!isRecord(link) || !isString(link.name) || !link.name || !webUrl(link.url, ['http:', 'https:', 'mailto:'])) errors.push(`socials[${index}] needs a "name" and an http(s) or mailto "url".`);
  });
  if (!Array.isArray(profile.friends)) errors.push('"friends" must be a list.');
  else {
    const aliases = new Set<string>();
    profile.friends.forEach((friend, index) => {
      if (!isRecord(friend) || !isString(friend.name) || !friend.name || !webUrl(friend.url) || (friend.description !== undefined && !isString(friend.description))) {
        errors.push(`friends[${index}] needs a "name", an http(s) "url" and an optional "description".`);
        return;
      }
      if (!isString(friend.alias) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(friend.alias)) errors.push(`friends[${index}].alias must be lowercase letters, digits and hyphens, such as "best-friend".`);
      else if (aliases.has(friend.alias)) errors.push(`friends[${index}].alias "${friend.alias}" is already used.`);
      else aliases.add(friend.alias);
    });
  }
  return errors;
}
