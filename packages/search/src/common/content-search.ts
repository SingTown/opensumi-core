import { endsWith, startsWith, Command } from '@ali/ide-core-common';
import { TreeNode, TreeNodeHighlightRange } from '@ali/ide-core-browser/lib/components';

export const ContentSearchServerPath = 'ContentSearchServerPath';

export const IContentSearchServer = Symbol('ContentSearchService');

export const DEFAULT_SEARCH_IN_WORKSPACE_LIMIT = 2000;

export interface ContentSearchOptions {
  /**
   * Maximum number of results to return.  Defaults to DEFAULT_SEARCH_IN_WORKSPACE_LIMIT.
   */
  maxResults?: number;
  /**
   * Search case sensitively if true.
   */
  matchCase?: boolean;
  /**
   * Search whole words only if true.
   */
  matchWholeWord?: boolean;
  /**
   * Use regular expressions for search if true.
   */
  useRegExp?: boolean;
  /**
   * Include all .gitignored and hidden files.
   */
  includeIgnored?: boolean;
  /**
   * Glob pattern for matching files and directories to include the search.
   */
  include?: string[];
  /**
   * Glob pattern for matching files and directories to exclude the search.
   */
  exclude?: string[];
}

export interface IContentSearchServer {
  /**
   * Start a search for WHAT in directories ROOTURIS.  Return a unique search id.
   */
  search(what: string, rootUris: string[], opts?: ContentSearchOptions): Promise<number>;

  /**
   * Cancel an ongoing search.
   */
  cancel(searchId: number): Promise<void>;

  // dispose(): void;
}

export interface IContentSearchClientService {
  replaceValue: string;
  searchValue: string;
  searchError: string;
  searchState: SEARCH_STATE;
  UIState: IUIState;
  searchResults: Map<string, ContentSearchResult[]>;
  resultTotal: ResultTotal;
  docModelSearchedList: string[];
  currentSearchId: number;
  searchInputEl: React.MutableRefObject<HTMLInputElement | null>;
  replaceInputEl: React.MutableRefObject<HTMLInputElement | null>;

  updateUIState(obj, e?: React.KeyboardEvent | React.MouseEvent);
}

export interface IUIState {
  isSearchFocus: boolean;
  isToggleOpen: boolean;
  isDetailOpen: boolean;
  isMatchCase: boolean;
  isWholeWord: boolean;
  isUseRegexp: boolean;

  isIncludeIgnored: boolean;
}

export interface ContentSearchResult {
  /**
   * 该参数已经废弃
   */
  root?: string;

  /**
   * 文件Uri
   */
  fileUri: string;

  /**
   * 所在行号
   */
  line: number;

  /**
   * 匹配开始
   */
  matchStart: number;

  /**
   * 匹配长度
   */
  matchLength: number;

  /**
   * 整行的内容，出于性能考虑，存在 rangeLineText 时为空
   */
  lineText?: string;

  /**
   * 过长的行内容，被裁剪后的开始位置
   */
  renderStart?: number;

  /**
    * 过长的行内容，被裁剪后的内容
   */
  renderLineText?: string;
}

export enum SEARCH_STATE {
  todo,
  doing,
  done,
  error,
}

export interface SendClientResult {
  data: ContentSearchResult[];
  id: number;
  searchState?: SEARCH_STATE;
  error?: string;
  docModelSearchedList?: string[];
}

export interface ResultTotal {
  fileNum: number;
  resultNum: number;
}

/**
 * 辅助搜索，补全通配符
 */
export function anchorGlob(glob: string): string {
  const pre = '**/';

  if (startsWith(glob, './')) {
    // 相对路径转换
    glob = glob.replace(/^.\//, '');
  }
  if (endsWith(glob, '/')) {
    // 普通目录
    return `${pre}${glob}**`;
  }
  if (!/[\*\{\(\+\@\!\^\|\?]/.test(glob) && !/\.[A-Za-z0-9]+$/.test(glob)) {
    // 不包含 Glob 特殊字符的普通目录
    return `${pre}${glob}/**`;
  }
  return `${pre}${glob}`;
}

export function getRoot(rootUris ?: string[], uri ?: string): string {
  let result: string = '';
  if (!rootUris || !uri) {
    return result;
  }
  rootUris.some((root) => {
    if (uri.indexOf(root) === 0) {
      result = root;
      return true;
    }
  });

  return result;
}

export const SEARCH_CONTAINER_ID = 'search';

export namespace SearchBindingContextIds {
  export const searchInputFocus = 'searchInputFocus';
}

export const SEARCH_CONTEXT_MENU = 'search-context-menu-path';

export interface ISearchTreeItem extends TreeNode<ISearchTreeItem> {
  children?: ISearchTreeItem[];
  badge?: number;
  highLightRange?: TreeNodeHighlightRange;
  searchResult?: ContentSearchResult;
  [key: string]: any;
}

/**
 * 裁剪处理过长的结果，计算出 renderLineText、renderStart
 * @param insertResult
 */

export function cutShortSearchResult(insertResult: ContentSearchResult): ContentSearchResult {
  const result = Object.assign({}, insertResult);
  const { lineText, matchLength, matchStart } = result;
  const maxLineLength = 500;
  const maxMatchLength = maxLineLength;

  if (!lineText) {
    return result;
  }

  if (lineText.length > maxLineLength)  {
    // 行内容太多的时候，裁剪行
    const preLength = 20;
    const start = matchStart - preLength > -1 ? matchStart - preLength : 0;
    result.renderLineText = lineText.slice(
      start,
      start + 500,
    );
    delete result.lineText;
    result.renderStart = matchStart - start;
    result.matchLength = matchLength > maxMatchLength ? maxMatchLength : matchLength;
    return result;
  } else {
    // 将可见区域前移
    const preLength = 40;
    const start = matchStart - preLength > -1 ? matchStart - preLength : 0;
    result.renderLineText = lineText.slice(
      start,
      lineText.length,
    );
    delete result.lineText;
    result.renderStart = matchStart - start;
    return result;
  }
}

export interface OpenSearchCmdOptions {
  includeValue: string;
}

export const openSearchCmd: Command = {
  id: 'content-search.openSearch',
  category: 'search',
  label: 'Open search sidebar',
};
