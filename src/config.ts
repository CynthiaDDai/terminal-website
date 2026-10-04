// src/config/site.json, or the test fixture profile (see astro.config.mjs). Its shape is checked by lib/site-config.ts.
import profile from '@site/profile';

export interface FriendLink { alias: string; name: string; url: string; description?: string; }
export interface SocialLink { name: string; url: string; }
// A word in the home footer, optionally with decorative words beside it.
export interface FooterWord { text: string; motto?: string; }

export interface SiteProfile {
  name: string; owner: string; user: string; host: string; description: string; bio: string;
  caption: string; lang: string; dateLocale: string;
  wordmark: { name: string; suffix: string };
  homeFooter: (string | FooterWord)[];
  // One line, or several: each page shows one of them.
  pageFooter: string | string[];
  notFound: { title: string; description: string; motto?: string; quote?: string };
  // Decorative words beside the index handle, search and table of contents labels.
  mottos?: { index?: string; search?: string; toc?: string };
  feed: string[]; email: string; github: string; socials: SocialLink[]; friends: FriendLink[]; activityLimit: number;
}

export const site = profile as unknown as SiteProfile;
export const friends: FriendLink[] = site.friends;
