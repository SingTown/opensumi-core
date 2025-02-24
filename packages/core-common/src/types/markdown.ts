import { UriComponents } from '@opensumi/ide-utils';

export interface IMarkdownString {
  value: string;
  isTrusted?: boolean;
  supportThemeIcons?: boolean;
  uris?: { [href: string]: UriComponents };
}
