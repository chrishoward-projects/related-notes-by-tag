export const ICONS = {
  SORT: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>',
  FILTER: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
  TAGS_TOGGLE: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/><path d="M6 9.01V9"/><path d="m15 5 6.3 6.3a2.69 2.69 0 0 1 0 3.79L17.5 19a2.69 2.69 0 0 1-3.79 0L10 15.21"/></svg>',
  RELATED_NOTES: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tags"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/><path d="M6 9.01V9"/><path d="m15 5 6.3 6.3a2.69 2.69 0 0 1 0 3.79L17.5 19a2.69 2.69 0 0 1-3.79 0L10 15.21"/></svg>'
};

export const CSS_CLASSES = {
  CONTAINER: 'related-notes-container',
  HEADER: 'related-notes-header',
  TITLE: 'related-notes-title',
  ACTION_BUTTONS: 'action-buttons',
  SORT_CONTROLS: 'sort-controls',
  FILTER_CONTROLS: 'filter-controls',
  TAGS_TOGGLE_CONTROLS: 'tags-toggle-controls',
  DROPDOWN_CONTAINER: 'dropdown-container',
  DROPDOWN_TRIGGER: 'dropdown-trigger',
  DROPDOWN_MENU: 'dropdown-menu',
  DROPDOWN_ITEM: 'dropdown-item',
  DROPDOWN_ITEM_ACTIVE: 'is-active',
  DROPDOWN_VISIBLE: 'is-visible',
  ACTIVE_FILE_NAME: 'related-activefile-name',
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
  INSTRUCTIONS: 'related-notes-instructions'
};

export const TIMEOUTS = {
  VIEW_UPDATE_DELAY: 50,
  PREVIEW_RENDER_DELAY: 150
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

export const FILTER_LABELS = {
  [FILTER_MODES.ONE_TAG]: 'Match at least 1 tag',
  [FILTER_MODES.TWO_TAGS]: 'Match at least 2 tags',
  [FILTER_MODES.THREE_TAGS]: 'Match at least 3 tags'
};