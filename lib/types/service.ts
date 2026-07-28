export interface AddFeedInput {
  url: string;
  groupId?: string;
  refreshInterval?: number;
}

export interface UpdateFeedInput {
  id: string;
  title?: string;
  groupId?: string;
  refreshInterval?: number;
}

export interface ArticleFilter {
  feedId?: string;
  groupId?: string;
  isRead?: boolean;
  isStarred?: boolean;
  query?: string;
}

export interface TreeNodeMove {
  nodeType: 'folder' | 'feed';
  nodeId: string;
  parentId: string | null;
  index: number;
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
