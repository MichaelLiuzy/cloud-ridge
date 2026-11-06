/**
 * Q 总菜单的栏目，从左到右排。
 * 以后加「人物」等栏目时，在这里加一行（label 是语言文件里的名字），再让编程窗口写这一栏的内容。
 */
export type MenuTabId = 'bag' | 'notebook' | 'map';

export const MENU_TABS: { id: MenuTabId; label: string }[] = [
  { id: 'bag', label: 'menuTabs.bag' },
  { id: 'notebook', label: 'menuTabs.notebook' },
  { id: 'map', label: 'menuTabs.map' },
];

/** 笔记本里的三栏 */
export const NOTEBOOK_SECTIONS = [
  { id: 'story', label: 'notebook.sections.story' },
  { id: 'controls', label: 'notebook.sections.controls' },
  { id: 'learned', label: 'notebook.sections.learned' },
] as const;
export type NotebookSectionId = (typeof NOTEBOOK_SECTIONS)[number]['id'];
