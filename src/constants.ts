export const ICONS = {
  SORT: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>',
  FILTER: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
  TAGS_TOGGLE: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/><path d="M6 9.01V9"/><path d="m15 5 6.3 6.3a2.69 2.69 0 0 1 0 3.79L17.5 19a2.69 2.69 0 0 1-3.79 0L10 15.21"/></svg>',
  DROPDOWN_CARET: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="m6 9 6 6 6-6"/></svg>',
  RELATED_NOTES: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tags"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/><path d="M6 9.01V9"/><path d="m15 5 6.3 6.3a2.69 2.69 0 0 1 0 3.79L17.5 19a2.69 2.69 0 0 1-3.79 0L10 15.21"/></svg>',
  FILTER_CLEAR: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473"/><path d="m16.5 3.5 5 5"/><path d="m21.5 3.5-5 5"/></svg>',
  TAG_SORT: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>',
  LAYOUT_GRID: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  GRID_2X2: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M12 3v18"/><path d="M3 12h18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
};

export const CSS_CLASSES = {
  CONTAINER: 'related-notes-container',
  HEADER: 'related-notes-header',
  ACTION_BUTTONS: 'related-notes-action-buttons',
  SORT_CONTROLS: 'related-notes-sort-controls',
  TAG_SORT_CONTROLS: 'related-notes-tag-sort-controls',
  FILTER_CONTROLS: 'related-notes-filter-controls',
  TAGS_TOGGLE_CONTROLS: 'related-notes-tags-toggle-controls',
  DROPDOWN_CONTAINER: 'related-notes-dropdown-container',
  DROPDOWN_TRIGGER: 'related-notes-dropdown-trigger',
  DROPDOWN_MENU: 'related-notes-dropdown-menu',
  DROPDOWN_ITEM: 'related-notes-dropdown-item',
  DROPDOWN_ITEM_ACTIVE: 'is-active',
  DROPDOWN_VISIBLE: 'is-visible',
  TAG_GROUP: 'related-notes-tag-group',
  TAG_GROUP_HEADER: 'related-notes-tag-group-header',
  NOTES_LIST: 'related-notes-list',
  LIST_ITEM: 'related-notes-list-item',
  NOTE_LINK: 'related-note-link',
  MATCHED_TAGS: 'matched-tags',
  MATCHED_TAG: 'matched-tag',
  SEPARATOR: 'related-notes-separator',
  PREVIEW: 'related-notes-preview',
  PREVIEW_LOADED: 'is-loaded',
  INSTRUCTIONS: 'related-notes-instructions',
  EXCERPT: 'related-notes-excerpt',
  SEARCH_CONTAINER: 'related-notes-search-container',
  SEARCH_INPUT: 'related-notes-search-input',
  SEARCH_MATCH_CONTROLS: 'related-notes-search-match-controls'
};

/**
 * Minimum Obsidian version required by the release after this one. Users below
 * it are served this version indefinitely via versions.json, so they are told
 * once that updates have stopped and why.
 */
export const NEXT_RELEASE_MIN_APP_VERSION = '1.13.0';

export const TIMEOUTS = {
  VIEW_UPDATE_DELAY: 50,
  PREVIEW_RENDER_DELAY: 150,
  SEARCH_DEBOUNCE_DELAY: 200
};

export const DIMENSIONS = {
  PREVIEW_POPUP_WIDTH: 400,
  PREVIEW_POPUP_MARGIN: 10,
  PREVIEW_MAX_HEIGHT: '40vh'
};

export const SORT_MODES = {
  NAME: 'name' as const,
  DATE: 'date' as const,
  CREATED: 'created' as const
};

export const FILTER_MODES = {
  ALL: 'all' as const,
  ONE_TAG: 1 as const,
  TWO_TAGS: 2 as const,
  THREE_TAGS: 3 as const
};

export const GROUP_STATES = {
  COLLAPSED: 'collapsed' as const,
  EXPANDED: 'expanded' as const
};

export const SORT_LABELS = {
  [SORT_MODES.NAME]: 'Name',
  [SORT_MODES.DATE]: 'Modified Date',
  [SORT_MODES.CREATED]: 'Created Date'
};

export const TAG_SORT_MODES = {
  NAME: 'name' as const,
  COUNT: 'count' as const
};

export const TAG_SORT_LABELS = {
  [TAG_SORT_MODES.NAME]: 'Tag name (A-Z)',
  [TAG_SORT_MODES.COUNT]: 'File count'
};

export const FILTER_LABELS = {
  [FILTER_MODES.ALL]: 'Show all notes',
  [FILTER_MODES.ONE_TAG]: 'Match at least 1 tag',
  [FILTER_MODES.TWO_TAGS]: 'Match at least 2 tags',
  [FILTER_MODES.THREE_TAGS]: 'Match at least 3 tags'
};