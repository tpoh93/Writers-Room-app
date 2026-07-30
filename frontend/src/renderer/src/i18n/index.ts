import { createI18n } from 'vue-i18n'
import elementPlusPl from 'element-plus/es/locale/lang/pl'

import pl from './locales/pl'

function polishPluralRule(choice: number, choicesLength: number): number {
  const value = Math.abs(choice)
  if (value === 0) return 0
  if (value === 1) return 1
  if (
    value % 10 >= 2
    && value % 10 <= 4
    && (value % 100 < 12 || value % 100 > 14)
  ) {
    return 2
  }
  return choicesLength < 4 ? 2 : 3
}

const i18n = createI18n({
  legacy: false,
  locale: 'pl',
  fallbackLocale: 'pl',
  pluralRules: {
    pl: polishPluralRule,
  },
  messages: {
    pl,
  },
})

const LEGACY_CARD_TITLES = new Set(['新卡片', '新建卡片'])
const LEGACY_CARD_TYPE_NAME = '新类型'
const LEGACY_CARD_TYPE_DESCRIPTION_SUFFIX = '的默认卡片类型'

// These values are persisted by the built-in upstream templates.  They are
// deliberately mapped only at the display boundary: user-authored text and
// API/schema identifiers must pass through unchanged.
const BUILTIN_DISPLAY_NAMES: Record<string, string> = {
  '通用文本': 'Tekst ogólny',
  '作品标签': 'Tagi utworu',
  '金手指': 'Specjalny atut bohatera',
  '一句话梗概': 'Logline',
  '故事大纲': 'Zarys fabuły',
  '世界观设定': 'Świat przedstawiony',
  '核心蓝图': 'Rdzeń historii',
  '分卷大纲': 'Zarys tomu',
  '写作指南': 'Założenia pisarskie',
  '阶段大纲': 'Zarys etapu',
  '章节大纲': 'Zarys rozdziału',
  '章节正文': 'Treść rozdziału',
  '内容审核卡片': 'Karta oceny treści',
  '角色卡': 'Karta postaci',
  '场景卡': 'Karta sceny',
  '组织卡': 'Karta organizacji',
  '物品卡': 'Karta przedmiotu',
  '概念卡': 'Karta pojęcia',
  '文件夹': 'Folder',
  '同盟': 'Sojusz',
  '队友': 'Towarzysze',
  '同门': 'Wspólna szkoła lub tradycja',
  '敌对': 'Wrogość',
  '亲属': 'Pokrewieństwo',
  '师徒': 'Mistrz i uczeń',
  '对手': 'Rywalizacja',
  '伙伴': 'Partnerstwo',
  '友好': 'Przyjazne',
  '中立': 'Neutralne',
  '敌意': 'Wrogie',
  '项目创建·雪花创作法': 'Tworzenie projektu · metoda płatka śniegu',
  '主题': 'Motyw',
  'theme': 'Motyw',
  '目标读者': 'Docelowy odbiorca',
  'audience': 'Docelowy odbiorca',
  '叙事人称': 'Perspektywa narracyjna',
  'narrative_person': 'Perspektywa narracyjna',
  '故事标签': 'Tagi historii',
  'story_tags': 'Tagi historii',
  '情感关系': 'Relacje emocjonalne',
  'affection': 'Relacje emocjonalne',
  '主题类别，格式：大类-子类': 'Kategoria motywu, format: kategoria główna – podkategoria',
  '写作人称（第一人称/第三人称）': 'Osoba narracji: pierwsza lub trzecia',
  '情感关系标签': 'Tagi relacji emocjonalnych',
}

const BUILTIN_PROMPT_DISPLAY_NAMES: Record<string, string> = {
  '金手指生成': 'Zaproponuj specjalny atut bohatera',
  '一句话梗概': 'Utwórz logline',
  '一段话大纲': 'Utwórz zarys fabuły',
  '世界观设定': 'Zbuduj świat przedstawiony',
  '核心蓝图': 'Utwórz rdzeń historii',
  '分卷大纲': 'Utwórz zarys tomu',
  '阶段大纲': 'Utwórz zarys etapu',
  '章节大纲': 'Utwórz zarys rozdziału',
  '内容生成': 'Wygeneruj treść',
  '写作指南': 'Utwórz założenia pisarskie',
  '章节审核': 'Oceń rozdział',
  '灵感对话': 'Rozmowa o pomysłach',
}

export function getCardDisplayTitle(title: string): string {
  return LEGACY_CARD_TITLES.has(title) ? i18n.global.t('editor.defaultCardTitle') : title
}

/**
 * Maps only titles that are demonstrably bootstrap defaults: a built-in card's
 * persisted title is identical to its canonical built-in type.  Any other
 * author-entered title, including CJK, remains verbatim.
 */
export function getBuiltInCardDefaultTitle(title: string, cardTypeName: string | undefined): string {
  if (title === cardTypeName && title in BUILTIN_DISPLAY_NAMES) {
    return BUILTIN_DISPLAY_NAMES[title]
  }
  return getCardDisplayTitle(title)
}

export function getCardTypeDisplayName(name: string): string {
  if (name === LEGACY_CARD_TYPE_NAME) return i18n.global.t('editor.defaultTypeName')
  if (BUILTIN_DISPLAY_NAMES[name]) return BUILTIN_DISPLAY_NAMES[name]
  return LEGACY_CARD_TITLES.has(name) ? i18n.global.t('editor.defaultCardTitle') : name
}

export function getCardTypeDisplayDescription(description: string, typeName: string): string {
  if (description === `${typeName}${LEGACY_CARD_TYPE_DESCRIPTION_SUFFIX}`) {
    return i18n.global.t('editor.defaultCardTypeDescription', {
      name: getCardTypeDisplayName(typeName),
    })
  }
  return description
}

export function getProjectTemplateDisplayName(name: string): string {
  return BUILTIN_DISPLAY_NAMES[name] || name
}

export function getProjectDisplayName(name: string | undefined): string | undefined {
  return name === '__free__' ? i18n.global.t('header.ideasTitle') : name
}

export function getRelationKindDisplayName(kind: string): string {
  return BUILTIN_DISPLAY_NAMES[kind] || kind
}

export function getRelationStanceDisplayName(stance: string): string {
  return BUILTIN_DISPLAY_NAMES[stance] || stance
}

export function getSchemaDisplayText(text: string | undefined): string | undefined {
  return text === undefined ? undefined : BUILTIN_DISPLAY_NAMES[text] || text
}

export function getPromptDisplayName(name: string | undefined): string | undefined {
  return name === undefined ? undefined : BUILTIN_PROMPT_DISPLAY_NAMES[name] || name
}

type WorkflowNodeForDisplay = {
  type: string
  label: string
  description?: string
}

type Translate = (key: string) => string

export function getWorkflowNodeDisplay<T extends WorkflowNodeForDisplay>(
  node: T,
  t: Translate,
): T {
  const nodeKey = node.type.replace(/[^A-Za-z0-9]/g, '_')
  const labelKey = `workflow.nodeMetadata.${nodeKey}.label`
  const descriptionKey = `workflow.nodeMetadata.${nodeKey}.description`
  const translatedLabel = t(labelKey)
  const translatedDescription = t(descriptionKey)

  return {
    ...node,
    label: translatedLabel === labelKey ? node.label : translatedLabel,
    description:
      translatedDescription === descriptionKey ? node.description : translatedDescription,
  }
}

export const elementPlusLocale = {
  ...elementPlusPl,
  el: {
    ...elementPlusPl.el,
    dialog: {
      close: 'Zamknij',
    },
    messagebox: {
      ...elementPlusPl.el.messagebox,
      close: 'Zamknij',
    },
    pagination: {
      ...elementPlusPl.el.pagination,
      page: 'Strona',
      prev: 'Poprzednia strona',
      next: 'Następna strona',
      currentPage: 'Strona {pager}',
      prevPages: 'Poprzednie {pager} strony',
      nextPages: 'Następne {pager} strony',
    },
  },
}
export default i18n
